import { ChartProgressUpdate, ChartRequest, NormalProgress, isTempDatapack, isUserDatapack } from "@tsconline/shared";
import { spawn } from "child_process";
import md5 from "md5";
import path from "path";
import { readFile, writeFile, stat, mkdir } from "fs/promises";
import { containsKnownError } from "./chart-error-handler.js";
import { findUser, getActiveWorkshopsUserIsIn, isUserInWorkshopAndWorkshopIsActive } from "./database.js";
import logger from "./error-logger.js";
import { updateFileMetadata } from "./file-metadata-handler.js";
import { saveChartHistory } from "./user/chart-history.js";
import { fetchUserDatapackDirectory } from "./user/fetch-user-files.js";
import { deleteUserDatapack } from "./user/user-handler.js";
import { checkFileExists, assetconfigs, deleteDirectory } from "./util.js";
import { getWorkshopIdFromUUID } from "./workshop/workshop-util.js";
import svgson from "svgson";
import { queue, maxQueueSize } from "./index.js";

export class ChartGenerationError extends Error {
  public errorCode: number;

  constructor(message: string, errorCode: number) {
    super(message);
    this.errorCode = errorCode;
  }
}

export function parseJavaOutputLine(line: string, filenameMap: Record<string, string>): NormalProgress | null {
  if (line.includes("Convert Datapack to sqlite database")) {
    return { stage: "Loading Datapacks", percent: 10 };
  }
  const loadMatch = line.match(/Loading datapack \[(\d+)\/(\d+)\]:\s*(.+)/);
  if (loadMatch && loadMatch[1] && loadMatch[2] && loadMatch[3]) {
    const current = parseInt(loadMatch[1], 10);
    const total = parseInt(loadMatch[2], 10);
    const filename = loadMatch[3].trim();
    const displayName = filenameMap[filename] || filename;
    const percent = 10 + Math.floor((current / total) * 30);
    return { stage: `Loading Datapack: ${displayName} (${current}/${total})`, percent };
  }
  if (line.includes("Generating Image")) {
    return { stage: "Generating chart", percent: 50 };
  }
  if (line.includes("ImageGenerator did not have any errors")) {
    return { stage: "Waiting for file", percent: 90 };
  }
  return null;
}

/**
 * Waits until the SVG file exists and is fully written.
 *
 * The Java process may exit before the SVG file is fully written and readable.
 * This function will wait for the file to exist and be parseable as SVG.
 *
 * Throws if the file is not ready within the specified timeout.
 *
 * @param filepath The full path to the SVG file.
 * @param timeoutMs Maximum time to wait for the file to be ready.
 */
export async function waitForSVGReady(filepath: string, timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await checkFileExists(filepath)) {
      const content = await readFile(filepath);
      if (svgson.parseSync(content.toString())) {
        return;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error("SVG file did not finalize in time");
}

async function resolveDatapacks(chartRequest: ChartRequest, uuid?: string) {
  const datapacksToSendToCommandLine: string[] = [];
  const usedUserDatapackFilepaths: string[] = [];
  const usedTempDatapacks: string[] = [];
  const filenameMap: Record<string, string> = {};
  const userId = uuid ? (await findUser({ uuid }))[0]?.userId : undefined;

  for (const datapack of chartRequest.datapacks) {
    let uuidFolder = uuid;
    switch (datapack.type) {
      case "workshop": {
        const workshopId = getWorkshopIdFromUUID(datapack.uuid);
        if (!userId || !workshopId || !(await isUserInWorkshopAndWorkshopIsActive(userId, workshopId))) {
          throw new Error("User lacks access to workshop datapack");
        }
        uuidFolder = datapack.uuid;
        break;
      }
      case "official":
        uuidFolder = "official";
        break;
      case "user":
        if (uuid !== datapack.uuid && !datapack.isPublic) throw new Error("Unauthorized user datapack access");
        uuidFolder = datapack.uuid;
        break;
      case "temp":
        uuidFolder = "temp";
        break;
    }
    if (!uuidFolder) throw new Error("Unknown user for datapack");
    const datapackDir = await fetchUserDatapackDirectory(uuidFolder, datapack.title);
    if (isUserDatapack(datapack)) usedUserDatapackFilepaths.push(datapackDir);
    if (isTempDatapack(datapack)) usedTempDatapacks.push(datapack.title);
    datapacksToSendToCommandLine.push(path.join(datapackDir, datapack.storedFileName));
    filenameMap[datapack.storedFileName] = datapack.title;
  }
  return { datapacksToSendToCommandLine, usedUserDatapackFilepaths, usedTempDatapacks, filenameMap };
}

async function checkForCacheHit(
  chartFilePath: string,
  useCache: boolean,
  chartUrlPath: string,
  hash: string
): Promise<{ chartpath: string; hash: string } | null> {
  try {
    await stat(chartFilePath);
    if (!useCache) {
      console.log("Deleting chart filepath since it already exists and cache is not being used");
      deleteDirectory(chartFilePath);
    } else {
      console.log("Request for chart that already exists (hash:", hash, ".  Returning cached version");
      return { chartpath: chartUrlPath, hash };
    }
  } catch {
    // File does not exist, continue with chart generation
    console.log("Chart file does not exist, proceeding with generation");
  }
  return null;
}

async function writeChartSettings(settingsFilePath: string, chartDirFilePath: string, settingsXml: string) {
  await mkdir(chartDirFilePath, { recursive: true });
  await writeFile(settingsFilePath, settingsXml);
}

async function runJavaChartGeneration(
  chartRequest: ChartRequest,
  datapacks: string[],
  settingsFile: string,
  outputFile: string,
  filenameMap: Record<string, string>,
  onProgress: (p: ChartProgressUpdate) => void
) {
  const args = [
    "-jar",
    assetconfigs.activeJar,
    "-node",
    "-s",
    settingsFile,
    "-ss",
    settingsFile,
    "-d",
    ...datapacks,
    "-o",
    outputFile,
    "-a",
    ...(chartRequest.isCrossPlot ? ["-cross"] : [])
  ];

  let knownErrorCode = 0;
  let errorMessage = "";

  await new Promise<void>((resolve, reject) => {
    const javaProcess = spawn("java", args, { timeout: 30000, killSignal: "SIGKILL" });
    let stdout = "",
      stderr = "",
      leftover = "";

    javaProcess.stdout.on("data", (data) => {
      const combined = leftover + data.toString();
      const lines = combined.split("\n");
      leftover = lines.pop() ?? "";
      for (const line of lines) {
        const status = parseJavaOutputLine(line, filenameMap);
        if (status) onProgress(status);
      }
      stdout += data;
    });

    javaProcess.stdout.on("end", () => {
      if (leftover) {
        const status = parseJavaOutputLine(leftover, filenameMap);
        if (status) onProgress(status);
      }
    });

    javaProcess.stderr.on("data", (data) => (stderr += data));

    javaProcess.on("error", (err) => {
      reject(new Error("Failed to spawn Java process: " + err.message));
    });

    javaProcess.on("close", (_code, signal) => {
      if (signal === "SIGKILL") return reject(new Error("Java process timed out"));
      console.log("Java finished, sending reply to browser");
      console.log("Java stdout: " + stdout);
      console.log("Java stderr: " + stderr);

      const stdoutLines = stdout.split("\n");
      const stderrLines = stderr.split("\n");

      if (stdoutLines.at(-2) !== "ImageGenerator did not have any errors on generation") {
        /*  
          Last line is empty, so need to do -2
          Note, this print was placed such that it happens when no fatal errors were caught/the java program did not crash
          in the case that the above statement was not listed, something went wrong
          The below finds the exact issue that cause the crash
        */
        console.log("Java had issues. Checking for specific error message in Java output.");
        for (const line of stdoutLines.concat(stderrLines)) {
          knownErrorCode = containsKnownError(line);
          if (knownErrorCode) {
            errorMessage = line;
            break;
          }
        }
        if (!knownErrorCode) {
          knownErrorCode = 1005;
          errorMessage = "Unknown error occurred during chart generation";
        }
      } else {
        console.log("Java did not have issues on generation");
      }
      resolve();
    });
  });

  return { knownErrorCode, errorMessage };
}

function cleanupTempDatapacks(tempDatapacks: string[]) {
  tempDatapacks.forEach((dp) => {
    deleteUserDatapack("temp", dp).catch((e) => {
      logger.error(`Failed to delete temporary datapack ${dp}: ${e}`);
    });
  });
}

export async function generateChart(
  chartRequest: ChartRequest,
  onProgress: (p: ChartProgressUpdate) => void,
  uuid?: string
) {
  const { useCache, isCrossPlot, settings } = chartRequest;
  const hash = md5(isCrossPlot + settings + chartRequest.datapacks.join(","));
  const userId = uuid ? (await findUser({ uuid }))[0]?.userId : undefined;
  const isInWorkshop = userId ? (await getActiveWorkshopsUserIsIn(userId)).length : 0;
  const chartDir = path.join(assetconfigs.chartsDirectory, hash);
  const chartFile = path.join(chartDir, "chart.svg");
  const settingsFile = path.join(chartDir, "settings.tsc");
  const chartUrlPath = `/${assetconfigs.chartsDirectory}/${hash}/chart.svg`;

  const { datapacksToSendToCommandLine, usedUserDatapackFilepaths, usedTempDatapacks, filenameMap } =
    await resolveDatapacks(chartRequest, uuid);

  await updateFileMetadata(assetconfigs.fileMetadata, usedUserDatapackFilepaths).catch(() => {
    throw new ChartGenerationError("Failed to update file metadata", 100);
  });

  const cached = await checkForCacheHit(chartFile, useCache, chartUrlPath, hash);
  if (cached) {
    if (!isCrossPlot && uuid) {
      // do not await this, let it run in the background
      saveChartHistory(uuid, settingsFile, datapacksToSendToCommandLine, chartFile, hash).catch((e) => {
        logger.error(`Failed to save chart history for user ${uuid}: ${e}`);
      });
    }
    return cached;
  }

  await writeChartSettings(settingsFile, chartDir, settings);
  console.log("Successfully created and saved chart settings at", settingsFile);

  if (queue.size >= maxQueueSize) throw new ChartGenerationError("Queue is too busy", 503);

  let knownErrorCode = 0;
  let errorMessage = "";

  try {
    const priority = isInWorkshop ? 2 : uuid ? 1 : 0;
    await queue.add(
      async () => {
        const result = await runJavaChartGeneration(
          chartRequest,
          datapacksToSendToCommandLine,
          settingsFile,
          chartFile,
          filenameMap,
          onProgress
        );
        knownErrorCode = result.knownErrorCode;
        errorMessage = result.errorMessage;
      },
      { priority }
    );
  } catch (error) {
    if ((error as Error).message.includes("timed out")) {
      console.error("Queue timed out");
      throw new ChartGenerationError("Queue timed out", 408);
    } else {
      console.error("Failed to execute Java command:", error);
      throw new ChartGenerationError("Failed to execute Java command", 400);
    }
  } finally {
    cleanupTempDatapacks(usedTempDatapacks);
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
    throw new ChartGenerationError(errorMessage, 500);
  }

  console.log("No error found in Java output. Sending chartpath and hash.");
  console.log("Sending reply to browser: ", {
    chartpath: chartUrlPath,
    hash: hash
  });
  if (!isCrossPlot && uuid)
    // do not await this, let it run in the background
    saveChartHistory(uuid, settingsFile, datapacksToSendToCommandLine, chartFile, hash).catch((e) => {
      logger.error(`Failed to save chart history for user ${uuid}: ${e}`);
    });
  return { chartpath: chartUrlPath, hash: hash };
}
