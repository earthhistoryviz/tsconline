import { ChartRequest, ChartProgressUpdate, CachedChartRequest } from "@tsconline/shared";
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

export class ChartGenerationError extends Error {
  public errorCode: number;

  constructor(message: string, errorCode: number) {
    super(message);
    this.errorCode = errorCode;
  }
}

export async function generateChart(
  chartRequest: ChartRequest,
  onProgress: (p: ChartProgressUpdate) => void,
  uuid?: string
) {
  const { useCache, isCrossPlot, settings } = chartRequest;
  const hash = md5(isCrossPlot + settings + JSON.stringify(chartRequest.datapacks));
  const userId = uuid ? (await findUser({ uuid }))[0]?.userId : undefined;
  const isInWorkshop = userId ? (await getActiveWorkshopsUserIsIn(userId)).length : 0;
  const chartDir = path.join(assetconfigs.chartsDirectory, hash);
  const chartFile = path.join(chartDir, "chart.svg");
  const settingsFile = path.join(chartDir, "settings.tsc");
  const chartUrlPath = `/${assetconfigs.chartsDirectory}/${hash}/chart.svg`;

  const { datapacksToSendToCommandLine, usedUserDatapackFilepaths, usedTempDatapacks, filenameMap } =
    await resolveDatapacks(chartRequest, uuid);

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

  await mkdir(chartDir, { recursive: true });
  await writeFile(settingsFile, settings);
  console.log("Successfully created and saved chart settings at", settingsFile);

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

export async function findCachedChart(
  chartRequest: CachedChartRequest,
  uuid?: string
) {
  try{

    const hash = chartRequest.hash;
    // const userId = uuid ? (await findUser({ uuid }))[0]?.userId : undefined;
    const chartDir = path.join(assetconfigs.chartsDirectory, hash);
    const chartFile = path.join(chartDir, "chart.svg");
    const settingsFile = path.join(chartDir, "settings.tsc");
    const chartUrlPath = `/${assetconfigs.chartsDirectory}/${hash}/chart.svg`;
    const useCache = true;
    // const isCrossPlot = false; // only used for charts for now

    const cached = await checkForCacheHit(chartFile, useCache, chartUrlPath, hash);
    if (cached) {
      return { chartpath: cached.chartpath, hash: cached.hash, settingsFile };
    } else {
      throw new ChartGenerationError("Cached chart not found", 404);
    }
  } catch (error) {
    if (error instanceof ChartGenerationError) {
      throw error;
    } else {
      throw new Error("Error while finding cached chart");
    }
  }
}
