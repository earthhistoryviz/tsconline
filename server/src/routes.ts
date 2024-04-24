import type { FastifyRequest, FastifyReply } from "fastify";
import { exec } from "child_process";
import { writeFile, stat, readFile, access } from "fs/promises";
import {
  DatapackIndex,
  MapPackIndex,
  TimescaleItem,
  assertChartRequest,
  assertDatapackIndex,
  assertIndexResponse,
  assertMapPackIndex,
  assertTimescale
} from "@tsconline/shared";
import { deleteDirectory, resetUploadDirectory } from "./util.js";
import { mkdirp } from "mkdirp";
import md5 from "md5";
import { assetconfigs } from "./index.js";
import svgson from "svgson";
import fs from "fs";
import { parseExcelFile } from "./parse-excel-file.js";
import path from "path";
import pump from "pump";
import { loadIndexes } from "./load-packs.js";
import { writeFileMetadata } from "./file-metadata-handler.js";
import { datapackIndex as serverDatapackindex, mapPackIndex as serverMapPackIndex } from "./index.js";
import { randomUUID, randomBytes } from "crypto";
import { getDb, UserRow, VerificationRow } from "./database.js";
import { compare, hash } from "bcrypt-ts";
import { glob } from "glob";
import { OAuth2Client } from "google-auth-library";
import { Email, assertEmail } from "./types.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

export const fetchUserDatapacks = async function fetchUserDatapacks(
  request: FastifyRequest<{ Params: { username: string } }>,
  reply: FastifyReply
) {
  const uuid = request.session.get("uuid");
  if (!uuid) {
    reply.status(401).send({ error: "User not logged in" });
    return;
  }
  const userDir = path.join(assetconfigs.uploadDirectory, uuid);
  try {
    await access(userDir);
  } catch (e) {
    reply.status(404).send({ error: "User has no uploaded datapacks" });
    return;
  }
  const datapackIndex: DatapackIndex = JSON.parse(JSON.stringify(serverDatapackindex));
  const mapPackIndex: MapPackIndex = JSON.parse(JSON.stringify(serverMapPackIndex));
  try {
    await access(path.join(userDir, "DatapackIndex.json"));
    Object.assign(datapackIndex, JSON.parse(fs.readFileSync(path.join(userDir, "DatapackIndex.json")).toString()));
    await access(path.join(userDir, "MapPackIndex.json"));
    Object.assign(mapPackIndex, JSON.parse(fs.readFileSync(path.join(userDir, "MapPackIndex.json")).toString()));
  } catch (e) {
    reply
      .status(500)
      .send({ error: "Failed to load indexes, corrupt json files present. Please contact customer service." });
    return;
  }
  const indexResponse = { datapackIndex, mapPackIndex };
  assertIndexResponse(indexResponse);
  reply.status(200).send(indexResponse);
};

export const uploadDatapack = async function uploadDatapack(
  request: FastifyRequest<{ Params: { username: string } }>,
  reply: FastifyReply
) {
  const uuid = request.session.get("uuid");
  if (!uuid) {
    reply.status(401).send({ error: "User not logged in" });
    return;
  }
  const file = await request.file();
  if (!file) {
    reply.status(404).send({ error: "No file uploaded" });
    return;
  }
  // only accept a binary file (encoded) or an unecnrypted text file
  if (file.mimetype !== "application/octet-stream" && file.mimetype !== "text/plain") {
    reply.status(400).send({ error: `Invalid mimetype of uploaded file, received ${file.mimetype}` });
    return;
  }
  const filename = file.filename;
  const ext = path.extname(filename);
  const filenameWithoutExtension = path.basename(filename, ext);
  const userDir = path.join(assetconfigs.uploadDirectory, uuid);
  const datapackDir = path.join(userDir, "datapacks");
  const decryptDir = path.join(userDir, "decrypted");
  const filepath = path.join(datapackDir, filename);
  const decryptedFilepathDir = path.join(decryptDir, filenameWithoutExtension);
  const mapPackIndexFilepath = path.join(userDir, "MapPackIndex.json");
  const datapackIndexFilepath = path.join(userDir, "DatapackIndex.json");
  if (!/^(\.dpk|\.txt|\.map|\.mdpk)$/.test(ext)) {
    reply.status(415).send({ error: "Invalid file type" });
    return;
  }
  await mkdirp(datapackDir);
  const fileStream = file.file;
  console.log("Uploading file: ", filename);
  try {
    // must wait for the file to be written before decrypting
    await new Promise<void>((resolve, reject) => {
      pump(fileStream, fs.createWriteStream(filepath), (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  } catch (e) {
    console.error(e);
    await resetUploadDirectory(filepath, decryptedFilepathDir);
    reply.status(500).send({ error: "Failed to save file with error: " + e });
    return;
  }
  if (file.file.truncated) {
    await resetUploadDirectory(filepath, decryptedFilepathDir);
    reply.status(413).send({ error: "File too large" });
    return;
  }
  try {
    await new Promise<void>((resolve, reject) => {
      const cmd =
        `java -jar ${assetconfigs.decryptionJar} ` +
        // Decrypting these datapacks:
        `-d "${filepath.replaceAll("\\", "/")}" ` +
        // Tell it where to send the datapacks
        `-dest ${decryptDir.replaceAll("\\", "/")} `;
      console.log("Calling Java decrypt.jar: ", cmd);
      exec(cmd, function (error, stdout, stderror) {
        console.log("Java decrypt.jar finished, sending reply to browser");
        if (error) {
          console.error("Java error param: " + error);
          console.error("Java stderr: " + stderror.toString());
          reject(error);
        } else {
          console.log("Java stdout: " + stdout.toString());
          resolve();
        }
      });
    });
  } catch (e) {
    console.error(e);
    await resetUploadDirectory(filepath, decryptedFilepathDir);
    reply.status(500).send({ error: "Failed to decrypt datapacks with error " + e });
    return;
  }
  try {
    await access(decryptedFilepathDir);
    await access(path.join(decryptedFilepathDir, "datapacks"));
  } catch (e) {
    await resetUploadDirectory(filepath, decryptedFilepathDir);
    reply.status(500).send({ error: "Failed to decrypt file" });
    return;
  }
  const datapackIndex: DatapackIndex = {};
  const mapPackIndex: MapPackIndex = {};
  // check for if this user has a datapack index already
  try {
    await access(datapackIndexFilepath);
    const data = await readFile(datapackIndexFilepath);
    Object.assign(datapackIndex, JSON.parse(data.toString()));
    assertDatapackIndex(datapackIndex);
  } catch (e) {
    console.error(e);
    await resetUploadDirectory(filepath, decryptedFilepathDir);
    reply.status(500).send({ error: "Failed to parse DatapackIndex.json" });
    return;
  }
  // check for if this user has a map index already
  try {
    await access(mapPackIndexFilepath);
    const data = await readFile(mapPackIndexFilepath);
    Object.assign(mapPackIndex, JSON.parse(data.toString()));
    assertMapPackIndex(mapPackIndex);
  } catch (e) {
    console.error(e);
    await resetUploadDirectory(filepath, decryptedFilepathDir);
    reply.status(500).send({ error: "Failed to parse MapPackIndex.json" });
    return;
  }
  await loadIndexes(datapackIndex, mapPackIndex, decryptDir.replaceAll("\\", "/"), [filename]);
  if (!datapackIndex[filename]) {
    await resetUploadDirectory(filepath, decryptedFilepathDir);
    reply.status(500).send({ error: "Failed to load decrypted datapack" });
    return;
  }
  try {
    await writeFile(datapackIndexFilepath, JSON.stringify(datapackIndex));
    await writeFile(mapPackIndexFilepath, JSON.stringify(mapPackIndex));
  } catch (e) {
    console.error(e);
    reply.status(500).send({ error: "Failed to save indexes" });
    await resetUploadDirectory(filepath, decryptedFilepathDir);
    return;
  }
  try {
    await writeFileMetadata(
      assetconfigs.fileMetadata,
      filename,
      filepath,
      decryptedFilepathDir,
      mapPackIndexFilepath,
      datapackIndexFilepath
    );
  } catch (e) {
    console.error(e);
    reply.status(500).send({ error: "Failed to load and write metadata for file" });
    await resetUploadDirectory(filepath, decryptedFilepathDir);
    return;
  }
  reply.status(200).send({ message: "File uploaded" });
};

// TODO: later check in the user's directory for the file
export const fetchImage = async function (
  request: FastifyRequest<{ Params: { datapackName: string; imageName: string } }>,
  reply: FastifyReply
) {
  const imagePath = path.join(
    assetconfigs.decryptionDirectory,
    request.params.datapackName,
    "datapack-images",
    request.params.imageName
  );
  try {
    await access(imagePath);
    const image = await readFile(imagePath);
    reply.send(image);
  } catch (e) {
    const error = e as NodeJS.ErrnoException;
    if (error.code === "ENOENT") {
      reply.status(404).send({ error: "Image not found" });
    } else {
      reply.status(500).send({ error: "An error occurred" });
    }
  }
};

export const fetchSettingsXml = async function fetchSettingsJson(
  request: FastifyRequest<{ Params: { file: string } }>,
  reply: FastifyReply
) {
  try {
    const { file } = request.params;
    //TODO: differentiate between preset and user uploaded datpack
    const settingsXml = (await readFile(`${decodeURIComponent(file)}`)).toString();
    reply.send(settingsXml);
  } catch (e) {
    reply.send({ error: e });
  }
};

/**
 * Will attempt to read pdf and return whether it can or not
 * Runs with await
 * TODO: ADD ASSERTS
 */
export const fetchSVGStatus = async function (
  request: FastifyRequest<{ Params: { hash: string } }>,
  reply: FastifyReply
) {
  const { hash } = request.params;
  let isSVGReady = false;
  const directory = `${assetconfigs.chartsDirectory}/${hash}`;
  const filepath = `${directory}/chart.svg`;
  // if hash doesn't exist reply with error
  if (!fs.existsSync(directory)) {
    reply.send({ error: `No directory exists at hash: ${directory}` });
    return;
  }
  try {
    if (fs.existsSync(filepath)) {
      if (svgson.parseSync((await readFile(filepath)).toString())) isSVGReady = true;
    }
  } catch (e) {
    console.log("can't read svg at hash: ", hash);
  }

  console.log("reply: ", { ready: isSVGReady });
  reply.send({ ready: isSVGReady });
};

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
      console.log(row);
      if ((row as UserRow)["username"] !== null) {
        reply.status(409).send({ error: "User already exists" });
      } else {
        console.log("User already exists, logging in");
        request.session.set("uuid", (row as UserRow)["uuid"]);
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

/**
 * Will fetch a chart with or without the cache
 * Will return the chart path and the hash the chart was saved with
 */
export const fetchChart = async function fetchChart(request: FastifyRequest, reply: FastifyReply) {
  let chartrequest;
  try {
    chartrequest = JSON.parse(request.body as string);
    assertChartRequest(chartrequest);
  } catch (e) {
    console.log("ERROR: chart request is not valid.  Request was: ", chartrequest, ".  Error was: ", e);
    reply.send({
      error: "ERROR: chart request is not valid.  Error was: " + e
    });
    return;
  }
  const { username, useCache, useSuggestedAge } = chartrequest;
  const settingsXml = chartrequest.settings;
  const hashedUsername = md5(username);
  // Compute the paths: chart directory, chart file, settings file, and URL equivalent for chart
  const hash = md5(settingsXml + chartrequest.datapacks.join(","));
  const chartDirUrlPath = `/${assetconfigs.chartsDirectory}/${hash}`;
  const chartUrlPath = chartDirUrlPath + "/chart.svg";

  const chartDirFilePath = chartDirUrlPath.slice(1); // no leading slash
  const chartFilePath = chartUrlPath.slice(1);
  const settingsFilePath = chartDirFilePath + "/settings.tsc";

  // If this setting already has a chart, just return that
  try {
    await stat(chartFilePath);
    if (!useCache) {
      console.log("Deleting chart filepath since it already exists and cache is not being used");
      deleteDirectory(chartFilePath);
    } else {
      console.log("Request for chart that already exists (hash:", hash, ".  Returning cached version");
      reply.send({ chartpath: chartUrlPath, hash: hash }); // send the browser back the URL equivalent...
      return;
    }
  } catch (e) {
    // Doesn't exist, so make one
    console.log("Request for chart", chartUrlPath, ": chart does not exist, creating...");
  }

  // Create the directory and save the settings there for java:
  try {
    await mkdirp(chartDirFilePath);
    await writeFile(settingsFilePath, settingsXml);
    console.log("Successfully created and saved chart settings at", settingsFilePath);
  } catch (e) {
    console.log("ERROR: failed to save settings at", settingsFilePath, "  Error was:", e);
    reply.send({ error: "ERROR: failed to save settings" });
    return;
  }
  const userDatapackFilepaths = await glob(`${assetconfigs.uploadDirectory}/${hashedUsername}/datapacks/*`);
  const userDatapackNames = userDatapackFilepaths.map((datapack) => path.basename(datapack));
  const datapacks = [];
  for (const datapack of chartrequest.datapacks) {
    if (assetconfigs.activeDatapacks.includes(datapack)) {
      datapacks.push(`"${assetconfigs.datapacksDirectory}/${datapack}"`);
    } else if (userDatapackNames.includes(datapack)) {
      datapacks.push(`"${assetconfigs.uploadDirectory}/${hashedUsername}/datapacks/${datapack}"`);
    } else {
      console.log("ERROR: datapack: ", datapack, " is not included in activeDatapacks");
      console.log("assetconfig.activeDatapacks:", assetconfigs.activeDatapacks);
      console.log("chartrequest.datapacks: ", chartrequest.datapacks);
      reply.send({ error: "ERROR: failed to load datapacks" });
    }
  }
  // Call the Java monster...
  //const jarArgs: string[] = ['xvfb-run', '-jar', './jar/TSC.jar', '-node', '-s', `../files/${title}settings.tsc`, '-ss', `../files/${title}settings.tsc`, '-d', `../files/${title}datapack.txt`, '-o', `../files/${title}save.pdf`];
  //const jarArgs: string[] = ['-jar', './jar/TSC.jar', '-d', `./files/${title}datapack.txt`, '-s', `./files/${title}settings.tsc`];
  // extractedNames.forEach(path => {
  //   // Since we've filtered out null values, 'path' is guaranteed to be a string here
  //   const fullPath = `../assets/decrypted/${name}/datapacks`;
  //   const datapackInfo = parseDefaultAges(fullPath);
  //   console.log(datapackInfo);
  // });

  const cmd =
    `java -Xmx512m -XX:MaxDirectMemorySize=64m -XX:MaxRAM=1g -jar ${assetconfigs.activeJar} ` +
    // Turns off GUI (e.g Suggested Age pop-up (defaults to yes if -a flag is not passed))
    `-node ` +
    // Add settings:
    `-s ${settingsFilePath} -ss ${settingsFilePath} ` +
    // Add datapacks:
    `-d ${datapacks.join(" ")} ` +
    // Tell it where to save chart
    `-o ${chartFilePath} ` +
    // Don't use datapacks suggested age (if useSuggestedAge is true then ignore datapack ages)
    `${!useSuggestedAge ? "-a" : ""}`;

  // Exec Java command and send final reply to browser
  await new Promise<void>((resolve) => {
    console.log("Calling Java: ", cmd);
    exec(cmd, function (error, stdout, stderror) {
      console.log("Java finished, sending reply to browser");
      console.log("Java error param: " + error);
      console.log("Java stdout: " + stdout.toString());
      console.log("Java stderr: " + stderror.toString());
      resolve();
    });
  });
  console.log("Sending reply to browser: ", {
    chartpath: chartUrlPath,
    hash: hash
  });
  reply.send({ chartpath: chartUrlPath, hash: hash });
};

// Serve timescale data endpoint
export const fetchTimescale = async function (_request: FastifyRequest, reply: FastifyReply) {
  try {
    const filePath = assetconfigs.timescaleFilepath;

    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      console.error("Error: Excel file not found");
      reply.status(404).send({ error: "Excel file not found" });
      return;
    }

    const excelData: string[][] = await parseExcelFile(filePath);
    const timescaleData: TimescaleItem[] = excelData
      .map(([, , stage, ma]) => ({
        key: stage as string,
        value: parseFloat(ma as string)
      }))
      .filter((item) => item.key);
    timescaleData.forEach((data) => assertTimescale(data));

    reply.send({ timescaleData });
  } catch (error) {
    console.error("Error reading Excel file:", error);
    reply.status(500).send({ error: "Internal Server Error" });
  }
};
