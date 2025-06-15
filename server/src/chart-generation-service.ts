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

export function parseJavaOutputLine(line: string): NormalProgress | null {
  if (line.includes("Convert Datapack to sqlite database")) {
    return { stage: "Loading datapacks", percent: 20 };
  } else if (line.includes("Generating Image")) {
    return { stage: "Generating chart", percent: 50 };
  } else if (line.includes("ImageGenerator did not have any errors")) {
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

/**
 * Will fetch a chart with or without the cache
 * Will return the chart path and the hash the chart was saved with
 */
export async function generateChart(
  chartRequest: ChartRequest,
  onProgress: (progress: ChartProgressUpdate) => void,
  uuid?: string
) {
  const { useCache, isCrossPlot } = chartRequest;
  const userId = uuid ? (await findUser({ uuid }))[0]?.userId : undefined;
  const userInActiveWorkshop = userId ? (await getActiveWorkshopsUserIsIn(userId)).length : 0;
  const settingsXml = chartRequest.settings;
  // Compute the paths: chart directory, chart file, settings file, and URL equivalent for chart
  const hash = md5(isCrossPlot + settingsXml + chartRequest.datapacks.join(","));
  const chartDirUrlPath = `/${assetconfigs.chartsDirectory}/${hash}`;
  const chartUrlPath = chartDirUrlPath + "/chart.svg";

  const chartDirFilePath = chartDirUrlPath.slice(1); // no leading slash
  const chartFilePath = chartUrlPath.slice(1);
  const settingsFilePath = chartDirFilePath + "/settings.tsc";

  const datapacksToSendToCommandLine: string[] = [];
  const usedUserDatapackFilepaths: string[] = [];
  const usedTempDatapacks: string[] = [];

  for (const datapack of chartRequest.datapacks) {
    let uuidFolder = uuid;
    switch (datapack.type) {
      case "workshop": {
        const workshopId = getWorkshopIdFromUUID(datapack.uuid);
        if (!userId || !workshopId || !(await isUserInWorkshopAndWorkshopIsActive(userId, workshopId))) {
          throw new Error("ERROR: user does not have access to requested workshop datapack");
        }
        uuidFolder = datapack.uuid;
        break;
      }
      case "official":
        uuidFolder = "official";
        break;
      case "user":
        if (uuid !== datapack.uuid && !datapack.isPublic) {
          throw new Error("ERROR: user does not have access to requested user datapack");
        } else {
          uuidFolder = datapack.uuid;
          break;
        }
      case "temp":
        uuidFolder = "temp";
        break;
    }
    if (!uuidFolder) {
      throw new Error("ERROR: unknown user associated with datapack");
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
    throw new ChartGenerationError("Failed to update file metadata", 100);
  }
  // If this setting already has a chart, just return that
  try {
    await stat(chartFilePath);
    if (!useCache) {
      console.log("Deleting chart filepath since it already exists and cache is not being used");
      deleteDirectory(chartFilePath);
    } else {
      console.log("Request for chart that already exists (hash:", hash, ".  Returning cached version");
      // don't await for this, just send the reply
      if (!isCrossPlot && uuid)
        saveChartHistory(uuid, settingsFilePath, datapacksToSendToCommandLine, chartFilePath, hash).catch((e) => {
          logger.error(`Failed to save chart history for user ${uuid}: ${e}`);
        });
      return { chartpath: chartUrlPath, hash: hash }; // send the browser back the URL equivalent...
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
    throw new Error(`ERROR: failed to save settings at ${settingsFilePath}. Error was: ${e}`);
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
        const lines = data.toString().split("\n");
        for (const line of lines) {
          const status = parseJavaOutputLine(line);
          if (status) {
            onProgress(status);
          }
        }
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
    throw new ChartGenerationError("Queue is too busy", 503);
  }
  try {
    const priority = userInActiveWorkshop ? 2 : uuid ? 1 : 0;
    await queue.add(
      async () => {
        await execJavaCommand(1000 * 30);
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
    throw new ChartGenerationError(errorMessage, 500);
  } else {
    console.log("No error found in Java output. Sending chartpath and hash.");
    console.log("Sending reply to browser: ", {
      chartpath: chartUrlPath,
      hash: hash
    });
    if (!isCrossPlot && uuid)
      // do not await this, just send the reply
      saveChartHistory(uuid, settingsFilePath, datapacksToSendToCommandLine, chartFilePath, hash).catch((e) => {
        logger.error(`Failed to save chart history for user ${uuid}: ${e}`);
      });
    return { chartpath: chartUrlPath, hash: hash };
  }
}
