import type { FastifyRequest, FastifyReply } from "fastify";
import { exec } from "child_process";
import { writeFile, stat, readFile } from "fs/promises";
import {
  DatapackIndex,
  MapPackIndex,
  TimescaleItem,
  assertChartRequest,
  assertDatapackIndex,
  assertIndexResponse,
  assertMapPackIndex
} from "@tsconline/shared";
import { deleteDirectory, resetUploadDirectory } from "./util.js";
import { mkdirp } from "mkdirp";
import md5 from "md5";
import { assetconfigs } from "./index.js";
import svgson from "svgson";
import fs from "fs";
import { assertTimescale } from "@tsconline/shared";
import { parseExcelFile } from "./parse-excel-file.js";
import path from "path";
import pump from "pump";
import { loadIndexes } from "./load-packs.js";

export const fetchUserDatapacks = async function fetchUserDatapacks(
  request: FastifyRequest<{ Params: { username: string } }>,
  reply: FastifyReply
) {
  const { username } = request.params;
  if (!username) {
    reply.status(400).send({ error: "No username provided" });
    return;
  }
  const hash = md5(username);
  const userDir = path.join(assetconfigs.uploadDirectory, hash);
  if (!fs.existsSync(userDir)) {
    reply.status(404).send({ error: "User does not exist" });
    return;
  }
  const datapackIndex: DatapackIndex = {};
  const mapPackIndex: MapPackIndex = {};
  try {
    if (fs.existsSync(path.join(userDir, "DatapackIndex.json"))) {
      Object.assign(datapackIndex, JSON.parse(fs.readFileSync(path.join(userDir, "DatapackIndex.json")).toString()));
    }
    if (fs.existsSync(path.join(userDir, "MapPackIndex.json"))) {
      Object.assign(mapPackIndex, JSON.parse(fs.readFileSync(path.join(userDir, "MapPackIndex.json")).toString()));
    }
  } catch (e) {
    reply.status(500).send({ error: "Failed to load indexes, corrupt json files present. Please contact customer service." });
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
  const { username } = request.params;
  if (!username) {
    reply.status(400).send({ error: "No username provided" });
    return;
  }
  const file = await request.file();
  if (!file) {
    reply.status(404).send({ error: "No file uploaded" });
    return;
  }
  const filename = file.filename;
  const ext = path.extname(filename);
  const filenameWithoutExtension = path.basename(filename, ext);
  const hash = md5(username);
  const userDir = path.join(assetconfigs.uploadDirectory, hash);
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
  if (!fs.existsSync(datapackDir)) {
    fs.mkdirSync(datapackDir, { recursive: true });
  }
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
    resetUploadDirectory(filepath, decryptedFilepathDir);
    reply.status(500).send({ error: "Failed to save file with error: " + e });
    return;
  }
  if (file.file.truncated) {
    resetUploadDirectory(filepath, decryptedFilepathDir);
    reply.status(413).send({ error: "File too large" });
    return;
  }
  try {
    await new Promise<void>((resolve, reject) => {
      const cmd =
        `java -jar ${assetconfigs.decryptionJar} ` +
        // Decrypting these datapacks:
        `-d "${filepath}" ` +
        // Tell it where to send the datapacks
        `-dest ${decryptDir} `;
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
    resetUploadDirectory(filepath, decryptedFilepathDir);
    reply.status(500).send({ error: "Failed to decrypt datapacks with error " + e });
    return;
  }
  if (!fs.existsSync(decryptedFilepathDir) || !fs.existsSync(path.join(decryptedFilepathDir, "datapacks"))) {
    resetUploadDirectory(filepath, decryptedFilepathDir);
    reply.status(500).send({ error: "Failed to decrypt file" });
    return;
  }
  const datapackIndex: DatapackIndex = {};
  const mapPackIndex: MapPackIndex = {};
  // check for if this user has a datapack index already
  if (fs.existsSync(datapackIndexFilepath)) {
    try {
      const data = await readFile(datapackIndexFilepath);
      Object.assign(datapackIndex, JSON.parse(data.toString()));
      assertDatapackIndex(datapackIndex);
    } catch (e) {
      resetUploadDirectory(filepath, decryptedFilepathDir);
      reply.status(500).send({ error: "Failed to parse DatapackIndex.json" });
      return;
    }
  }
  // check for if this user has a map index already
  if (fs.existsSync(mapPackIndexFilepath)) {
    try {
      const data = await readFile(mapPackIndexFilepath);
      Object.assign(mapPackIndex, JSON.parse(data.toString()));
      assertMapPackIndex(mapPackIndex);
    } catch (e) {
      resetUploadDirectory(filepath, decryptedFilepathDir);
      reply.status(500).send({ error: "Failed to parse MapPackIndex.json" });
      return;
    }
  }
  await loadIndexes(datapackIndex, mapPackIndex, decryptDir, [filename]);
  if (!datapackIndex[filename]) {
    resetUploadDirectory(filepath, decryptedFilepathDir);
    reply.status(500).send({ error: "Failed to load decrypted datapack" });
    return;
  }
  try {
    await writeFile(datapackIndexFilepath, JSON.stringify(datapackIndex));
    await writeFile(mapPackIndexFilepath, JSON.stringify(mapPackIndex));
  } catch (e) {
    reply.status(500).send({ error: "Failed to save indexes" });
    resetUploadDirectory(filepath, decryptedFilepathDir);
    return;
  }
  reply.status(200).send({ message: "File uploaded" });
};

export const fetchSettingsXml = async function fetchSettingsJson(
  request: FastifyRequest<{ Params: { settingFile: string } }>,
  reply: FastifyReply
) {
  try {
    const { settingFile } = request.params;
    //TODO: differentiate between preset and user uploaded datpack
    const settingsXml = (await readFile(`${decodeURIComponent(settingFile)}`)).toString();
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
export const fetchChart = async function fetchChart(
  request: FastifyRequest<{
    Params: { usecache: string; useSuggestedAge: string };
  }>,
  reply: FastifyReply
) {
  //TODO change this to be in request body
  const usecache = request.params.usecache === "true";
  const useSuggestedAge = request.params.useSuggestedAge === "true";
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
  const settingsXml = chartrequest.settings;
  //console.log(settingsXml);
  // const settingsXml = jsonToXml(
  //   chartrequest.settings,
  //   chartrequest.columnSettings
  // );
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
    if (!usecache) {
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
  const datapacks = chartrequest.datapacks.map(
    (datapack) => '"' + assetconfigs.datapacksDirectory + "/" + datapack + '"'
  );
  for (const datapack of chartrequest.datapacks) {
    if (!assetconfigs.activeDatapacks.includes(datapack)) {
      console.log("ERROR: datapack: ", datapack, " is not included in activeDatapacks");
      console.log("assetconfig.activeDatapacks:", assetconfigs.activeDatapacks);
      console.log("chartrequest.datapacks: ", chartrequest.datapacks);
      reply.send({ error: "ERROR: failed to load datapacks" });
      return;
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
