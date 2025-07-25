import type { FastifyRequest, FastifyReply } from "fastify";
import { randomUUID, randomBytes } from "node:crypto";
import {
  findUser,
  createUser,
  updateUser,
  findVerification,
  createVerification,
  deleteVerification,
  deleteUser,
  checkForUsersWithUsernameOrEmail,
  getActiveWorkshopsUserIsIn
} from "../database.js";
import { compare, hash } from "bcrypt-ts";
import { OAuth2Client } from "google-auth-library";
import { Email, NewUser, NewVerification, UpdatedUser } from "../types.js";
import { sendEmail } from "../send-email.js";
import "dotenv/config";
import { assetconfigs } from "../util.js";
import path from "path";
import { pipeline } from "stream/promises";
import { createWriteStream } from "fs";
import { SharedUser, assertSharedUser } from "@tsconline/shared";
import { deleteAllUserMetadata } from "../file-metadata-handler.js";
import { readdir, rm, mkdir } from "fs/promises";
import { checkRecaptchaToken, generateToken } from "../verify.js";
import validator from "validator";
import logger from "../error-logger.js";
import { getPrivateUserUUIDDirectory } from "../user/fetch-user-files.js";
import { getChartHistoryMetadata } from "../user/chart-history.js";

export const googleRecaptchaBotThreshold = 0.5;

export const logout = async function logout(request: FastifyRequest, reply: FastifyReply) {
  request.session.delete();
  reply.send({ message: "Logged out" });
};

export const deleteProfile = async function deleteProfile(request: FastifyRequest, reply: FastifyReply) {
  const uuid = request.session.get("uuid");
  if (!uuid) {
    reply.status(401).send({ error: "Not logged in" });
    return;
  }
  try {
    await deleteUser({ uuid });
    const userDirectory = path.join(assetconfigs.uploadDirectory, uuid);
    try {
      await rm(userDirectory, { recursive: true, force: true });
    } catch (e) {
      logger.error(
        `User uuid "${uuid}" deleted their profile and their directory could not be deleted with\n Error ${e}`
      );
    }
    try {
      await deleteAllUserMetadata(assetconfigs.fileMetadata, uuid);
    } catch (e) {
      logger.error(
        `User uuid "${uuid}" deleted their profile and their metadata could not be deleted with\n Error ${e}`
      );
    }
    request.session.delete();
    reply.send({ message: "Profile deleted" });
  } catch (error) {
    console.error("Error during profile deletion:", error);
    request.session.delete();
    reply.status(500).send({ error: "Unknown Error" });
  }
};

export const changePassword = async function changePassword(
  request: FastifyRequest<{ Body: { currentPassword: string; newPassword: string; recaptchaToken: string } }>,
  reply: FastifyReply
) {
  const uuid = request.session.get("uuid");
  if (!uuid) {
    reply.status(401).send({ error: "Not logged in" });
    return;
  }
  const { currentPassword, newPassword, recaptchaToken } = request.body;
  if (!currentPassword || !newPassword || !recaptchaToken) {
    reply.status(400).send({ error: "Invalid form" });
    return;
  }
  try {
    const score = await checkRecaptchaToken(recaptchaToken, "changePassword");
    if (score < googleRecaptchaBotThreshold) {
      reply.status(422).send({ error: "Recaptcha failed" });
      return;
    }
    const user = (await findUser({ uuid }))[0];
    if (!user) {
      throw new Error("User not found");
    }
    const { hashedPassword } = user;
    if (!hashedPassword) {
      reply.status(403).send({ error: "Account authenticated via Google" });
      return;
    }
    if (!(await compare(currentPassword, hashedPassword))) {
      reply.status(409).send({ error: "Incorrect password" });
      return;
    }
    const newHashedPassword = await hash(newPassword, 10);
    await updateUser({ uuid }, { hashedPassword: newHashedPassword });
    request.session.delete();
    reply.send({ message: "Password changed" });
  } catch (error) {
    console.error("Error during password change:", error);
    reply.status(500).send({ error: "Unknown Error" });
  }
};

export const changeUsername = async function changeUsername(
  request: FastifyRequest<{ Body: { newUsername: string; recaptchaToken: string } }>,
  reply: FastifyReply
) {
  const uuid = request.session.get("uuid");
  if (!uuid) {
    reply.status(401).send({ error: "Not logged in" });
    return;
  }
  const { newUsername, recaptchaToken } = request.body;
  if (!newUsername || !recaptchaToken) {
    reply.status(400).send({ error: "Invalid form" });
    return;
  }
  try {
    const score = await checkRecaptchaToken(recaptchaToken, "changeUsername");
    if (score < googleRecaptchaBotThreshold) {
      reply.status(422).send({ error: "Recaptcha failed" });
      return;
    }
    const user = (await findUser({ uuid }))[0];
    if (!user) {
      throw new Error("User not found");
    }
    const usersWithSameUsername = await findUser({ username: newUsername });
    if (usersWithSameUsername.length > 0) {
      reply.status(409).send({ error: "Username already taken" });
      return;
    }
    await updateUser({ uuid }, { username: newUsername });
    request.session.delete();
    reply.send({ message: "Username changed" });
  } catch (error) {
    console.error("Error during username change:", error);
    reply.status(500).send({ error: "Unknown Error" });
  }
};

export const uploadProfilePicture = async function uploadProfilePicture(request: FastifyRequest, reply: FastifyReply) {
  const uuid = request.session.get("uuid");
  if (!uuid) {
    reply.status(401).send({ error: "Not logged in" });
    return;
  }
  try {
    const user = (await findUser({ uuid }))[0];
    if (!user) {
      throw new Error("User not found");
    }
    const file = await request.file();
    if (!file) {
      reply.status(404).send({ error: "No file uploaded" });
      return;
    }
    const ext = file.filename.split(".").pop();
    if (!file.mimetype.startsWith("image/") || !ext || !/^(jpg|jpeg|png|gif)$/.test(ext)) {
      reply.status(400).send({ error: "Invalid file" });
      return;
    }
    const pictureName = `profile-${uuid}.${ext}`;
    const userDirectory = await getPrivateUserUUIDDirectory(uuid);
    const filePath = path.join(userDirectory, pictureName);
    await mkdir(userDirectory, { recursive: true });
    const existingFiles = await readdir(userDirectory, { withFileTypes: false });
    for (const existingFile of existingFiles) {
      if (existingFile.startsWith("profile-") && /\.(jpg|jpeg|png|gif)$/i.test(existingFile)) {
        await rm(path.join(userDirectory, existingFile));
      }
    }
    const fileStream = file.file;
    await pipeline(fileStream, createWriteStream(filePath));
    if (file.file.truncated) {
      throw new Error("File too large");
    }
    const pictureUrl =
      (process.env.NODE_ENV === "production" ? process.env.APP_URL : "http://localhost:3000") +
      `/profile-images/${uuid}/profile/${pictureName}`;
    await updateUser({ uuid }, { pictureUrl: pictureUrl });
    reply.send({ pictureUrl: pictureUrl });
  } catch (error) {
    console.error("Error during upload:", error);
    reply.status(500).send({ error: (error as Error).message });
  }
};

export const sessionCheck = async function sessionCheck(request: FastifyRequest, reply: FastifyReply) {
  const uuid = request.session.get("uuid");
  if (!uuid) {
    reply.send({ authenticated: false });
    return;
  }
  try {
    const user = (await findUser({ uuid }))[0];
    if (!user || user.invalidateSession) {
      reply.send({ authenticated: false });
      return;
    }
    const { email, username, pictureUrl, hashedPassword, isAdmin, userId, accountType } = user;
    const workshopIds: number[] = [];
    workshopIds.push(...(await getActiveWorkshopsUserIsIn(userId)).map((workshop) => workshop.workshopId));
    const historyEntries = await getChartHistoryMetadata(uuid);
    const sharedUser: SharedUser = {
      email,
      username,
      pictureUrl,
      isGoogleUser: !hashedPassword,
      isAdmin: Boolean(isAdmin),
      ...(workshopIds.length > 0 && { workshopIds }),
      accountType,
      uuid,
      historyEntries
    };
    assertSharedUser(sharedUser);
    reply.send({ authenticated: true, user: sharedUser });
  } catch (error) {
    console.error("Error during session check:", error);
    reply.status(500).send({ error: "Unknown Error" });
  }
};

export const accountRecovery = async function accountRecovery(
  request: FastifyRequest<{ Body: { token: string; email: string } }>,
  reply: FastifyReply
) {
  const { token, email } = request.body;
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    reply.status(500).send({ error: "Email service not configured" });
    return;
  }
  if (!token || !email || !validator.isEmail(email)) {
    reply.status(400).send({ error: "No token or email" });
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
    const passwordToken = generateToken(user.uuid);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    await deleteVerification({ userId, reason: "password" });
    const passwordVerification: NewVerification = {
      userId: userId,
      token: passwordToken,
      expiresAt: expiresAt.toISOString(),
      reason: "password"
    };
    await createVerification(passwordVerification);
    const newEmail: Email = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Account Recovery",
      preHeader: "Action Required: Reset your password now",
      title: "Account Recovery",
      message: `We received a request to invalidate your account credentials. Tap the button below to reset your password. You will not be able to access your account until you have reset your password. If you did not request this change or need further assistance, please contact our support team.`,
      link: `${process.env.APP_URL || "http://localhost:5173"}/reset-password?token=${passwordToken}`,
      buttonText: "Reset Password",
      action: "Account Recovery"
    };
    await sendEmail(newEmail);
    const randomPassword = randomBytes(16).toString("hex");
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

export const changeEmail = async function changeEmail(
  request: FastifyRequest<{ Body: { newEmail: string; recaptchaToken: string } }>,
  reply: FastifyReply
) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    reply.status(500).send({ error: "Email service not configured" });
    return;
  }
  const uuid = request.session.get("uuid");
  if (!uuid) {
    reply.status(401).send({ error: "Not logged in" });
    return;
  }
  const { newEmail, recaptchaToken } = request.body;
  if (!newEmail || !validator.isEmail(newEmail) || !recaptchaToken) {
    reply.status(400).send({ error: "Invalid form" });
    return;
  }
  try {
    const score = await checkRecaptchaToken(recaptchaToken, "changeEmail");
    if (score < googleRecaptchaBotThreshold) {
      reply.status(422).send({ error: "Recaptcha failed" });
      return;
    }
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
      const token = generateToken(uuid);
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
        action: "Email Verification"
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
      const token = generateToken(uuid);
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);
      await deleteVerification({ userId: userId, reason: "verify" });
      await deleteVerification({ userId: userId, reason: "password" });
      const verifyEmail: Email = {
        from: process.env.EMAIL_USER,
        to: newEmail,
        subject: "Your Email Has Been Updated",
        preHeader: "Important: Verify Your New Email",
        title: "Email Update Confirmation",
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
    const token = generateToken(uuid);
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

export const forgotPassword = async function forgotPassword(
  request: FastifyRequest<{ Body: { token: string; password: string; recaptchaToken: string } }>,
  reply: FastifyReply
) {
  const { token, password, recaptchaToken } = request.body;
  if (!password || !token || !recaptchaToken) {
    reply.status(400).send({ error: "Invalid form" });
    return;
  }
  try {
    const score = await checkRecaptchaToken(recaptchaToken, password);
    if (score < googleRecaptchaBotThreshold) {
      reply.status(422).send({ error: "Recaptcha failed" });
      return;
    }
    const verificationRow = (await findVerification({ token }))[0];
    if (!verificationRow || verificationRow.reason !== "password") {
      reply.status(404).send({ error: "Password reset token not found" });
      return;
    }
    const { userId, expiresAt } = verificationRow;
    const expiresAtDate = new Date(expiresAt);
    if (expiresAtDate < new Date()) {
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

export const sendForgotPasswordEmail = async function sendForgotPasswordEmail(
  request: FastifyRequest<{ Body: { email: string; recaptchaToken: string } }>,
  reply: FastifyReply
) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    reply.status(500).send({ error: "Email service not configured" });
    return;
  }
  const { email, recaptchaToken } = request.body;
  if (!email || !validator.isEmail(email) || !recaptchaToken) {
    reply.status(400).send({ error: "Invalid form" });
    return;
  }
  try {
    const score = await checkRecaptchaToken(recaptchaToken, "sendForgotPasswordEmail");
    if (score < googleRecaptchaBotThreshold) {
      reply.status(422).send({ error: "Recaptcha failed" });
      return;
    }
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
      token = generateToken(uuid);
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
        ? `${process.env.APP_URL || "http://localhost:5173"}/forgot-password?token=${token}`
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
  request: FastifyRequest<{ Body: { email: string; recaptchaToken: string } }>,
  reply: FastifyReply
) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    reply.status(500).send({ error: "Email service not configured" });
    return;
  }
  const { email, recaptchaToken } = request.body;
  if (!email || !validator.isEmail(email) || !recaptchaToken) {
    reply.status(400).send({ error: "Invalid form" });
    return;
  }
  try {
    const score = await checkRecaptchaToken(recaptchaToken, "resendVerificationEmail");
    if (score < googleRecaptchaBotThreshold) {
      reply.status(422).send({ error: "Recaptcha failed" });
      return;
    }
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
      token = generateToken(uuid);
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
    if (!verificationRow || verificationRow.reason !== "verify") {
      reply.status(404).send({ error: "Verification token not found" });
      return;
    }
    const { expiresAt, userId } = verificationRow;
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
    if (expiresAtDate < new Date()) {
      await deleteVerification({ token, reason: "verify" });
      reply.status(401).send({ error: "Verification token expired or invalid" });
      return;
    }
    await updateUser({ userId }, { emailVerified: 1 });
    request.session.set("uuid", uuid);
    reply.send({ message: "Email verified" });
  } catch (error) {
    console.error("Error during verifying email:", error);
    reply.status(500).send({ error: "Unknown Error" });
  }
};

export const signup = async function signup(
  request: FastifyRequest<{ Body: { username: string; password: string; email: string; recaptchaToken: string } }>,
  reply: FastifyReply
) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    reply.status(500).send({ error: "Email service not configured" });
    return;
  }
  const { username, password, email, recaptchaToken } = request.body;
  if (!username || !password || !email || !validator.isEmail(email) || !recaptchaToken) {
    reply.status(400).send({ error: "Invalid form" });
    return;
  }
  try {
    const score = await checkRecaptchaToken(recaptchaToken, "signup");
    if (score < googleRecaptchaBotThreshold) {
      reply.status(422).send({ error: "Recaptcha failed" });
      return;
    }
    const check = await checkForUsersWithUsernameOrEmail(username, email);
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
      invalidateSession: 0,
      isAdmin: 0,
      accountType: "default"
    };
    await createUser(newUser);
    const insertedUser = (await findUser({ email }))[0];
    if (!insertedUser) {
      throw new Error("User not inserted");
    }
    const { userId, uuid } = insertedUser;
    const token = generateToken(uuid);
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
  request: FastifyRequest<{ Body: { username: string; password: string; recaptchaToken: string } }>,
  reply: FastifyReply
) {
  const { username, password, recaptchaToken } = request.body;
  if (!username || !password || !recaptchaToken) {
    reply.status(400).send({ error: "Invalid form" });
    return;
  }
  try {
    const score = await checkRecaptchaToken(recaptchaToken, "login");
    // the score is a number between 0 and 1 that indicates the likelihood that the user is a bot
    if (score < googleRecaptchaBotThreshold) {
      reply.status(422).send({ error: "Recaptcha failed" });
      return;
    }
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
  request: FastifyRequest<{ Body: { credential: string; recaptchaToken: string } }>,
  reply: FastifyReply
) {
  const { credential, recaptchaToken } = request.body;
  if (!credential || !recaptchaToken) {
    reply.status(400).send({ error: "Invalid form" });
    return;
  }
  try {
    const score = await checkRecaptchaToken(recaptchaToken, "googleLogin");
    if (score < googleRecaptchaBotThreshold) {
      reply.status(422).send({ error: "Recaptcha failed" });
      return;
    }
    const client = new OAuth2Client("1010066768032-cfp1hg2ad9euid20vjllfdqj18ki7hmb.apps.googleusercontent.com");
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: "1010066768032-cfp1hg2ad9euid20vjllfdqj18ki7hmb.apps.googleusercontent.com"
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      reply.status(400).send({ error: "Invalid Google Credential" });
      return;
    }
    const userRow = (await findUser({ email: payload.email }))[0];
    if (userRow) {
      const { hashedPassword, uuid } = userRow;
      if (hashedPassword) {
        reply.status(409).send({ error: "User already exists" });
      } else {
        request.session.set("uuid", uuid);
        reply.send({ message: "Login successful" });
      }
      return;
    }
    const uuid = randomUUID();
    const user: NewUser = {
      username: payload.email,
      email: payload.email,
      hashedPassword: null,
      uuid: uuid,
      pictureUrl: payload.picture,
      emailVerified: 1,
      invalidateSession: 0,
      isAdmin: 0,
      accountType: "default"
    };
    await createUser(user);
    const insertedUser = (await findUser({ email: payload.email }))[0];
    if (!insertedUser) {
      throw new Error("User not inserted");
    }
    request.session.set("uuid", uuid);
    reply.send({ message: "Login successful" });
  } catch (error) {
    console.error("Error during login:", error);
    reply.status(500).send({ error: "Unknown Error" });
  }
};
