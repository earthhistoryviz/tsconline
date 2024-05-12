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
import { Email, NewUser, NewVerification, UpdatedUser } from "./types.js";
import { sendEmail } from "./send-email.js";
import md5 from "md5";

const emailTestRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const sessionCheck = async function sessionCheck(request: FastifyRequest, reply: FastifyReply) {
  const uuid = request.session.get("uuid");
  if (!uuid) {
    reply.send({ authenticated: false });
    return;
  }
  const user = (await findUser({ uuid }))[0];
  if (!user || user.invalidateSession) {
    reply.send({ authenticated: false });
    return;
  }
  reply.send({ authenticated: true });
};

export const accountRecovery = async function accountRecovery(
  request: FastifyRequest<{ Body: { token: string; email: string } }>,
  reply: FastifyReply
) {
  const { token, email } = request.body;
  if (!token || !email || emailTestRegex.test(email)) {
    reply.status(400).send({ error: "No token or email" });
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
    const randomPassword = randomBytes(16).toString("hex");
    const newEmail: Email = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Account Recovery",
      preHeader: "Action Required: Reset your password now",
      title: "Account Recovery",
      message: `We received a request to invalidate your account credentials. Tap the button below to reset your password. If you did not request this change or need further assistance, please contact our support team.`,
      link: `${process.env.APP_URL || "http://localhost:5173"}/forgot-password`,
      buttonText: "Reset Password",
      action: "Account Recovery"
    };
    await sendEmail(newEmail);
    await updateUser(
      { userId },
      { email: email, emailVerified: 1, hashedPassword: await hash(randomPassword, 10), invalidateSession: 1 }
    );
    await deleteVerification({ userId, reason: "verify" });
    await deleteVerification({ userId, reason: "invalidate" });
    reply.send({ message: "Email sent" });
  } catch (error) {
    console.error("Error during invalidation:", error);
    reply.status(500).send({ error: "Unknown Error" });
  }
};

export const resetEmail = async function resetEmail(
  request: FastifyRequest<{ Body: { newEmail: string } }>,
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
  const { newEmail } = request.body;
  if (!newEmail || !emailTestRegex.test(newEmail)) {
    reply.status(400).send({ error: "Invalid form" });
    return;
  }
  try {
    const userRow = (await findUser({ uuid }))[0];
    if (!userRow) {
      throw new Error("User not found");
    }
    const { userId, hashedPassword, email } = userRow;
    if (email === newEmail) {
      const sameEmail: Email = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Email Change Attempt Noticed",
        preHeader: "Did you try to change your email?",
        title: "Email Change Alert",
        message: `We noticed an attempt to change your email address to the same one currently in use. If you did not initiate this change, it's important to secure your account immediately. Please review your account settings and update your password. Contact our support team if you need assistance.`,
        action: "an Email Change"
      };
      await sendEmail(sameEmail);
      reply.send({ message: "Email changed" });
      return;
    }
    if (!hashedPassword) {
      const randomPassword = randomBytes(16).toString("hex");
      const token = randomBytes(16).toString("hex") + md5(uuid);
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);
      const googleEmail: Email = {
        from: process.env.EMAIL_USER,
        to: newEmail,
        subject: "Your Email Has Been Updated",
        preHeader: "Important: Verify Your New Email",
        title: "Email Update Confirmation",
        message: `Your account email has been successfully updated. Since your account is authenticated via Google, no password or username is set by default. We have generated a temporary password for you, and your username is now your new email address.<br/><br/>
                  Temporary Password: <strong>${randomPassword}</strong><br/>
                  Please verify your new email address to complete the update process. The link will expire in 1 hour for security reasons. If your link has expired, you can request a new one by signing in. If you did not request this change, please contact our support team immediately.`,
        link: `${process.env.APP_URL || "http://localhost:5173"}/verify?token=${token}`,
        buttonText: "Verify Email",
        action: "Verify Email"
      };
      await sendEmail(googleEmail);
      const googleUser: UpdatedUser = {
        username: newEmail,
        email: newEmail,
        hashedPassword: await hash(randomPassword, 10),
        emailVerified: 0
      };
      await updateUser({ userId }, googleUser);
      const newVerification: NewVerification = {
        userId: userId,
        token: token,
        expiresAt: expiresAt.toISOString(),
        reason: "verify"
      };
      await createVerification(newVerification);
    } else {
      await updateUser({ userId }, { email: newEmail, emailVerified: 0 });
      const token = randomBytes(16).toString("hex") + md5(uuid);
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);
      await deleteVerification({ userId: userId, reason: "verify" });
      await deleteVerification({ userId: userId, reason: "password" });
      const verifyEmail: Email = {
        from: process.env.EMAIL_USER,
        to: newEmail,
        subject: "Verify Your New Email Address",
        preHeader: "Just one more step to update your email",
        title: "Please Verify Your New Email Address",
        message: `You're almost there! Please verify your new email address to complete the update process by clicking on the button below. If you did not request this change, please contact our support team immediately.`,
        link: `${process.env.APP_URL || "http://localhost:5173"}/verify?token=${token}`,
        buttonText: "Verify Email",
        action: "Email Verification"
      };
      await sendEmail(verifyEmail);
      const verifyVerification: NewVerification = {
        userId: userId,
        token: token,
        expiresAt: expiresAt.toISOString(),
        reason: "verify"
      };
      await createVerification(verifyVerification);
    }
    const token = randomBytes(16).toString("hex") + md5(uuid);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    const invalidateEmail: Email = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Urgent: Email Change Alert",
      preHeader: "Immediate Action Required",
      title: "Your Email Address Has Been Changed",
      message: `We have recorded a change to your email address. If you did not initiate this change, it's crucial to act immediately to secure your account.<br/><br/>
                Please use the button below to reset your email and password. This link will expire in 24 hours for security reasons. If the link has expired, please contact our support team directly for assistance.`,
      link: `${process.env.APP_URL || "http://localhost:5173"}/account-recovery?token=${token}&email=${email}`,
      buttonText: "Reset Email and Password",
      action: "Account Recovery"
    };
    await sendEmail(invalidateEmail);
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
      await deleteVerification({ token, reason: "password" });
      reply.status(401).send({ error: "Password reset token expired or invalid" });
      return;
    }
    const hashedPassword = await hash(password, 10);
    await updateUser({ userId }, { hashedPassword, invalidateSession: 0 });
    await deleteVerification({ token, reason: "password" });
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
    let token = "";
    if (!hashedPassword) {
      emailText =
        "It seems like you've attempted a password reset, but your account is set up to sign in using Google authentication. No password is associated with your account. Please sign in directly via Google. If you need further assistance, feel free to contact our support team.";
    } else {
      token = randomBytes(16).toString("hex") + md5(uuid);
      emailText =
        "You have requested to reset your password. Please click on the button below within the next 15 minutes to complete the process. If you did not request a password reset, please ignore this email or contact support for more help.";
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15);
      await deleteVerification({ userId, reason: "password" });
      const verification: NewVerification = {
        userId: userId,
        token: token,
        expiresAt: expiresAt.toISOString(),
        reason: "password"
      };
      await createVerification(verification);
    }
    const authEmail: Email = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Reset Your Password",
      preHeader: "Password Reset Requested",
      title: "Reset Your Password",
      message: emailText,
      link: hashedPassword
        ? `${process.env.APP_URL || "http://localhost:5173"}/reset-password?token=${token}`
        : undefined,
      buttonText: hashedPassword ? "Reset Password" : undefined,
      action: "Password Reset"
    };
    await sendEmail(authEmail);
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
        "Welcome back to TSC Online! It looks like your email has already been verified. If you did not request this email or suspect any unusual activity, please contact our support team.";
    } else {
      token = randomBytes(16).toString("hex") + md5(uuid);
      emailText = `Thank you for joining TSC Online! Please verify your email to start exploring our features by clicking the link below. This link will expire in 1 hour for your security.`;
      await deleteVerification({ userId, reason: "verify" });
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
      preHeader: "Just one more step to get started!",
      title: "Welcome to TSC Online!",
      message: emailText,
      link: emailVerified ? undefined : `${process.env.APP_URL || "http://localhost:5173"}/verify?token=${token}`,
      buttonText: emailVerified ? undefined : "Verify Your Email Now",
      action: "Email Verification"
    };
    await sendEmail(authEmail);
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
      await deleteVerification({ token, reason: "verify" });
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
      invalidateSession: 0
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
      preHeader: "Just one more step to get started!",
      title: "Welcome to TSC Online, " + username + "!",
      message: `Welcome to TSC Online, <strong>${username}</strong>! We're excited to have you join our community. Please verify your email to activate your account and start exploring our features. Click on the button below to verify your email.`,
      link: `${process.env.APP_URL || "http://localhost:5173"}/verify?token=${token}`,
      buttonText: "Verify Your Email",
      action: "Email Verification"
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
    await sendEmail(authEmail);
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
      invalidateSession: 0
    };
    await createUser(user);
    request.session.set("uuid", uuid);
    reply.send({ message: "Login successful" });
  } catch (error) {
    console.error("Error during login:", error);
    reply.status(500).send({ error: "Unknown Error" });
  }
};
