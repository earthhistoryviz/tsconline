import type { FastifyRequest, FastifyReply } from "fastify";
import { exec } from "child_process";
import { writeFile, stat, readFile, access } from "fs/promises";
import {
  DatapackIndex,
  DatapackInfoChunk,
  MapPackIndex,
  MapPackInfoChunk,
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
import { updateFileMetadata, writeFileMetadata } from "./file-metadata-handler.js";
import { datapackIndex as serverDatapackindex, mapPackIndex as serverMapPackIndex } from "./index.js";
import { glob } from "glob";

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
export const requestDownload = async function requestDownload(request: FastifyRequest<{ Params: { needEncryption: string, filePath: string, datapackDir: string } }>, reply: FastifyReply) {
  const { needEncryption } = request.params;
  const { filePath } = request.params;
  const { datapackDir } = request.params;
  if (needEncryption) {
    try {
      await new Promise<void>((resolve, reject) => {
        const cmd =
          `java -jar ${assetconfigs.activeJar} ` +
          // datapacks:
          `-d "${filePath.replaceAll("\\", "/")}" ` +
          // Tell it where to send the datapacks
          `-enc ${datapackDir.replaceAll("\\", "/")} ` +
          `-node`;

        // java -jar <jar file> -d <datapack> <datapack> -enc <destination directory> -node
        console.log("Calling Java encrypt.jar: ", cmd);
        exec(cmd, function (error, stdout, stderror) {
          console.log("Java encrypt.jar finished, sending reply to browser");
          if (error) {
            console.error("Java error param: " + error);
            console.error("Java stderr: " + stderror.toString());
            resolve();
          } else {
            console.log("Java stdout: " + stdout.toString());
            resolve();
          }
        });
      });
    } catch (e) {
      console.error(e);
      reply.status(500).send({ error: "Failed to encrypt datapacks with error " + e });
      return;
    }
  }
  //TODO: finish download. Encypted download -> Encrypted file path; Normal download -> original file path;
}

export const loadActiveDatapacks = async function loadActiveDatapacks(request: FastifyRequest, reply: FastifyReply) {
  const activeDatapacks = assetconfigs.activeDatapacks;
  reply.status(200).send({ activeDatapacks });
  return;
}


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
  const file = await request.file();
  if (!file) {
    reply.status(404).send({ error: "No file uploaded" });
    return;
  }
  // only accept a binary file (encoded) or an unecnrypted text file or a zip file
  if (file.mimetype !== "application/octet-stream" && file.mimetype !== "text/plain" && file.mimetype !== "application/zip") {
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
  async function errorHandler(message: string, errorStatus: number, e?: unknown) {
    e && console.error(e);
    await resetUploadDirectory(filepath, decryptedFilepathDir);
    reply.status(errorStatus).send({ error: message });
  }
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
    await errorHandler("Failed to save file with error: " + e, 500, e);
    return;
  }
  if (file.file.truncated) {
    await errorHandler("File too large", 413);
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
  await loadIndexes(datapackIndex, mapPackIndex, decryptDir.replaceAll("\\", "/"), [filename]);
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
  const tryReadFile = async (path: string) => {
    try {
      const file = await readFile(path);
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
  const datapacks = [];
  const userDatapacks = [];

  for (const datapack of chartrequest.datapacks) {
    if (assetconfigs.activeDatapacks.includes(datapack)) {
      datapacks.push(`"${assetconfigs.datapacksDirectory}/${datapack}"`);
    } else if (uuid && userDatapackNames.includes(datapack)) {
      userDatapacks.push(path.join(assetconfigs.uploadDirectory, uuid, "datapacks", datapack));
    } else {
      console.log("ERROR: datapack: ", datapack, " is not included in activeDatapacks");
      console.log("assetconfig.activeDatapacks:", assetconfigs.activeDatapacks);
      console.log("chartrequest.datapacks: ", chartrequest.datapacks);
      reply.send({ error: "ERROR: failed to load datapacks" });
    }
  }
  datapacks.push(...userDatapacks);
  updateFileMetadata(assetconfigs.fileMetadata, userDatapacks);
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
    `-s ${settingsFilePath} ` +
    // Save settings to file:
    `-ss ${settingsFilePath} ` +
    // Add datapacks:
    `-d ${datapacks.join(" ")} ` +
    // Tell it where to save chart
    `-o ${chartFilePath} ` +
    // Don't use datapacks suggested age (if useSuggestedAge is true then ignore datapack ages)
    `-a`;

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
