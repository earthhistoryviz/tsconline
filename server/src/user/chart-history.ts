import { assetconfigs } from "../util.js";
import { join, basename } from "path";
import { cp, mkdir, readdir, realpath, rm, symlink } from "fs/promises";

/**
 * Save chart history to the user's history file
 * @param uuid User's UUID
 * @param settingsFilePath File path to the settings file
 * @param datapackPaths File paths to the datapacks
 */
export async function saveChartHistory(uuid: string, settingsFilePath: string, datapackPaths: string[]) {
  const historyDir = join(assetconfigs.uploadDirectory, "private", uuid, "history");
  await mkdir(historyDir, { recursive: true });

  const entires = await readdir(historyDir);
  if (entires.length >= 10) {
    const oldestEntry = entires.sort()[0]!;
    await rm(join(historyDir, oldestEntry), { recursive: true });
  }

  const newHistoryEntry = join(historyDir, Date.now().toString());
  await mkdir(newHistoryEntry);

  await cp(settingsFilePath, join(newHistoryEntry, "settings.tsc"));
  const datapacksDir = join(newHistoryEntry, "datapacks");
  await mkdir(datapacksDir);
  for (const datapackPath of datapackPaths) {
    const absoluteDatapackPath = await realpath(datapackPath);
    await symlink(absoluteDatapackPath, join(datapacksDir, basename(datapackPath)));
  }
}

/**
 * Get the amount of chart history entries for a user
 * @param uuid User's UUID
 */
export async function getChartHistoryCount(uuid: string) {
  const historyDir = join(assetconfigs.uploadDirectory, "private", uuid, "history");
  const entires = await readdir(historyDir);
  return entires.length;
}
