import { join, parse } from "path";
import { assetconfigs, verifyFilepath, verifyNonExistentFilepath } from "../util.js";
import { mkdir, readFile, readdir } from "fs/promises";

function isValidUUID(uuid: string) {
  // Expect canonical UUID format: 8-4-4-4-12 hex characters
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(uuid);
}

function isValidEpoch(timestamp: string) {
  return /^\d{13}$/.test(timestamp);
}

export async function getUserHistoryRootFilePath(uuid: string): Promise<string> {
  if (!isValidUUID(uuid)) throw new Error("Invalid uuid");

  const filepath = join(assetconfigs.uploadDirectory, "private", uuid, "history");
  if (!(await verifyFilepath(filepath))) {
    if (await verifyNonExistentFilepath(filepath)) {
      await mkdir(filepath, { recursive: true });
    } else {
      throw new Error("Invalid filepath");
    }
  }
  return filepath;
}
export async function getHistoryEntryDatapacksPath(uuid: string, timestamp: string): Promise<string> {
  if (!isValidUUID(uuid)) throw new Error("Invalid uuid");
  if (!isValidEpoch(timestamp)) throw new Error("Invalid timestamp");

  const filepath = join(await getSpecificUserHistoryRootFilePath(uuid, timestamp), "datapacks");
  if (!(await verifyFilepath(filepath))) {
    throw new Error("Invalid filepath");
  }
  return filepath;
}
export async function getSpecificUserHistoryRootFilePath(uuid: string, timestamp: string): Promise<string> {
  if (!isValidUUID(uuid)) throw new Error("Invalid uuid");
  if (!isValidEpoch(timestamp)) throw new Error("Invalid timestamp");

  const filepath = join(await getUserHistoryRootFilePath(uuid), timestamp);
  if (!(await verifyFilepath(filepath))) {
    throw new Error("Invalid filepath");
  }
  return filepath;
}
export async function getChartContentFromChartHistoryTimeStamp(
  uuid: string,
  timestamp: string
): Promise<{ chartContent: string; chartHash: string }> {
  if (!isValidUUID(uuid)) throw new Error("Invalid uuid");
  if (!isValidEpoch(timestamp)) throw new Error("Invalid timestamp");

  const historyDir = await getSpecificUserHistoryRootFilePath(uuid, timestamp);
  const chartPath = await readdir(historyDir).then((files) => files.find((file) => file.endsWith(".svg")));
  if (!chartPath) throw new Error("Chart not found");
  const chartHash = parse(chartPath).name;
  return { chartContent: await readFile(join(historyDir, chartPath), "utf-8"), chartHash };
}

export async function getSettingsFromChartHistoryTimeStamp(uuid: string, timestamp: string): Promise<string> {
  if (!isValidUUID(uuid)) throw new Error("Invalid uuid");
  if (!isValidEpoch(timestamp)) throw new Error("Invalid timestamp");

  const historyDir = await getSpecificUserHistoryRootFilePath(uuid, timestamp);
  const settingsPath = await readdir(historyDir).then((files) => files.find((file) => file.endsWith(".tsc")));
  if (!settingsPath) throw new Error("Settings not found");
  return readFile(join(historyDir, settingsPath), "utf-8");
}
