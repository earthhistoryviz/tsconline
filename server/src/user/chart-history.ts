import { assetconfigs } from "../util.js";
import { join, basename, dirname } from "path";
import { cp, mkdir, readFile, readdir, realpath, rm, symlink, access } from "fs/promises";
import logger from "../error-logger.js";
import { HistoryEntry, assertDatapack } from "@tsconline/shared";
import { CACHED_USER_DATAPACK_FILENAME } from "../constants.js";

/**
 * Save chart history to the user's history file
 * @param uuid User's UUID
 * @param settingsFilePath File path to the settings file
 * @param datapackPaths File paths to the datapacks
 * @param chartPath File path to the chart
 * @param chartHash Hash of the chart
 */
export async function saveChartHistory(
  uuid: string,
  settingsFilePath: string,
  datapackPaths: string[],
  chartPath: string,
  chartHash: string
) {
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
    await cp(chartPath, join(newHistoryEntry, `${chartHash}.svg`));

    const datapacksDir = join(newHistoryEntry, "datapacks");
    await mkdir(datapacksDir);
    for (const datapackPath of datapackPaths) {
      const absoluteDatapackPath = await realpath(datapackPath);
      const datapackDir = dirname(absoluteDatapackPath);
      await symlink(datapackDir, join(datapacksDir, basename(datapackDir)));
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
  try {
    await access(historyDir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return [];
  }
  const entries = await readdir(historyDir);
  return entries.sort().map((entry, index) => ({
    id: index.toString(),
    timestamp: new Date(parseInt(entry)).toISOString()
  }));
}

/**
 * Get the settings and datapacks for a specific chart history entry
 * @param uuid User's UUID
 * @param id ID of the history entry when sorted by timestamp, must be between 0 and 9
 */
export async function getChartHistory(uuid: string, id: string) {
  if (isNaN(parseInt(id)) || parseInt(id) < 0 || parseInt(id) > 9) throw new Error("Invalid history ID");
  const historyDir = join(assetconfigs.uploadDirectory, "private", uuid, "history");
  const entries = await readdir(historyDir);
  const entry = entries.sort()[parseInt(id)];
  if (!entry) throw new Error("History entry not found");

  const historyEntryDir = join(historyDir, entry);
  const settings = await readFile(join(historyEntryDir, "settings.tsc"), "utf-8");
  const chartPath = await readdir(historyEntryDir).then((files) => files.find((file) => file.endsWith(".svg")));
  if (!chartPath) throw new Error("Chart not found");
  const chartContent = await readFile(join(historyEntryDir, chartPath), "utf-8");
  const chartHash = chartPath.replace(".svg", "");

  const datapackDirsPath = join(historyEntryDir, "datapacks");
  const datapackDirs = await readdir(datapackDirsPath);
  const datapacks = await Promise.all(
    datapackDirs.map(async (datapackDir) => {
      const datapackDirPath = join(datapackDirsPath, datapackDir);
      const resolvedPath = await realpath(datapackDirPath);
      const datapackJsonPath = join(resolvedPath, CACHED_USER_DATAPACK_FILENAME);
      const datapackJson = JSON.parse(await readFile(datapackJsonPath, "utf-8"));
      assertDatapack(datapackJson);
      return datapackJson;
    })
  );

  return {
    settings,
    datapacks,
    chartContent,
    chartHash
  };
}

/**
 * Delete a chart history entry or all entries, -1 deletes all entries
 * @param uuid
 * @param id The ID of the history entry to delete (0-9), -1 to delete all entries
 */
export async function deleteChartHistory(uuid: string, id: string) {
  if (isNaN(parseInt(id)) || parseInt(id) < -1 || parseInt(id) > 9) throw new Error("Invalid history ID");
  const historyDir = join(assetconfigs.uploadDirectory, "private", uuid, "history");
  const entries = await readdir(historyDir);
  if (parseInt(id) === -1) {
    await Promise.all(entries.map((entry) => rm(join(historyDir, entry), { recursive: true })));
    return;
  } else {
    const entry = entries.sort()[parseInt(id)];
    if (!entry) throw new Error("History entry not found");
    await rm(join(historyDir, entry), { recursive: true });
  }
}
