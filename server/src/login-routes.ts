import type { FastifyRequest, FastifyReply } from "fastify";
import { randomUUID, randomBytes } from "crypto";
import { getDb } from "./database.js";
import { UserRow, VerificationRow, assertUserRow, assertVerificationRow } from "./types.js";
import { compare, hash } from "bcrypt-ts";
import { OAuth2Client } from "google-auth-library";
import { Email, assertEmail } from "./types.js";
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
  const db = getDb();
  try {
    const row = db.prepare(`SELECT * FROM verification WHERE token = ?`).get(token);
    if (!row) {
      reply.status(404).send({ error: "Password reset token not found" });
      return;
    }
    const { userId, expiresAt, verifyOrReset } = row as VerificationRow;
    assertVerificationRow(row);
    const expiresAtDate = new Date(expiresAt);
    if (expiresAtDate < new Date() || verifyOrReset !== "reset") {
      db.prepare(`DELETE FROM verification WHERE token = ?`).run(token);
      reply.status(401).send({ error: "Password reset token expired or invalid" });
      return;
    }
    const hashedPassword = await hash(password, 10);
    db.prepare(`UPDATE users SET hashedPassword = ? WHERE id = ?`).run(hashedPassword, userId);
    db.prepare(`DELETE FROM verification WHERE token = ?`).run(token);
    request.session.set("uuid", (db.prepare(`SELECT uuid FROM users WHERE id = ?`).get(userId) as UserRow)["uuid"]);
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
  if (!email) {
    reply.status(400).send({ error: "Invalid form" });
    return;
  }
  const db = getDb();
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    reply.status(500).send({ error: "Email service not configured" });
    return;
  }
  try {
    const row = db.prepare(`SELECT * FROM users WHERE email = ?`).get(email);
    if (!row) {
      reply.send({ message: "Email sent" });
      return;
    }
    const { hashedPassword, emailVerified } = row as UserRow;
    assertUserRow(row);
    if (!row || !emailVerified) {
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
      db.prepare(
        `DELETE FROM verification WHERE userId = (SELECT id FROM users WHERE email = ?) AND verifyOrReset = ?`
      ).run(email, "reset");
      db.prepare(
        `INSERT into verification (userId, token, expiresAt, verifyOrReset) VALUES ((SELECT id FROM users WHERE email = ?), ?, ?, ?)`
      ).run(email, token, expiresAt.toISOString(), "reset");
    }
    const authEmail: Email = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Reset Your Password",
      text: emailText
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
  if (!email) {
    reply.status(400).send({ error: "Invalid form" });
    return;
  }
  const db = getDb();
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    reply.status(500).send({ error: "Email service not configured" });
    return;
  }
  try {
    const row = db.prepare(`SELECT * FROM users WHERE email = ?`).get(email);
    if (!row) {
      reply.send({ message: "Email sent" });
      return;
    }
    let emailText = "";
    let token = "";
    const { id, emailVerified } = row as UserRow;
    assertUserRow(row);
    if (emailVerified) {
      emailText =
        "Welcome back to TSC Online! Your email is already verified. If you did not request this email, please ignore it.";
    } else {
      token = randomBytes(16).toString("hex");
      emailText = `Welcome to TSC Online! Please verify your email by clicking on the following link: ${process.env.APP_URL || "http://localhost:5173"}/verify?token=${token}`;
      db.prepare(`DELETE FROM verification WHERE userId = ?`).run(id);
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);
      db.prepare(
        `INSERT into verification (userId, token, expiresAt, verifyOrReset) VALUES ((SELECT id FROM users WHERE email = ?), ?, ?, ?)`
      ).run(email, token, expiresAt.toISOString(), "verify");
    }
    const authEmail: Email = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Welcome to TSC Online - Verify Your Email",
      text: emailText
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
  const db = getDb();
  try {
    const row = db.prepare(`SELECT * FROM verification WHERE token = ?`).get(token);
    if (!row) {
      reply.status(404).send({ error: "Verification token not found" });
      return;
    }
    const { userId, expiresAt, verifyOrReset } = row as VerificationRow;
    const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId);
    const { emailVerified, uuid } = user as UserRow;
    if (emailVerified) {
      reply.status(409).send({ error: "Email already verified" });
      return;
    }
    const expiresAtDate = new Date(expiresAt);
    if (expiresAtDate < new Date() || verifyOrReset !== "verify") {
      db.prepare(`DELETE FROM verification WHERE token = ?`).run(token);
      reply.status(401).send({ error: "Verification token expired or invalid" });
      return;
    }
    db.prepare(`UPDATE users SET emailVerified = 1 WHERE id = ?`).run(userId);
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
  const db = getDb();
  try {
    const rows = db.prepare(`SELECT * FROM users WHERE email = ? OR username = ?`).all(email, username);
    if (rows.length > 0) {
      reply.status(409).send({ error: "User with this email or username already exists" });
      return;
    }
    const hashedPassword = await hash(password, 10);
    db.prepare(
      `INSERT INTO users (username, email, hashedPassword, uuid, pictureUrl, emailVerified) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(username, email, hashedPassword, randomUUID(), null, 0);
    const token = randomBytes(16).toString("hex");
    const authEmail: Email = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Welcome to TSC Online - Verify Your Email",
      text: `Welcome to TSC Online, ${username}! Please verify your email by clicking on the following link: ${process.env.APP_URL || "http://localhost:5173"}/verify?token=${token}`
    };
    await sendEmail(authEmail);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    db.prepare(
      `INSERT into verification (userId, token, expiresAt, verifyOrReset) VALUES ((SELECT id FROM users WHERE email = ?), ?, ?, ?)`
    ).run(email, token, expiresAt.toISOString(), "verify");
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
  const db = getDb();
  try {
    const row = db.prepare(`SELECT * FROM users WHERE username = ?`).get(username);
    if (!row) {
      reply.status(401).send({ error: "Incorrect username or password" });
      return;
    }
    const { uuid, hashedPassword, emailVerified } = row as UserRow;
    assertUserRow(row);
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
  if (!payload) {
    reply.status(400).send({ error: "Invalid Google Credential" });
    return;
  }
  try {
    const db = getDb();
    const row = db.prepare(`SELECT * FROM users WHERE email = ?`).get(payload.email);
    if (row) {
      const { username, uuid } = row as UserRow;
      assertUserRow(row);
      if (username !== null) {
        reply.status(409).send({ error: "User already exists" });
      } else {
        request.session.set("uuid", uuid);
        reply.send({ message: "Login successful" });
      }
      return;
    }
    const uuid = randomUUID();
    db.prepare(
      `INSERT INTO users (username, email, hashedPassword, uuid, pictureUrl, emailVerified) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(null, payload.email, null, uuid, payload.picture, 1);
    request.session.set("uuid", uuid);
    reply.send({ message: "Login successful" });
  } catch (error) {
    console.error("Error during login:", error);
    reply.status(500).send({ error: "Unknown Error" });
  }
};
