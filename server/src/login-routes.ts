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
import md5 from "md5";

const emailTestRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

export const sessionCheck = async function sessionCheck(request: FastifyRequest, reply: FastifyReply) {
  if (request.session.get("uuid")) {
    const user = (await findUser({ uuid: request.session.get("uuid") }))[0];
    if (!user || user.invalidateSession) {
      request.session.delete();
      reply.send({ authenticated: false });
      return;
    } else {
      reply.send({ authenticated: true });
    }
  } else {
    reply.send({ authenticated: false });
  }
}

export const invalidateCredentials = async function invalidateCredentials(
  request: FastifyRequest<{ Body: { token: string; } }>,
  reply: FastifyReply
) {
  const { token } = request.body;
  if (!token) {
    reply.status(400).send({ error: "Invalid form" });
    return;
  }
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    reply.status(500).send({ error: "Email service not configured" });
    return;
  }
  try {
    const verificationRow = (await findVerification({ token }))[0];
    if (!verificationRow || verificationRow.reason !== "invalidate") {
      reply.status(404).send({ error: "Token not found" });
      return;
    }
    if (new Date(verificationRow.expiresAt) < new Date()) {
      await deleteVerification({ token, reason: "invalidate" });
      reply.status(401).send({ error: "Token expired" });
      return;
    }
    const { userId } = verificationRow;
    const user = (await findUser({ userId }))[0];
    if (!user) {
      throw new Error("User not found");
    }
    const { email } = user;
    const randomPassword = randomBytes(16).toString("hex");
    const newEmail: Email = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Account Recovery",
      text: `Your account credentials have been invalidated. Your new password is: ${randomPassword}. Please use this password to sign in and reset your email and password.`
    };
    sendEmail(newEmail);
    await updateUser({ userId }, { email: undefined, emailVerified: 0, hashedPassword: await hash(randomPassword, 10), invalidateSession: true });
    reply.send({ message: "Email sent" });
  } catch (error) {
    console.error("Error during invalidation:", error);
    reply.status(500).send({ error: "Unknown Error" });
  }
};

export const resetEmail = async function resetEmail(
  request: FastifyRequest<{ Body: { email: string; password: string } }>,
  reply: FastifyReply
) {
  const uuid = request.session.get("uuid");
  if (!uuid) {
    reply.status(401).send({ error: "Not logged in" });
    return;
  }
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    reply.status(500).send({ error: "Email service not configured" });
    return;
  }
  const { email, password } = request.body;
  if (!email || !password || !emailTestRegex.test(email)) {
    reply.status(400).send({ error: "Invalid form" });
    return;
  }
  try {
    const userRow = (await findUser({ uuid }))[0];
    if (!userRow) {
      throw new Error("User not found");
    }
    const { userId, hashedPassword } = userRow;
    if (hashedPassword && !(await compare(password, hashedPassword))) {
      reply.status(401).send({ error: "Incorrect password" });
      return;
    }
    await updateUser({ userId }, { email, emailVerified: 0 });
    let token = randomBytes(16).toString("hex") + md5(uuid);
    let expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getHours() + 1);
    await deleteVerification({ userId: userId, reason: "email" });
    const newEmail: Email = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Email Changed",
      text: `Please verify your new email by clicking on the following link: ${process.env.APP_URL || "http://localhost:5173"}/verify?token=${token}`
    };
    sendEmail(newEmail);
    const verifyVerification: NewVerification = {
      userId: userId,
      token: token,
      expiresAt: expiresAt.toISOString(),
      reason: "verify"
    };
    await createVerification(verifyVerification);
    token = randomBytes(16).toString("hex") + md5(uuid);
    expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getHours() + 24);
    const oldEmail: Email = {
      from: process.env.EMAIL_USER,
      to: userRow.email,
      subject: "Email Changed",
      text: `Your email has been changed. If you did not request this change, please click on the following link to reset your email and password: ${process.env.APP_URL || "http://localhost:5173"}/account-recovery?token=${token}. This link will expire in 24 hours. If your link has expired, please contact support.`
    };
    sendEmail(oldEmail);
    const invalidateVerification: NewVerification = {
      userId: userId,
      token: token,
      expiresAt: expiresAt.toISOString(),
      reason: "invalidate"
    };
    await createVerification(invalidateVerification);
    reply.send({ message: "Email changed" });
  } catch (error) {
    console.error("Error during reset:", error);
    reply.status(500).send({ error: "Unknown Error" });
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
    if (!verificationRow || verificationRow.reason !== "password") {
      reply.status(404).send({ error: "Password reset token not found" });
      return;
    }
    const { userId, expiresAt, reason } = verificationRow;
    const expiresAtDate = new Date(expiresAt);
    if (expiresAtDate < new Date() || reason !== "password") {
      await deleteVerification({ token, reason: "password"});
      reply.status(401).send({ error: "Password reset token expired or invalid" });
      return;
    }
    const hashedPassword = await hash(password, 10);
    await updateUser({ userId }, { hashedPassword });
    await deleteVerification({ token, reason: "password"});
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
  if (!email || !emailTestRegex.test(email)) {
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
    const { userId, hashedPassword, emailVerified, uuid } = userRow;
    if (!emailVerified) {
      reply.send({ message: "Email sent" });
      return;
    }
    let emailText = "";
    if (!hashedPassword) {
      emailText =
        "You have requested a password reset but there is no password set for this account. Please sign in with Google.";
    } else {
      const token = randomBytes(16).toString("hex") + md5(uuid);
      emailText = `Click on the following link to reset your password: ${process.env.APP_URL || "http://localhost:5173"}/reset-password?token=${token}`;
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15);
      await deleteVerification({ userId, reason: "password" });
      const verfication: NewVerification = {
        userId: userId,
        token: token,
        expiresAt: expiresAt.toISOString(),
        reason: "password"
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
  if (!email || !emailTestRegex.test(email)) {
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
    const { userId, emailVerified, uuid } = userRow;
    if (emailVerified) {
      emailText =
        "Welcome back to TSC Online! Your email is already verified. If you did not request this email, please ignore it.";
    } else {
      token = randomBytes(16).toString("hex") + md5(uuid);
      emailText = `Welcome to TSC Online! Please verify your email by clicking on the following link: ${process.env.APP_URL || "http://localhost:5173"}/verify?token=${token}`;
      await deleteVerification({ userId, reason: "verify"});
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);
      const verification: NewVerification = {
        userId: userId,
        token: token,
        expiresAt: expiresAt.toISOString(),
        reason: "verify"
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
    const { expiresAt, reason, userId } = verificationRow;
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
    if (expiresAtDate < new Date() || reason !== "verify") {
      await deleteVerification({ token, reason: "verify"});
      reply.status(401).send({ error: "Verification token expired or invalid" });
      return;
    }
    await updateUser({ userId }, { emailVerified: 1 });
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
  if (!username || !password || !email || !emailTestRegex.test(email)) {
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
      emailVerified: 0,
      invalidateSession: false
    };
    await createUser(newUser);
    const insertedUser = (await findUser({ email }))[0];
    if (!insertedUser) {
      throw new Error("User not inserted");
    }
    const { userId, uuid } = insertedUser;
    const token = randomBytes(16).toString("hex") + md5(uuid);
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
      reason: "verify"
    };
    await createVerification(newVerification);
    sendEmail(authEmail);
    reply.send({ message: "Email sent" });
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
    const { uuid, hashedPassword, emailVerified, invalidateSession } = userRow;
    if (hashedPassword && (await compare(password, hashedPassword))) {
      if (!emailVerified) {
        reply.status(403).send({ error: "Email not verified" });
        return;
      }
      if (invalidateSession) {
        reply.status(423).send({ error: "Account locked" });
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
      emailVerified: 1,
      invalidateSession: false
    };
    await createUser(user);
    request.session.set("uuid", uuid);
    reply.send({ message: "Login successful" });
  } catch (error) {
    console.error("Error during login:", error);
    reply.status(500).send({ error: "Unknown Error" });
  }
};
