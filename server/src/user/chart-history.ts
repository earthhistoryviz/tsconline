import { assetconfigs } from "../util.js";
import { join, basename, dirname } from "path";
import { cp, mkdir, readFile, readdir, realpath, rm, symlink, access, lstat } from "fs/promises";
import logger from "../error-logger.js";
import { Datapack, HistoryEntry } from "@tsconline/shared";
import { getCachedDatapackFromDirectory } from "./fetch-user-files.js";

/**
 * Verify that a path is a symlink and that it points to a valid target
 * @param symlink
 */
export async function verifySymlink(symlink: string): Promise<boolean> {
  try {
    const stats = await lstat(symlink);
    if (!stats.isSymbolicLink()) return false;
    await realpath(symlink);
    return true;
  } catch {
    return false;
  }
}

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
  const validEntries: HistoryEntry[] = [];
  for (const entry of entries) {
    const datapacksPath = join(historyDir, entry, "datapacks");
    const datapacks = await readdir(datapacksPath);
    let validSymlinks = true;
    for (const datapack of datapacks) {
      validSymlinks = await verifySymlink(join(datapacksPath, datapack));
    }
    if (!validSymlinks) {
      logger.error(`Invalid symlinks in history entry ${entry}`);
      await rm(join(historyDir, entry), { recursive: true });
      continue;
    }
    validEntries.push({
      timestamp: entry
    });
  }
  return validEntries.sort();
}

/**
 * Get the settings and datapacks for a specific chart history entry
 * @param uuid User's UUID
 * @param id ID of the history entry when sorted by timestamp, must be between 0 and 9
 */
export async function getChartHistory(uuid: string, timestamp: string) {
  const historyDir = join(assetconfigs.uploadDirectory, "private", uuid, "history", timestamp);
  const settings = await readFile(join(historyDir, "settings.tsc"), "utf-8");
  const chartPath = await readdir(historyDir).then((files) => files.find((file) => file.endsWith(".svg")));
  if (!chartPath) throw new Error("Chart not found");
  const chartContent = await readFile(join(historyDir, chartPath), "utf-8");
  const chartHash = chartPath.replace(".svg", "");

  const datapackDirsPath = join(historyDir, "datapacks");
  const datapackDirs = await readdir(datapackDirsPath);
  const datapacks: Datapack[] = [];
  for (const datapackDir of datapackDirs) {
    const symlinkPath = join(datapackDirsPath, datapackDir);
    if (!(await verifySymlink(symlinkPath))) throw new Error("Invalid datapack symlink");
    const resolvedPath = await realpath(symlinkPath);
    const datapack = await getCachedDatapackFromDirectory(resolvedPath);
    datapacks.push(datapack);
  }

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
 * @param timestamp Timestamp of the history entry to delete, or -1 to delete all entries
 */
export async function deleteChartHistory(uuid: string, timestamp: string) {
  const historyDir = join(assetconfigs.uploadDirectory, "private", uuid, "history");
  if (parseInt(timestamp) === -1) {
    const entries = await readdir(historyDir);
    await Promise.all(entries.map((entry) => rm(join(historyDir, entry), { recursive: true })));
  } else {
    const historyFolder = join(historyDir, timestamp);
    await rm(historyFolder, { recursive: true });
  }
}
