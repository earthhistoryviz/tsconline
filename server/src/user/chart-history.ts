import { cp, mkdir, readFile, writeFile } from "fs/promises";
import { assetconfigs } from "../util.js";
import { join } from "path";
import { Counter, assertHistoryStore, incrementCounter } from "../types.js";
import { Mutex } from "async-mutex";

const mutex = new Mutex();

async function loadHistoryStore() {
  try {
    const data = JSON.parse(await readFile(assetconfigs.historyStoreFilepath, "utf8"));
    assertHistoryStore(data);
    return data;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    await writeFile(assetconfigs.historyStoreFilepath, "{}");
    return {};
  }
}

/**
 * Save chart history to the user's history file
 * @param uuid User's UUID
 * @param settingsFilePath File path to the settings file
 * @param datapackPaths File paths to the datapacks
 */
export async function saveChartHistory(uuid: string, settingsFilePath: string, datapackPaths: string[]) {
  const release = await mutex.acquire();
  try {
    const userHistoryPath = join(assetconfigs.historyDirectory, uuid);
    await mkdir(userHistoryPath, { recursive: true });

    const historyStore = await loadHistoryStore();
    const userHistory = historyStore[uuid] || { counter: 0, entries: [] };
    await cp(settingsFilePath, join(userHistoryPath, `${userHistory.counter}.tsc`));
    userHistory.entries[userHistory.counter] = datapackPaths;
    userHistory.counter = incrementCounter(userHistory.counter);
    historyStore[uuid] = userHistory;

    await writeFile(assetconfigs.historyStoreFilepath, JSON.stringify(historyStore, null, 2));
  } finally {
    release();
  }
}
