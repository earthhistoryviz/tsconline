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
  assertTimescale,
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
import { randomUUID } from "crypto";
import dotenv from "dotenv";
import { getDb, UserRow } from "./database.js";
import { genSalt, hash, compare } from "bcrypt-ts";
import { glob } from "glob";
import formUrlEncoded from "form-urlencoded";
import { OAuth2Client } from "google-auth-library";

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

export const signup = async function signup(
  request: FastifyRequest<{ Body: { username: string; password: string } }>,
  reply: FastifyReply
) {
  const { username, password } = request.body;
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM users WHERE username = ?`).all(username);
  if (rows) {
    for (const row of rows) {
      const hashedPassword = (row as UserRow)["hashed_password"];
      if (hashedPassword) {
        const result = await compare(password, hashedPassword);
        if (result) {
          reply.status(409).send({ message: "It looks like you already have an account. Please log in instead" });
        }
      }
    }
  }
  const salt = await genSalt();
  const hashedPassword = await hash(password, salt);
  try {
    db.prepare(`INSERT INTO users (username, email, hashed_password, google_id, uuid, picture_url) VALUES (?, ?, ?, ?, ?, ?)`).run(
      username,
      null,
      hashedPassword,
      null,
      randomUUID(),
      null
    );
  } catch (e) {
    console.error("Error during signup:", e);
    reply.status(500).send({ message: "Failed to create user" });
    return;
  }
  reply.status(200).send({ message: "User created" });
};

export const login = async function login(
  request: FastifyRequest<{ Body: { username: string; password: string } }>,
  reply: FastifyReply
) {
  const { username, password } = request.body;
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM users WHERE username = ?`).all(username);
  if (!rows) {
    reply.status(401).send({ message: "User does not exist" });
    return;
  }
  if (rows) {
    for (const row of rows) {
      const hashedPassword = (row as UserRow)["hashed_password"];
      if (hashedPassword && (await compare(password, hashedPassword))) {
        request.session.set("uuid", (row as UserRow)["uuid"]);
        reply.send({ message: "Login successful" });
        return;
      }
    }
  }
  reply.status(401).send({ message: "Login failed" });
};

export const googleLogin = async function login(
  request: FastifyRequest<{ Body: {credential: string}}>,
  reply: FastifyReply
) {
  dotenv.config();
  if (!process.env.GOOGLE_CLIENT_ID) {
    reply.status(400).send({ message: "Missing Google Client Secret or Google Client ID" });
    return;
  }
  const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  const ticket = await client.verifyIdToken({
    idToken: request.body.credential,
    audience: process.env.GOOGLE_CLIENT_ID
  });
  const payload = ticket.getPayload();
  if (!payload) {
    reply.status(400).send({ message: "Invalid Google Credential" });
    return;
  }
  try {
    const db = getDb();
    const row = db.prepare(`SELECT * FROM users WHERE google_id = ?`).get(payload.sub);
    let uuid = "";
    if (!row) {
      uuid = randomUUID();
      db.prepare(`INSERT INTO users (username, email, hashed_password, google_id, uuid, picture_url) VALUES (?, ?, ?, ?, ?, ?)`).run(
        null,
        payload.email,
        null,
        payload.sub,
        uuid,
        payload.picture
      );
    } else {
      uuid = (row as UserRow)["uuid"];
    }
    request.session.set("uuid", uuid);
    reply.redirect(process.env.APP_URL || "http://localhost:5173");
  } catch (error) {
    console.error("Error during login:", error);
    reply.status(500).send({ message: error });
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
