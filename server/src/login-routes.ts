import type { FastifyRequest, FastifyReply } from "fastify";
import { randomUUID, randomBytes } from "crypto";
import {
  db,
  findUser,
  createUser,
  updateUser,
  findVerification,
  createVerification,
  deleteVerification
} from "./database.js";
import { compare, hash } from "bcrypt-ts";
import { OAuth2Client } from "google-auth-library";
import { Email, assertEmail, NewUser, NewVerification } from "./types.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendEmail = async (email: Email) => {
  assertEmail(email);
  try {
    await transporter.sendMail({
      from: email.from,
      to: email.to,
      subject: email.subject,
      text: email.text
    });
  } catch (error) {
    console.error("An error occurred:", error);
    throw error;
  }
};

export const resetPassword = async function resetPassword(
  request: FastifyRequest<{ Body: { token: string; password: string } }>,
  reply: FastifyReply
) {
  const { token, password } = request.body;
  if (!password) {
    reply.status(400).send({ error: "Invalid form" });
    return;
  }
  try {
    const verificationRow = (await findVerification({ token }))[0];
    if (!verificationRow) {
      reply.status(404).send({ error: "Password reset token not found" });
      return;
    }
    const { userId, expiresAt, verifyOrReset } = verificationRow;
    const expiresAtDate = new Date(expiresAt);
    if (expiresAtDate < new Date() || verifyOrReset !== "reset") {
      await deleteVerification({ token });
      reply.status(401).send({ error: "Password reset token expired or invalid" });
      return;
    }
    const hashedPassword = await hash(password, 10);
    await updateUser({ userId }, { hashedPassword });
    await deleteVerification({ token });
    const userRow = (await findUser({ userId }))[0];
    if (!userRow) {
      throw new Error("User not found");
    }
    request.session.set("uuid", userRow["uuid"]);
    reply.send({ message: "Password reset" });
  } catch (error) {
    console.error("Error during reset:", error);
    reply.status(500).send({ error: "Unknown Error" });
  }
};

export const sendResetPasswordEmail = async function sendResetPasswordEmail(
  request: FastifyRequest<{ Body: { email: string } }>,
  reply: FastifyReply
) {
  const email = request.body.email;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    reply.status(400).send({ error: "Invalid form" });
    return;
  }
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    reply.status(500).send({ error: "Email service not configured" });
    return;
  }
  try {
    const userRow = (await findUser({ email }))[0];
    if (!userRow) {
      reply.send({ message: "Email sent" });
      return;
    }
    const { userId, hashedPassword, emailVerified } = userRow;
    if (!emailVerified) {
      reply.send({ message: "Email sent" });
      return;
    }
    let emailText = "";
    if (!hashedPassword) {
      emailText =
        "You have requested a password reset but there is no password set for this account. Please sign in with Google.";
    } else {
      const token = randomBytes(16).toString("hex");
      emailText = `Click on the following link to reset your password: ${process.env.APP_URL || "http://localhost:5173"}/account-recovery?token=${token}`;
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15);
      await deleteVerification({ userId: userId, verifyOrReset: "reset" });
      const verfication: NewVerification = {
        userId: userId,
        token: token,
        expiresAt: expiresAt.toISOString(),
        verifyOrReset: "reset"
      };
      await createVerification(verfication);
    }
    const authEmail: Email = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Reset Your Password",
      text: emailText
    };
    sendEmail(authEmail);
    reply.send({ message: "Email sent" });
  } catch (error) {
    console.error("Error during reset:", error);
    reply.status(500).send({ error: "Unknown Error" });
  }
};

export const resendVerificationEmail = async function resendVerificationEmail(
  request: FastifyRequest<{ Body: { email: string } }>,
  reply: FastifyReply
) {
  const email = request.body.email;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    reply.status(400).send({ error: "Invalid form" });
    return;
  }
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    reply.status(500).send({ error: "Email service not configured" });
    return;
  }
  try {
    const userRow = (await findUser({ email }))[0];
    if (!userRow) {
      reply.send({ message: "Email sent" });
      return;
    }
    let emailText = "";
    let token = "";
    const { userId, emailVerified } = userRow;
    if (emailVerified) {
      emailText =
        "Welcome back to TSC Online! Your email is already verified. If you did not request this email, please ignore it.";
    } else {
      token = randomBytes(16).toString("hex");
      emailText = `Welcome to TSC Online! Please verify your email by clicking on the following link: ${process.env.APP_URL || "http://localhost:5173"}/verify?token=${token}`;
      await deleteVerification({ userId: userId });
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);
      const verification: NewVerification = {
        userId: userId,
        token: token,
        expiresAt: expiresAt.toISOString(),
        verifyOrReset: "verify"
      };
      await createVerification(verification);
    }
    const authEmail: Email = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Welcome to TSC Online - Verify Your Email",
      text: emailText
    };
    sendEmail(authEmail);
    reply.send({ message: "Email sent" });
  } catch (error) {
    console.error("Error during resend:", error);
    reply.status(500).send({ error: "Unknown Error" });
  }
};

export const verifyEmail = async function verifyEmail(
  request: FastifyRequest<{ Body: { token: string } }>,
  reply: FastifyReply
) {
  const token = request.body.token;
  try {
    const verificationRow = (await findVerification({ token: token }))[0];
    if (!verificationRow) {
      reply.status(404).send({ error: "Verification token not found" });
      return;
    }
    const { expiresAt, verifyOrReset, userId } = verificationRow;
    const userRow = (await findUser({ userId }))[0];
    if (!userRow) {
      reply.status(404).send({ error: "User not found" });
      return;
    }
    const { emailVerified, uuid } = userRow;
    if (emailVerified) {
      reply.status(409).send({ error: "Email already verified" });
      return;
    }
    const expiresAtDate = new Date(expiresAt);
    if (expiresAtDate < new Date() || verifyOrReset !== "verify") {
      await deleteVerification({ token });
      reply.status(401).send({ error: "Verification token expired or invalid" });
      return;
    }
    await updateUser({ userId }, { emailVerified: 1 });
    await deleteVerification({ token });
    request.session.set("uuid", uuid);
    reply.send({ message: "Email verified" });
  } catch (error) {
    console.error("Error during confirmation:", error);
    reply.status(500).send({ error: "Unknown Error" });
  }
};

export const signup = async function signup(
  request: FastifyRequest<{ Body: { username: string; password: string; email: string } }>,
  reply: FastifyReply
) {
  const { username, password, email } = request.body;
  if (!username || !password || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    reply.status(400).send({ error: "Invalid form" });
    return;
  }
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    reply.status(500).send({ error: "Email service not configured" });
    return;
  }
  try {
    const check = await db
      .selectFrom("users")
      .selectAll()
      .where((eb) => eb("username", "=", username).or("email", "=", email))
      .execute();
    if (check.length > 0) {
      reply.status(409).send({ error: "User with this email or username already exists" });
      return;
    }
    const hashedPassword = await hash(password, 10);
    const newUser: NewUser = {
      username: username,
      email: email,
      hashedPassword: hashedPassword,
      uuid: randomUUID(),
      pictureUrl: null,
      emailVerified: 0
    };
    await createUser(newUser);
    const insertedUser = (await findUser({ email }))[0];
    if (!insertedUser) {
      throw new Error("User not inserted");
    }
    const { userId } = insertedUser;
    const token = randomBytes(16).toString("hex");
    const authEmail: Email = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Welcome to TSC Online - Verify Your Email",
      text: `Welcome to TSC Online, ${username}! Please verify your email by clicking on the following link: ${process.env.APP_URL || "http://localhost:5173"}/verify?token=${token}`
    };
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    const newVerification: NewVerification = {
      userId: userId,
      token: token,
      expiresAt: expiresAt.toISOString(),
      verifyOrReset: "verify"
    };
    await createVerification(newVerification);
    sendEmail(authEmail);
    reply.send({ message: "Email sent   " });
  } catch (error) {
    console.error("Error during signup:", error);
    reply.status(500).send({ error: "Unknown Error" });
  }
};

export const login = async function login(
  request: FastifyRequest<{ Body: { username: string; password: string } }>,
  reply: FastifyReply
) {
  const { username, password } = request.body;
  if (!username || !password) {
    reply.status(400).send({ error: "Invalid form" });
    return;
  }
  try {
    const userRow = (await findUser({ username }))[0];
    if (!userRow) {
      reply.status(401).send({ error: "Incorrect username or password" });
      return;
    }
    const { uuid, hashedPassword, emailVerified } = userRow;
    if (hashedPassword && (await compare(password, hashedPassword))) {
      if (!emailVerified) {
        reply.status(403).send({ error: "Email not verified" });
        return;
      }
      request.session.set("uuid", uuid);
      reply.send({ message: "Login successful" });
      return;
    }
    reply.status(401).send({ error: "Incorrect username or password" });
  } catch (error) {
    console.error("Error during login:", error);
    reply.status(500).send({ error: "Unknown Error" });
  }
};

export const googleLogin = async function googleLogin(
  request: FastifyRequest<{ Body: { credential: string } }>,
  reply: FastifyReply
) {
  const client = new OAuth2Client("1010066768032-cfp1hg2ad9euid20vjllfdqj18ki7hmb.apps.googleusercontent.com");
  const ticket = await client.verifyIdToken({
    idToken: request.body.credential,
    audience: "1010066768032-cfp1hg2ad9euid20vjllfdqj18ki7hmb.apps.googleusercontent.com"
  });
  const payload = ticket.getPayload();
  if (!payload || !payload.email) {
    reply.status(400).send({ error: "Invalid Google Credential" });
    return;
  }
  try {
    const userRow = (await findUser({ email: payload.email }))[0];
    if (userRow) {
      const { username, uuid } = userRow;
      if (username) {
        reply.status(409).send({ error: "User already exists" });
      } else {
        request.session.set("uuid", uuid);
        reply.send({ message: "Login successful" });
      }
      return;
    }
    const uuid = randomUUID();
    const user: NewUser = {
      username: null,
      email: payload.email,
      hashedPassword: null,
      uuid: uuid,
      pictureUrl: payload.picture,
      emailVerified: 1
    };
    await createUser(user);
    request.session.set("uuid", uuid);
    reply.send({ message: "Login successful" });
  } catch (error) {
    console.error("Error during login:", error);
    reply.status(500).send({ error: "Unknown Error" });
  }
};
