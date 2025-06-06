import type { FastifyRequest, FastifyReply } from "fastify";
import { spawn } from "child_process";
import { writeFile, stat, readFile, mkdir, realpath } from "fs/promises";
import {
  TimescaleItem,
  assertChartRequest,
  assertTimescale,
  DatapackMetadata,
  isUserDatapack,
  isTempDatapack
} from "@tsconline/shared";
import {
  deleteDirectory,
  assetconfigs,
  verifyFilepath,
  checkFileExists,
  extractMetadataFromDatapack,
  isFileTypeAllowed,
  uploadFileToGitHub
} from "../util.js";
import { getWorkshopIdFromUUID } from "../workshop/workshop-util.js";
import md5 from "md5";
import svgson from "svgson";
import fs, { realpathSync } from "fs";
import { parseExcelFile } from "../parse-excel-file.js";
import path from "path";
import { updateFileMetadata } from "../file-metadata-handler.js";
import { queue, maxQueueSize } from "../index.js";
import { containsKnownError } from "../chart-error-handler.js";
import { fetchUserDatapackDirectory } from "../user/fetch-user-files.js";
import { findUser, getActiveWorkshopsUserIsIn, isUserInWorkshopAndWorkshopIsActive } from "../database.js";
import { deleteUserDatapack, fetchUserDatapack } from "../user/user-handler.js";
import { loadPublicUserDatapacks } from "../public-datapack-handler.js";
import { fetchDatapackProfilePictureFilepath, fetchMapPackImageFilepath } from "../upload-handlers.js";
import { saveChartHistory } from "../user/chart-history.js";
import logger from "../error-logger.js";
import "dotenv/config";

export const submitBugReport = async function submitBugReport(request: FastifyRequest, reply: FastifyReply) {
  const parts = request.parts();
  let title = "";
  let description = "";
  let email = "";
  const files: { filename: string; buffer: Buffer }[] = [];
  const owner = "earthhistoryviz";

  const allowedExtensions = ["png", "jpg", "jpeg", "gif", "svg", "txt", "log", "json", "csv"];
  const allowedMimeTypes = [
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/svg+xml",
    "text/plain",
    "application/json",
    "text/csv"
  ];
  try {
    for await (const part of parts) {
      if (part.type === "file") {
        if (part.file.truncated) {
          reply.status(400).send({ error: "File size exceeds the limit" });
          return;
        }
        const { filename, mimetype } = part;
        if (!isFileTypeAllowed(filename, mimetype, allowedExtensions, allowedMimeTypes)) {
          reply.status(400).send({ error: "Invalid file type" });
          return;
        }
        const buffer = await part.toBuffer();
        files.push({ filename, buffer });
      } else if (part.type === "field") {
        if (part.fieldname === "title") title = (part.value as string).trim();
        else if (part.fieldname === "description") description = (part.value as string).trim();
        else if (part.fieldname === "email") email = (part.value as string).trim();
      }
    }
    if (!title || !description) {
      reply.status(400).send({ error: "Title and description are required" });
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const baseUploadPath = `bug-reports/${timestamp}-${Math.random().toString(36).slice(2, 4)}`;
    const uploadedFileLinks: string[] = [];
    for (const { filename, buffer } of files) {
      const link = await uploadFileToGitHub(owner, "tsconline-bug-reports", baseUploadPath, filename, buffer);
      const isImage = /\.(png|jpe?g|gif|svg)$/i.test(filename);
      uploadedFileLinks.push(isImage ? `![${filename}](${link})` : `- [${filename}](${link})`);
    }

    const issueTitle = `Bug Report: ${title}`;
    const issueBody = [
      "## Description",
      description,
      uploadedFileLinks.length > 0 ? `## Attachments\n\n${uploadedFileLinks.join("\n")}` : "",
      email ? `## Contact Email\n\n${email}` : ""
    ].join("\n\n");
    const response = await fetch(`https://api.github.com/repos/${owner}/tsconline/issues`, {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${process.env.GH_ISSUES_TOKEN}`
      },
      body: JSON.stringify({
        title: issueTitle,
        body: issueBody,
        labels: ["bug", "user-report"],
        assignees: ["JimOggPurdue"]
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Error submitting bug report:", errorText);
      reply.status(500).send({ error: "Failed to submit bug report" });
      return;
    }
    reply.send({ message: "Bug report submitted successfully" });
  } catch (error) {
    logger.error("Error processing bug report:", error);
    reply.status(500).send({ error: "Internal Server Error" });
  }
};

/**
 * Fetches the official datapack with the given name if it is public
 * @param request
 * @param reply
 * @returns
 */
export const fetchPublicOfficialDatapack = async function fetchPublicOfficialDatapack(
  request: FastifyRequest<{ Params: { name: string } }>,
  reply: FastifyReply
) {
  const { name } = request.params;
  if (!name) {
    reply.status(400).send({ error: "Invalid datapack" });
    return;
  }
  const officialDatapack = await fetchUserDatapack("official", name);
  if (!officialDatapack) {
    reply.status(404).send({ error: "Datapack not found" });
    return;
  }
  if (!officialDatapack.isPublic) {
    reply.status(403).send({ error: "Datapack is not public" });
    return;
  }
  reply.send(officialDatapack);
};

export const fetchPublicDatapacksMetadata = async function fetchPublicDatapacksMetadata(
  _request: FastifyRequest,
  reply: FastifyReply
) {
  const datapackArray = await loadPublicUserDatapacks();
  const datapackMetadata: DatapackMetadata[] = datapackArray.map((datapack) => {
    return extractMetadataFromDatapack(datapack);
  });
  reply.send(datapackMetadata);
};

export const fetchImage = async function (request: FastifyRequest, reply: FastifyReply) {
  const tryReadFile = async (filepath: string) => {
    if (!(await verifyFilepath(filepath))) {
      reply.status(403).send({ error: "Invalid file path" });
      return;
    }
    try {
      const file = await readFile(filepath);
      return file;
    } catch (e) {
      if (e instanceof Error && (e as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw e;
    }
  };
  try {
    const { isPublic, datapackTitle, datapackFilename, imageName, uuid } = request.body as {
      datapackTitle: string;
      datapackFilename: string;
      imageName: string;
      uuid: string;
      isPublic: boolean;
    };
    if (!datapackTitle || !imageName || !datapackFilename || !uuid || !isPublic) {
      reply.status(400).send({ error: "Invalid request" });
    }
    const datapackDir = await fetchUserDatapackDirectory(uuid, datapackTitle);
    // uuid can be server or workshop
    const imagePath = path.join(
      datapackDir,
      "decrypted",
      path.parse(datapackFilename).name,
      "datapack-images",
      imageName
    );
    const image = await tryReadFile(imagePath);
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
  const { useCache, isCrossPlot } = chartrequest;
  const uuid = request.session.get("uuid");
  const userId = (await findUser({ uuid }))[0]?.userId;
  const userInActiveWorkshop = userId ? (await getActiveWorkshopsUserIsIn(userId)).length : 0;
  const settingsXml = chartrequest.settings;
  // Compute the paths: chart directory, chart file, settings file, and URL equivalent for chart
  const hash = md5(isCrossPlot + settingsXml + chartrequest.datapacks.join(","));
  const chartDirUrlPath = `/${assetconfigs.chartsDirectory}/${hash}`;
  const chartUrlPath = chartDirUrlPath + "/chart.svg";

  const chartDirFilePath = chartDirUrlPath.slice(1); // no leading slash
  const chartFilePath = chartUrlPath.slice(1);
  const settingsFilePath = chartDirFilePath + "/settings.tsc";

  const datapacksToSendToCommandLine: string[] = [];
  const usedUserDatapackFilepaths: string[] = [];
  const usedTempDatapacks: string[] = [];

  for (const datapack of chartrequest.datapacks) {
    let uuidFolder = uuid;
    switch (datapack.type) {
      case "workshop": {
        const workshopId = getWorkshopIdFromUUID(datapack.uuid);
        if (!userId || !workshopId || !(await isUserInWorkshopAndWorkshopIsActive(userId, workshopId))) {
          reply.send({ error: "ERROR: user does not have access to requested workshop datapack" });
          return;
        }
        uuidFolder = datapack.uuid;
        break;
      }
      case "official":
        uuidFolder = "official";
        break;
      case "user":
        if (uuid !== datapack.uuid && !datapack.isPublic) {
          reply.send({ error: "ERROR: user does not have access to requested datapack" });
          return;
        } else {
          uuidFolder = datapack.uuid;
          break;
        }
      case "temp":
        uuidFolder = "temp";
        break;
    }
    if (!uuidFolder) {
      reply.send({ error: "ERROR: unknown user associated with datapack" });
      return;
    }
    const datapackDir = await fetchUserDatapackDirectory(uuidFolder, datapack.title);
    if (isUserDatapack(datapack)) {
      usedUserDatapackFilepaths.push(datapackDir);
    }
    if (isTempDatapack(datapack)) {
      usedTempDatapacks.push(datapack.title);
    }
    datapacksToSendToCommandLine.push(path.join(datapackDir, datapack.storedFileName));
  }
  try {
    // update file metadata for all used datapacks (recently used datapacks will be updated)
    await updateFileMetadata(assetconfigs.fileMetadata, usedUserDatapackFilepaths);
  } catch (e) {
    console.error("Error updating file metadata:", e);
    reply.status(500).send({ errorCode: 100, error: "Internal Server Error" });
    return;
  }
  // If this setting already has a chart, just return that
  try {
    await stat(chartFilePath);
    if (!useCache) {
      console.log("Deleting chart filepath since it already exists and cache is not being used");
      deleteDirectory(chartFilePath);
    } else {
      console.log("Request for chart that already exists (hash:", hash, ".  Returning cached version");
      reply.send({ chartpath: chartUrlPath, hash: hash }); // send the browser back the URL equivalent...
      // after sending, save to history if user is logged in
      if (!isCrossPlot && uuid)
        await saveChartHistory(uuid, settingsFilePath, datapacksToSendToCommandLine, chartFilePath, hash).catch((e) => {
          logger.error(`Failed to save chart history for user ${uuid}: ${e}`);
        });
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
  let knownErrorCode = 0; // known error found during chart generation via java jar call, 0 means no error
  let errorMessage = "";

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
      ...datapacksToSendToCommandLine,
      // Tell it where to save chart
      "-o",
      chartFilePath,
      // Don't use datapacks suggested age (if useSuggestedAge is true then ignore datapack ages)
      "-a",
      ...(isCrossPlot ? ["-cross"] : [])
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
          return;
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
            knownErrorCode = containsKnownError(line);
            if (knownErrorCode) {
              errorMessage = line;
              break;
            }
          }
          // Check for known errors in stderr if not found in stdout
          if (!knownErrorCode) {
            for (const line of stderrLines) {
              knownErrorCode = containsKnownError(line);
              if (knownErrorCode) {
                errorMessage = line;
                break;
              }
            }
          }
          if (!knownErrorCode) {
            // At this point, SOME kind of error happened, but its unknown error because we did not break out
            knownErrorCode = 1005;
            errorMessage = "Unknown error occurred during chart generation";
          }
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
    const priority = userInActiveWorkshop ? 2 : uuid ? 1 : 0;
    await queue.add(async () => {
      await execJavaCommand(1000 * 30), { priority };
    });
  } catch (error) {
    if ((error as Error).message.includes("timed out")) {
      console.error("Queue timed out");
      reply.status(408).send({ error: "Request Timeout" });
    } else {
      console.error("Failed to execute Java command:", error);
      reply.status(500).send({ errorCode: 400, error: "Internal Server Error" });
    }
    return;
  } finally {
    // delete all temporary datapacks after used in chart generation
    usedTempDatapacks.forEach((datapack) => {
      deleteUserDatapack("temp", datapack).catch((e) => {
        logger.error(`Failed to delete temporary datapack ${datapack}: ${e}`);
      });
    });
  }
  if (knownErrorCode) {
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
    reply.status(500).send({ errorCode: knownErrorCode, error: errorMessage });
  } else {
    console.log("No error found in Java output. Sending chartpath and hash.");
    console.log("Sending reply to browser: ", {
      chartpath: chartUrlPath,
      hash: hash
    });
    reply.send({ chartpath: chartUrlPath, hash: hash });
  }
  // after sending, save to history if user is logged in
  if (!isCrossPlot && uuid)
    await saveChartHistory(uuid, settingsFilePath, datapacksToSendToCommandLine, chartFilePath, hash).catch((e) => {
      logger.error(`Failed to save chart history for user ${uuid}: ${e}`);
    });
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

    const excelData: string[][] = await parseExcelFile(filePath, 2);
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

export const fetchDatapackCoverImage = async function (
  request: FastifyRequest<{ Params: { title: string; uuid: string } }>,
  reply: FastifyReply
) {
  const { title, uuid } = request.params;
  const defaultFilepath = path.join(assetconfigs.datapackImagesDirectory, "default.png");
  try {
    if (title === "") {
      if (!(await checkFileExists(defaultFilepath))) {
        reply.status(404).send({ error: "Default image not found" });
        return;
      }
      reply.send(await readFile(defaultFilepath));
      return;
    }
    const uniqueImageFilepath = await fetchDatapackProfilePictureFilepath(decodeURIComponent(uuid), title);
    if (!uniqueImageFilepath || !(await checkFileExists(uniqueImageFilepath))) {
      if (!(await checkFileExists(defaultFilepath))) {
        reply.status(404).send({ error: "Default image not found" });
        return;
      }
      reply.send(await readFile(defaultFilepath));
      return;
    }
    reply.send(await readFile(uniqueImageFilepath));
  } catch (e) {
    try {
      if (await checkFileExists(defaultFilepath)) {
        reply.send(await readFile(defaultFilepath));
        return;
      }
    } catch (e) {
      // eslint-disable-next-line no-console
    }
    console.error("Error fetching image: ", e);
    reply.status(500).send({ error: "Internal Server Error" });
  }
};

export async function fetchMapImages(
  request: FastifyRequest<{ Params: { title: string; uuid: string; img: string } }>,
  reply: FastifyReply
) {
  try {
    const { title, uuid, img } = request.params;
    const path = await fetchMapPackImageFilepath(decodeURIComponent(uuid), title, img);
    if (!path) {
      return reply.status(404).send({ error: "Image not found" });
    }
    reply.send(await readFile(path));
  } catch (err) {
    console.error(err);
    reply.status(500).send({ error: "Internal Server Error" });
  }
}
