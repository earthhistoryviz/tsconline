import { ChartRequest, ChartProgressUpdate } from "@tsconline/shared";
import md5 from "md5";
import path from "path";
import { resolveDatapacks, checkForCacheHit, runJavaChartGeneration } from "./generate-chart-helpers.js";
import { findUser, getActiveWorkshopsUserIsIn } from "../database.js";
import logger from "../error-logger.js";
import { updateFileMetadata } from "../file-metadata-handler.js";
import { saveChartHistory } from "../user/chart-history.js";
import { assetconfigs } from "../util.js";
import { queue, maxQueueSize } from "../index.js";
import { deleteUserDatapack } from "../user/user-handler.js";
import { mkdir, writeFile } from "fs/promises";
import fs from "fs";

export class ChartGenerationError extends Error {
  public errorCode: number;

  constructor(message: string, errorCode: number) {
    super(message);
    this.errorCode = errorCode;
  }
}

async function exists(pathToCheck: string): Promise<boolean> {
  return fs.promises
    .access(pathToCheck)
    .then(() => true)
    .catch(() => false);
}

export type ChartGenerationMode = "chart" | "chart-no-settings";
export async function generateChart(
  chartRequest: ChartRequest,
  onProgress: (p: ChartProgressUpdate) => void,
  uuid?: string,
  mode: ChartGenerationMode = "chart",
  datapackTitle?: string
) {
  // If running in setting mode, the settings variable is a placeholder because settings.tsc not actually been made
  const { useCache, isCrossPlot, settings } = chartRequest;
  const hash = md5(isCrossPlot + settings + chartRequest.datapacks.join(","));
  const userId = uuid ? (await findUser({ uuid }))[0]?.userId : undefined;
  const isInWorkshop = userId ? (await getActiveWorkshopsUserIsIn(userId)).length : 0;

  const chartDir = path.join(assetconfigs.chartsDirectory, hash);
  const chartFile = path.join(chartDir, "chart.svg");
  const settingsFile = path.join(chartDir, "settings.tsc");
  const chartUrlPath = `/${assetconfigs.chartsDirectory}/${hash}/chart.svg`;

  await fs.promises.mkdir(chartDir, { recursive: true });

  let datapacksToSendToCommandLine: string[] = [];
  let usedUserDatapackFilepaths: string[] = [];
  let usedTempDatapacks: string[] = [];
  let filenameMap: Record<string, string> = {};

  if (mode === "chart-no-settings") {
    if (!datapackTitle) {
      throw new Error("datapackTitle is required in settings mode");
    }

    const root = `${assetconfigs.publicDatapacksDirectory}/official/datapacks`;
    const baseFolderPath = path.join(root, datapackTitle, "decrypted");
    if (!(await exists(baseFolderPath))) throw new Error(`Datapack folder does not exist: ${baseFolderPath}`);

    // Find the first temp__* folder
    // Regex reads contents at the baseFolderPath, and stores each name into array, then it tests each
    // to see if it starts with the word temp
    const entries = await fs.promises.readdir(baseFolderPath);
    const tempFolder = entries.find((name) => /^temp__/.test(name));
    if (!tempFolder) throw new Error(`No temp__ folder found in ${baseFolderPath}`);

    const datapacksPath = path.join(baseFolderPath, tempFolder, "datapacks");
    if (!(await exists(datapacksPath))) throw new Error(`Datapacks folder missing at ${datapacksPath}`);

    const datapackFiles = await fs.promises.readdir(datapacksPath);
    const txtFile = datapackFiles.find((name) => name.endsWith(".txt"));
    if (!txtFile) throw new Error(`No .txt datapack found in ${datapacksPath}`);
    const datapackTxtPath = path.join(datapacksPath, txtFile);

    // We don't technically need a settings file for the chart to be made, as the Java
    // program will generate a default one if it doesn't exist. I create one anyways so we can also return this
    // We could just do it all in one step, but it seems to time out sometimes if the file is large
    // so we do it in two steps
    await runJavaChartGeneration(
      {
        settings: "",
        datapacks: [],
        useCache: false,
        isCrossPlot: false
      },
      [datapackTxtPath],
      settingsFile,
      "", // outputFile not needed when generating only settings
      {}, // filenameMap not needed when generating only settings
      onProgress,
      "settings-only"
    );
    datapacksToSendToCommandLine = [datapackTxtPath];
    filenameMap = { [txtFile]: datapackTitle };
    console.log("Successfully created and saved chart settings at", settingsFile);
  } else {
    ({ datapacksToSendToCommandLine, usedUserDatapackFilepaths, usedTempDatapacks, filenameMap } =
      await resolveDatapacks(chartRequest, uuid));
  }

  const cached = await checkForCacheHit(chartFile, useCache, chartUrlPath, hash);
  if (cached) {
    if (!isCrossPlot && uuid) {
      // do not await this, let it run in the background
      saveChartHistory(uuid, settingsFile, datapacksToSendToCommandLine, chartFile, hash).catch((e) => {
        /* v8 ignore next -- async microtask in background `.catch()` is not tracked by V8 coverage, but this line is tested */
        logger.error(`Failed to save chart history for user ${uuid}: ${e}`);
      });
    }
    return cached;
  }

  if (queue.size >= maxQueueSize) throw new ChartGenerationError("Queue is too busy", 503);

  await updateFileMetadata(assetconfigs.fileMetadata, usedUserDatapackFilepaths).catch(() => {
    throw new ChartGenerationError("Failed to update file metadata", 100);
  });

  if (mode !== "chart-no-settings") {
    await mkdir(chartDir, { recursive: true });
    await writeFile(settingsFile, settings);
    console.log("Successfully created and saved chart settings at", settingsFile);
  }

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
          onProgress,
          mode
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
    usedTempDatapacks.forEach((dp) => {
      deleteUserDatapack("temp", dp).catch((e) => {
        logger.error(`Failed to delete temporary datapack ${dp}: ${e}`);
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
  }

  console.log("No error found in Java output. Sending chartpath and hash.");
  console.log("Sending reply to browser: ", {
    chartpath: chartUrlPath,
    hash: hash
  });
  if (!isCrossPlot && uuid)
    // do not await this, let it run in the background
    saveChartHistory(uuid, settingsFile, datapacksToSendToCommandLine, chartFile, hash).catch((e) => {
      /* v8 ignore next -- async microtask in background `.catch()` is not tracked by V8 coverage, but this line is tested */
      logger.error(`Failed to save chart history for user ${uuid}: ${e}`);
    });
  return { chartpath: chartUrlPath, hash: hash };
}
