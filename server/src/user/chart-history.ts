import { assetconfigs } from "../util.js";
import { join, basename } from "path";
import { cp, mkdir, readdir, realpath, rm, symlink } from "fs/promises";
import logger from "../error-logger.js";
import { entries } from "lodash";
import { HistoryEntry } from "@tsconline/shared";

/**
 * Save chart history to the user's history file
 * @param uuid User's UUID
 * @param settingsFilePath File path to the settings file
 * @param datapackPaths File paths to the datapacks
 */
export async function saveChartHistory(uuid: string, settingsFilePath: string, datapackPaths: string[], chartPath: string) {
  const historyDir = join(assetconfigs.uploadDirectory, "private", uuid, "history");
  const newHistoryEntry = join(historyDir, Date.now().toString());
  try {
    await mkdir(historyDir, { recursive: true });
    const entires = await readdir(historyDir);
    if (entires.length >= 10) {
      const oldestEntry = entires.sort()[0]!;
      await rm(join(historyDir, oldestEntry), { recursive: true });
    }

    await mkdir(newHistoryEntry);
    await cp(settingsFilePath, join(newHistoryEntry, "settings.tsc"));
    await cp(chartPath, join(newHistoryEntry, "chart.svg"));

    const datapacksDir = join(newHistoryEntry, "datapacks");
    await mkdir(datapacksDir);
    for (const datapackPath of datapackPaths) {
      const absoluteDatapackPath = await realpath(datapackPath);
      await symlink(absoluteDatapackPath, join(datapacksDir, basename(datapackPath)));
    }
  } catch (error) {
    logger.error("Failed to save chart history", error);
    await rm(newHistoryEntry, { recursive: true, force: true }).catch(() =>
      logger.error("Failed to clean up history directory")
    );
  }
}

/**
 * Get the amount of chart history entries for a user
 * @param uuid User's UUID
 */
export async function getChartHistoryMetadata(uuid: string): Promise<HistoryEntry[]> {
  const historyDir = join(assetconfigs.uploadDirectory, "private", uuid, "history");
  const entries = await readdir(historyDir);
  return entries.sort().map((entry, index) => ({
    id: index.toString(),
    timestamp: new Date(parseInt(entry)).toISOString()
  }));
}

/**
 * Get the settings and datapacks for a specific chart history entry
 * @param uuid User's UUID
 * @param id ID of the history entry when sorted by timestamp
 * @returns 
 */
export async function getChartHistory(uuid: string, id: string): Promise<{ settings: string; datapacks: string[] }> {
  const historyDir = join(assetconfigs.uploadDirectory, "private", uuid, "history", id);
  const settings = await realpath(join(historyDir, "settings.tsc"));
  const datapacks = await readdir(join(historyDir, "datapacks"));
  return {
    settings,
    datapacks: datapacks.map(datapack => join(historyDir, "datapacks", datapack))
  };
}
