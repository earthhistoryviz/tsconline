import type { FastifyRequest, FastifyReply } from "fastify";
import { exec, spawn } from "child_process";
import { writeFile, stat, readFile, access, rm, mkdir, realpath } from "fs/promises";
import {
  DatapackIndex,
  DatapackInfoChunk,
  MapPackIndex,
  MapPackInfoChunk,
  TimescaleItem,
  assertChartRequest,
  assertDatapackIndex,
  assertIndexResponse,
  assertTimescale,
  assertMapPackIndex
} from "@tsconline/shared";
import { deleteDirectory, resetUploadDirectory, checkHeader, assetconfigs, adminconfig, getBytes } from "./util.js";
import md5 from "md5";
import svgson from "svgson";
import fs, { realpathSync } from "fs";
import { parseExcelFile } from "./parse-excel-file.js";
import path from "path";
import pump from "pump";
import { loadIndexes } from "./load-packs.js";
import { writeFileMetadata } from "./file-metadata-handler.js";
import { datapackIndex as serverDatapackindex, mapPackIndex as serverMapPackIndex } from "./index.js";
import { glob } from "glob";
import { DatapackDescriptionInfo } from "./types.js";
import { MultipartFile } from "@fastify/multipart";
import { runJavaEncrypt } from "./encryption.js";
import { queue, maxQueueSize } from "./index.js";
import { containsKnownError } from "./chart-error-handler.js";

export const fetchServerDatapack = async function fetchServerDatapack(
  request: FastifyRequest<{ Params: { name: string } }>,
  reply: FastifyReply
) {
  const { name } = request.params;
  if (!name) {
    reply.status(400).send({ error: "Invalid datapack" });
    return;
  }
  const datapack = serverDatapackindex[decodeURIComponent(name)];
  if (!datapack) {
    reply.status(404).send({ error: "Datapack not found" });
    return;
  }
  reply.send(datapack);
};

export const fetchServerDatapackInfo = async function fetchServerDatapackInfo(
  request: FastifyRequest<{ Querystring: { start?: string; increment?: string } }>,
  reply: FastifyReply
) {
  const { start = 0, increment = 1 } = request.query;
  const startIndex = Number(start);
  let incrementValue = Number(increment);
  const allDatapackKeys = Object.keys(serverDatapackindex);
  if (isNaN(Number(startIndex)) || isNaN(Number(incrementValue)) || startIndex < 0 || incrementValue <= 0) {
    reply.status(400).send({ error: "Invalid range" });
    return;
  }
  if (startIndex + incrementValue > allDatapackKeys.length) {
    incrementValue = allDatapackKeys.length - startIndex;
  }
  const keys = allDatapackKeys.slice(startIndex, startIndex + incrementValue);
  const chunk: DatapackIndex = {};
  for (const key of keys) {
    if (!serverDatapackindex[key]) {
      reply.status(500).send({ error: "Failed to load datapack" });
      return;
    }
    chunk[key] = serverDatapackindex[key]!;
  }
  if (Object.keys(chunk).length === 0) {
    reply.status(404).send({ error: "No datapacks found" });
    return;
  }
  const datapackInfoChunk: DatapackInfoChunk = { datapackIndex: chunk!, totalChunks: allDatapackKeys.length };
  reply.status(200).send(datapackInfoChunk);
};

export const requestDownload = async function requestDownload(
  request: FastifyRequest<{ Params: { filename: string }; Querystring: { needEncryption?: boolean } }>,
  reply: FastifyReply
) {
  const uuid = request.session.get("uuid");
  if (!uuid) {
    reply.status(401).send({ error: "User not logged in" });
    return;
  }
  // for test usage: const uuid = "username";
  const { needEncryption } = request.query;
  const { filename } = request.params;
  const userDir = path.join(assetconfigs.uploadDirectory, uuid);
  const datapackDir = path.join(userDir, "datapacks");
  let filepath = path.join(datapackDir, filename);
  const encryptedFilepathDir = path.join(userDir, "encrypted-datapacks");
  let maybeEncryptedFilepath = path.join(encryptedFilepathDir, filename);
  // check and sanitize filepath
  try {
    filepath = await realpath(path.resolve(filepath));
  } catch (e) {
    reply.status(403).send({ error: "Invalid file path" });
    return;
  }
  maybeEncryptedFilepath = path.resolve(maybeEncryptedFilepath);
  if (!filepath.startsWith(datapackDir) || !maybeEncryptedFilepath.startsWith(encryptedFilepathDir)) {
    reply.status(403).send({ error: "Invalid file path" });
    return;
  }
  if (needEncryption === undefined) {
    try {
      await access(filepath);
      const file = await readFile(filepath);
      reply.send(file);
      return;
    } catch (e) {
      const error = e as NodeJS.ErrnoException;
      if (error.code === "ENOENT") {
        const errormsg = "The file requested " + filename + " does not exist within user's upload directory";
        reply.status(404).send({ error: errormsg });
      } else {
        reply.status(500).send({ error: "An error occurred: " + e });
      }
      return;
    }
  }
  try {
    await access(maybeEncryptedFilepath);
    const file = await readFile(maybeEncryptedFilepath);
    if (await checkHeader(maybeEncryptedFilepath)) {
      reply.send(file);
      return;
    } else {
      await rm(maybeEncryptedFilepath, { force: true });
    }
  } catch (e) {
    const error = e as NodeJS.ErrnoException;
    if (error.code !== "ENOENT") {
      reply.status(500).send({ error: "An error occurred: " + e });
      return;
    }
  }
  try {
    await access(filepath);
    const file = await readFile(filepath);
    if (await checkHeader(filepath)) {
      reply.send(file);
      return;
    }
  } catch (e) {
    const error = e as NodeJS.ErrnoException;
    if (error.code === "ENOENT") {
      const errormsg = "The file requested " + filename + " does not exist within user's upload directory";
      reply.status(404).send({ error: errormsg });
    } else {
      reply.status(500).send({ error: "An error occurred: " + e });
    }
    return;
  }

  try {
    await mkdir(encryptedFilepathDir, { recursive: true });
  } catch (e) {
    reply.status(500).send({ error: "Failed to create encrypted directory with error " + e });
    return;
  }

  try {
    await runJavaEncrypt(assetconfigs.activeJar, filepath, encryptedFilepathDir);
  } catch (e) {
    console.error(e);
    reply.status(500).send({ error: "Failed to encrypt datapacks with error " + e });
    return;
  }

  try {
    await access(maybeEncryptedFilepath);
    const file = await readFile(maybeEncryptedFilepath);

    if (await checkHeader(maybeEncryptedFilepath)) {
      reply.send(file);
      return;
    } else {
      await rm(maybeEncryptedFilepath, { force: true });
      const errormsg =
        "Java file was unable to encrypt the file " + filename + ", resulting in an incorrect encryption header.";
      reply.status(422).send({
        error: errormsg
      });
      return;
    }
  } catch (e) {
    const error = e as NodeJS.ErrnoException;
    if (error.code === "ENOENT") {
      const errormsg = "Java file did not successfully process the file " + filename;
      reply.status(404).send({ error: errormsg });
    } else {
      reply.status(500).send({ error: "An error occurred: " + e });
    }
  }
};

export const fetchServerMapPackInfo = async function fetchServerMapPackInfo(
  request: FastifyRequest<{ Querystring: { start?: number; increment?: number } }>,
  reply: FastifyReply
) {
  const { start = 0, increment = 1 } = request.query;
  const startIndex = Number(start);
  let incrementValue = Number(increment);
  const allMapPackKeys = Object.keys(serverMapPackIndex);
  if (isNaN(Number(startIndex)) || isNaN(Number(incrementValue)) || startIndex < 0 || incrementValue <= 0) {
    reply.status(400).send({ error: "Invalid range" });
    return;
  }
  if (startIndex + incrementValue > allMapPackKeys.length) {
    incrementValue = allMapPackKeys.length - startIndex;
  }
  const keys = allMapPackKeys.slice(startIndex, startIndex + incrementValue);
  const chunk: MapPackIndex = {};
  for (const key of keys) {
    if (!serverMapPackIndex[key]) {
      reply.status(500).send({ error: "Failed to load map pack" });
      return;
    }
    chunk[key] = serverMapPackIndex[key]!;
  }
  if (Object.keys(chunk).length === 0) {
    reply.status(404).send({ error: "No map packs found" });
    return;
  }
  const mapPackInfoChunk: MapPackInfoChunk = { mapPackIndex: chunk!, totalChunks: allMapPackKeys.length };
  reply.status(200).send(mapPackInfoChunk);
};

export const fetchUserDatapacks = async function fetchUserDatapacks(request: FastifyRequest, reply: FastifyReply) {
  // for test usage: const uuid = "username";
  const uuid = request.session.get("uuid");
  if (!uuid) {
    reply.status(401).send({ error: "User not logged in" });
    return;
  }
  const userDir = path.join(assetconfigs.uploadDirectory, uuid);

  try {
    await access(userDir);
    await access(path.join(userDir, "DatapackIndex.json"));
  } catch (e) {
    reply.status(404).send({ error: "User has no uploaded datapacks" });
    return;
  }

  const datapackIndex: DatapackIndex = JSON.parse(JSON.stringify(serverDatapackindex));
  const mapPackIndex: MapPackIndex = JSON.parse(JSON.stringify(serverMapPackIndex));
  try {
    const dataPackData = await readFile(path.join(userDir, "DatapackIndex.json"), "utf8");
    Object.assign(datapackIndex, JSON.parse(dataPackData));
    const mapPackData = await readFile(path.join(userDir, "MapPackIndex.json"), "utf8");
    Object.assign(mapPackIndex, JSON.parse(mapPackData));
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

// If at some point a delete datapack function is needed, this function needs to be modified for race conditions
export const uploadDatapack = async function uploadDatapack(request: FastifyRequest, reply: FastifyReply) {
  const uuid = request.session.get("uuid");
  if (!uuid) {
    reply.status(401).send({ error: "User not logged in" });
    return;
  }
  // for test usage: const uuid = "username";

  async function errorHandler(message: string, errorStatus: number, e?: unknown) {
    e && console.error(e);
    await resetUploadDirectory(filepath, decryptedFilepathDir);
    reply.status(errorStatus).send({ error: message });
  }

  const parts = request.parts();
  const fields: Record<string, string> = {};
  let uploadedFile: MultipartFile | undefined;
  let userDir: string;
  let datapackDir: string;
  let filepath: string = "";
  try {
    userDir = path.join(assetconfigs.uploadDirectory, uuid);
    datapackDir = path.join(userDir, "datapacks");
    await mkdir(datapackDir, { recursive: true });
  } catch (e) {
    reply.status(500).send({ error: "Failed to create user directory with error " + e });
    return;
  }
  try {
    for await (const part of parts) {
      if (part.type === "file") {
        uploadedFile = part;
        filepath = path.join(datapackDir, uploadedFile.filename);
        const fileStream = fs.createWriteStream(filepath);
        try {
          await pump(uploadedFile.file, fileStream);
        } catch (e) {
          await errorHandler("Failed to upload file with error " + e, 500, e);
          return;
        }
        if (uploadedFile.file.truncated) {
          await errorHandler("File too large", 413);
          return;
        }
      } else if (part.type === "field" && typeof part.fieldname === "string" && typeof part.value === "string") {
        fields[part.fieldname] = part.value;
      }
    }
  } catch (e) {
    await errorHandler("Failed to upload file with error " + e, 500, e);
    return;
  }
  if (!uploadedFile) {
    await errorHandler("No file uploaded", 400);
    return;
  }
  const title = fields.title;
  const description = fields.description;
  const authoredBy = fields.authoredBy;
  const contact = fields.contact;
  const notes = fields.notes;
  let references = fields.references;
  let tags = fields.tags;
  if (!tags || !references || !authoredBy || !title || !description ||) {
    await errorHandler("Missing required fields", 400);
    return;
  }
  references = JSON.parse(references);
  tags = JSON.parse(tags);
  if (!Array.isArray(references) || !references.every((ref) => typeof ref === "string")) {
    await errorHandler("References must be an array of strings", 400);
    return;
  }
  if (!Array.isArray(tags) || !tags.every((tag) => typeof tag === "string")) {
    await errorHandler("Tags must be an array of strings", 400);
    return;
  }
  // only accept a binary file (encoded) or an unecnrypted text file or a zip file
  if (
    uploadedFile.mimetype !== "application/octet-stream" &&
    uploadedFile.mimetype !== "text/plain" &&
    uploadedFile.mimetype !== "application/zip"
  ) {
    await errorHandler(`Invalid mimetype of uploaded file, received ${uploadedFile.mimetype}`, 400);
    return;
  }
  const filename = uploadedFile.filename;
  const ext = path.extname(filename);
  const filenameWithoutExtension = path.basename(filename, ext);
  const decryptDir = path.join(userDir, "decrypted");
  const decryptedFilepathDir = path.join(decryptDir, filenameWithoutExtension);
  const mapPackIndexFilepath = path.join(userDir, "MapPackIndex.json");
  const datapackIndexFilepath = path.join(userDir, "DatapackIndex.json");
  const bytes = uploadedFile.file.bytesRead;
  if (bytes === 0) {
    reply.status(400).send({ error: `Empty file cannot be uploaded` });
    return;
  }
  const datapackInfo: DatapackDescriptionInfo = {
    file: filename,
    description: description,
    title: name,
    size: getBytes(bytes)
  };

  if (!/^(\.dpk|\.txt|\.map|\.mdpk)$/.test(ext)) {
    reply.status(415).send({ error: "Invalid file type" });
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
    await errorHandler("Failed to decrypt datapacks with error " + e, 500, e);
    return;
  }
  //verify decrypted directory
  try {
    await access(decryptedFilepathDir);
    await access(path.join(decryptedFilepathDir, "datapacks"));
  } catch (e) {
    await errorHandler("Failed to decrypt file", 500);
    return;
  }

  const datapackIndex: DatapackIndex = {};
  const mapPackIndex: MapPackIndex = {};
  // check for if this user has a datapack index already
  try {
    const data = await readFile(datapackIndexFilepath, "utf-8");
    Object.assign(datapackIndex, JSON.parse(data));
    assertDatapackIndex(datapackIndex);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code != "ENOENT") {
      await errorHandler("Failed to parse DatapackIndex.json", 500, e);
      return;
    }
  }
  // check for if this user has a map index already
  try {
    const data = await readFile(mapPackIndexFilepath, "utf-8");
    Object.assign(mapPackIndex, JSON.parse(data));
    assertMapPackIndex(mapPackIndex);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code != "ENOENT") {
      errorHandler("Failed to parse MapPackIndex.json", 500, e);
      return;
    }
  }
  await loadIndexes(datapackIndex, mapPackIndex, decryptDir.replaceAll("\\", "/"), [datapackInfo], uuid);
  if (!datapackIndex[filename]) {
    await errorHandler("Failed to load decrypted datapack", 500);
    return;
  }
  try {
    await writeFile(datapackIndexFilepath, JSON.stringify(datapackIndex));
    await writeFile(mapPackIndexFilepath, JSON.stringify(mapPackIndex));
  } catch (e) {
    await errorHandler("Failed to save indexes", 500, e);
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
    await errorHandler("Failed to load and write metadata for file", 500, e);
    return;
  }
  reply.status(200).send({ message: "File uploaded" });
};

export const fetchImage = async function (
  request: FastifyRequest<{ Params: { datapackName: string; imageName: string } }>,
  reply: FastifyReply
) {
  const tryReadFile = async (filepath: string) => {
    const root = process.cwd();
    filepath = realpathSync(path.resolve(root, filepath));
    if (!filepath.startsWith(root)) {
      reply.status(403).send({ error: "Invalid file path" });
      return;
    }
    try {
      const file = await readFile(filepath);
      return file;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw e;
    }
  };
  try {
    const imagePath = path.join(
      assetconfigs.decryptionDirectory,
      request.params.datapackName,
      "datapack-images",
      request.params.imageName
    );
    let image = await tryReadFile(imagePath);
    const uuid = request.session.get("uuid");
    if (!image && uuid) {
      const userImagePath = path.join(
        assetconfigs.uploadDirectory,
        uuid,
        "decrypted",
        request.params.datapackName,
        "datapack-images",
        request.params.imageName
      );
      image = await tryReadFile(userImagePath);
    }
    if (!image) {
      reply.status(404).send({ error: "Image not found" });
      return;
    }
    reply.send(image);
  } catch (e) {
    console.error("Error fetching image: ", e);
    reply.status(500).send({ error: "Unknown error" });
  }
};

export const fetchSettingsXml = async function fetchSettingsJson(
  request: FastifyRequest<{ Params: { file: string } }>,
  reply: FastifyReply
) {
  try {
    let { file } = request.params;
    // sanitize and check filepath
    const root = process.cwd();
    file = realpathSync(path.resolve(root, file));
    if (!file.startsWith(root)) {
      reply.status(403).send({ error: "Invalid file path" });
      return;
    }
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
  const root = process.cwd();
  let directory = path.join(assetconfigs.chartsDirectory, hash);
  let filepath = path.join(directory, "chart.svg");
  // sanitize and check filepath
  try {
    directory = await realpath(path.resolve(root, directory));
    filepath = await realpath(path.resolve(root, filepath));
  } catch (e) {
    console.log("reply: ", { ready: false });
    reply.send({ ready: false });
    return;
  }
  if (!directory.startsWith(root) || !filepath.startsWith(root) || !filepath.endsWith("chart.svg")) {
    reply.status(403).send({ error: "Invalid hash" });
    return;
  }
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
  const { useCache } = chartrequest;
  const uuid = request.session.get("uuid");
  const settingsXml = chartrequest.settings;
  // Compute the paths: chart directory, chart file, settings file, and URL equivalent for chart
  const hash = md5(settingsXml + chartrequest.datapacks.join(","));
  const chartDirUrlPath = `/${assetconfigs.chartsDirectory}/${hash}`;
  const chartUrlPath = chartDirUrlPath + "/chart.svg";

  const chartDirFilePath = chartDirUrlPath.slice(1); // no leading slash
  const chartFilePath = chartUrlPath.slice(1);
  const settingsFilePath = chartDirFilePath + "/settings.tsc";

  const userDatapackFilepaths = await glob(`${assetconfigs.uploadDirectory}/${uuid}/datapacks/*`);
  const userDatapackNames = userDatapackFilepaths.map((datapack) => path.basename(datapack));
  const datapacks: string[] = [];
  const userDatapacks = [];
  const serverDatapacks = assetconfigs.activeDatapacks.map((datapack) => datapack.file);

  for (const datapack of chartrequest.datapacks) {
    if (serverDatapacks.includes(datapack)) {
      datapacks.push(`${assetconfigs.datapacksDirectory}/${datapack}`);
    } else if (uuid && userDatapackNames.includes(datapack)) {
      userDatapacks.push(path.join(assetconfigs.uploadDirectory, uuid, "datapacks", datapack));
    } else if (adminconfig.datapacks.some((datapackInfo) => datapackInfo.file === datapack)) {
      datapacks.push(`${assetconfigs.datapacksDirectory}/${datapack}`);
    } else {
      console.log("ERROR: datapack: ", datapack, " is not included in activeDatapacks");
      console.log("assetconfig.activeDatapacks:", assetconfigs.activeDatapacks);
      console.log("chartrequest.datapacks: ", chartrequest.datapacks);
      reply.send({ error: "ERROR: failed to load datapacks" });
    }
  }
  datapacks.push(...userDatapacks);
  // updateFileMetadata(assetconfigs.fileMetadata, userDatapacks);
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
    await mkdir(chartDirFilePath, { recursive: true });
    await writeFile(settingsFilePath, settingsXml);
    console.log("Successfully created and saved chart settings at", settingsFilePath);
  } catch (e) {
    console.log("ERROR: failed to save settings at", settingsFilePath, "  Error was:", e);
    reply.send({ error: "ERROR: failed to save settings" });
    return;
  }
  let errorMessage = ""; // error message found during chart generation via java jar call, "" if no errors found

  // Exec Java command and send final reply to browser
  const execJavaCommand = async (timeout: number) => {
    const args = [
      "-jar",
      assetconfigs.activeJar,
      // Turns off GUI (e.g Suggested Age pop-up (defaults to yes if -a flag is not passed))
      "-node",
      // Add settings:
      "-s",
      settingsFilePath,
      // Save settings to file:
      "-ss",
      settingsFilePath,
      // Add datapacks:
      "-d",
      ...datapacks,
      // Tell it where to save chart
      "-o",
      chartFilePath,
      // Don't use datapacks suggested age (if useSuggestedAge is true then ignore datapack ages)
      "-a"
    ];
    return new Promise<void>((resolve, reject) => {
      const cmd = "java";
      console.log("Calling Java: ", `${cmd} ${args.join(" ")}`);
      const javaProcess = spawn(cmd, args, { timeout, killSignal: "SIGKILL" });
      let stdout = "";
      let stderr = "";
      let error = "";

      javaProcess.stdout.on("data", (data) => {
        stdout += data;
      });

      javaProcess.stderr.on("data", (data) => {
        stderr += data;
      });

      javaProcess.on("error", (err) => {
        error = err.message;
      });

      javaProcess.on("close", (code, signal) => {
        if (signal == "SIGKILL") {
          reject(new Error("Java process timed out"));
        }
        console.log("Java finished, sending reply to browser");
        console.log("Java error param: " + error);
        console.log("Java stdout: " + stdout);
        console.log("Java stderr: " + stderr);

        // Split stdout and stderr into lines
        const stdoutLines = stdout.toString().split("\n");
        const stderrLines = stderr.toString().split("\n");

        if (
          stdoutLines.length >= 2 &&
          stdoutLines[stdoutLines.length - 2] !== "ImageGenerator did not have any errors on generation"
        ) {
          /*  
            Last line is empty, so need to do -2
            Note, this print was placed such that it happens when no fatal errors were caught/the java program did not crash
            in the case that the above statement was not listed, something went wrong
            The below finds the exact issue that cause the crash
          */
          console.log("Java had issues. Checking for specific error message in Java output.");
          // Check for known errors in stdout
          for (const line of stdoutLines) {
            if (containsKnownError(line)) {
              errorMessage = line;
              break;
            }
          }
          // Check for known errors in stderr if not found in stdout
          if (!errorMessage) {
            for (const line of stderrLines) {
              if (containsKnownError(line)) {
                errorMessage = line;
                break;
              }
            }
          }
          // At this point, SOME kind of error happened, but its unknown error because we did not break out
          errorMessage = "Unknown error occurred during chart generation";
        } else {
          console.log("Java did not have issues on generation");
        }

        resolve();
      });
    });
  };

  // Add the execution task to the queue
  if (queue.size >= maxQueueSize) {
    console.log("Queue is full");
    reply.status(503).send({ error: "Service is too busy. Please try again later." });
    return;
  }
  try {
    const priority = uuid ? 1 : 0;
    await queue.add(async () => {
      await execJavaCommand(1000 * 30), { priority };
    });
  } catch (error) {
    if ((error as Error).message.includes("timed out")) {
      console.error("Queue timed out");
      reply.status(408).send({ error: "Request Timeout" });
    } else {
      console.error("Failed to execute Java command:", error);
      reply.status(500).send({ error: "Internal Server Error" });
    }
    return;
  }
  if (errorMessage) {
    console.log("Error found in Java output. Sending error as response");
    console.log(
      "The following failed: ",
      {
        chartpath: chartUrlPath,
        hash: hash
      },
      "because of: ",
      { errorMessage }
    );
    reply.send({ error: errorMessage });
  } else {
    console.log("No error found in Java output. Sending chartpath and hash.");
    console.log("Sending reply to browser: ", {
      chartpath: chartUrlPath,
      hash: hash
    });
    reply.send({ chartpath: chartUrlPath, hash: hash });
  }
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
      .map(([, , stage, ma]) => {
        const age = parseFloat(ma as string);
        return {
          key: stage as string,
          value: age > 10 ? Math.round(age * 100) / 100 : age
        };
      })
      .filter((item) => item.key);
    timescaleData.forEach((data) => assertTimescale(data));

    reply.send({ timescaleData });
  } catch (error) {
    console.error("Error reading Excel file:", error);
    reply.status(500).send({ error: "Internal Server Error" });
  }
};
