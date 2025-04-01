import { assetconfigs } from "../util.js";
import { join, basename, dirname } from "path";
import { cp, mkdir, readFile, readdir, realpath, rm, symlink, access, lstat } from "fs/promises";
import logger from "../error-logger.js";
import { Datapack, HistoryEntry } from "@tsconline/shared";
import { getCachedDatapackFromDirectory } from "./fetch-user-files.js";

export function isValidEpoch(timestamp: string) {
  return /^\d{13}$/.test(timestamp);
}

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
  const historyRoot = join(assetconfigs.uploadDirectory, "private", uuid, "history");
  const historyEntryDir = join(historyRoot, Date.now().toString());
  try {
    await mkdir(historyRoot, { recursive: true });
    const existingEntries = await readdir(historyRoot);
    if (existingEntries.length >= 10) {
      const oldestEntry = existingEntries.sort()[0]!;
      await rm(join(historyRoot, oldestEntry), { recursive: true });
    }

    await mkdir(historyEntryDir);
    await cp(settingsFilePath, join(historyEntryDir, "settings.tsc"));
    await cp(chartPath, join(historyEntryDir, `${chartHash}.svg`));

    const datapacksSubdir = join(historyEntryDir, "datapacks");
    await mkdir(datapacksSubdir);

    for (const datapackPath of datapackPaths) {
      const absoluteDatapackPath = await realpath(datapackPath);
      const absoluteDatapackFolder = dirname(absoluteDatapackPath);
      await symlink(absoluteDatapackFolder, join(datapacksSubdir, basename(absoluteDatapackFolder)));
    }
  } catch (error) {
    logger.error("Failed to save chart history", error);
    await rm(historyEntryDir, { recursive: true, force: true }).catch(() =>
      logger.error("Failed to clean up history directory")
    );
  }
}

/**
 * Get the amount of chart history entries for a user
 * @param uuid User's UUID
 */
export async function getChartHistoryMetadata(uuid: string): Promise<HistoryEntry[]> {
  const historyRoot = join(assetconfigs.uploadDirectory, "private", uuid, "history");
  try {
    await access(historyRoot);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return [];
  }
  const entries = await readdir(historyRoot);
  const validEntries: HistoryEntry[] = [];
  for (const entry of entries) {
    if (!isValidEpoch(entry)) {
      logger.error(`Invalid epoch in history entry ${entry}`);
      await rm(join(historyRoot, entry), { recursive: true });
      continue;
    }
    const datapacksPath = join(historyRoot, entry, "datapacks");
    const datapacks = await readdir(datapacksPath);
    let validSymlinks = true;
    for (const datapack of datapacks) {
      if (!(validSymlinks = await verifySymlink(join(datapacksPath, datapack)))) break;
    }
    if (!validSymlinks) {
      logger.error(`Invalid symlinks in history entry ${entry}`);
      await rm(join(historyRoot, entry), { recursive: true });
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
  if (!isValidEpoch(timestamp)) throw new Error("Invalid timestamp");
  const historyEntryPath = join(assetconfigs.uploadDirectory, "private", uuid, "history", timestamp);
  const settings = await readFile(join(historyEntryPath, "settings.tsc"), "utf-8");
  const chartPath = await readdir(historyEntryPath).then((files) => files.find((file) => file.endsWith(".svg")));
  if (!chartPath) throw new Error("Chart not found");
  const chartContent = await readFile(join(historyEntryPath, chartPath), "utf-8");
  const chartHash = chartPath.replace(".svg", "");

  const datapackDirsPath = join(historyEntryPath, "datapacks");
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
  if (!isValidEpoch(timestamp) && timestamp !== "-1") throw new Error("Invalid timestamp");
  const historyRoot = join(assetconfigs.uploadDirectory, "private", uuid, "history");
  if (parseInt(timestamp) === -1) {
    const entries = await readdir(historyRoot);
    await Promise.all(entries.map((entry) => rm(join(historyRoot, entry), { recursive: true })));
  } else {
    const historyFolder = join(historyRoot, timestamp);
    await rm(historyFolder, { recursive: true });
  }
}
