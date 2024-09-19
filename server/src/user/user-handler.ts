import { mkdir, readFile, readdir, rename, writeFile } from "fs/promises";
import path from "path";
import { CACHED_USER_DATAPACK_FILENAME } from "../constants.js";
import { assetconfigs, checkFileExists, verifyFilepath } from "../util.js";
import { Datapack, DatapackIndex, assertDatapack, assertPrivateUserDatapack } from "@tsconline/shared";
import logger from "../error-logger.js";
import { changeFileMetadataKey } from "../file-metadata-handler.js";

export async function getDirectories(source: string): Promise<string[]> {
  const entries = await readdir(source, { withFileTypes: true });
  return entries.filter((dirent) => dirent.isDirectory()).map((dirent) => dirent.name);
}
export async function fetchAllUsersDatapacks(userDirectory: string): Promise<DatapackIndex> {
  await mkdir(userDirectory, { recursive: true });
  const datapacks = await getDirectories(userDirectory);
  const datapackIndex: DatapackIndex = {};
  for (const datapack of datapacks) {
    const cachedDatapack = path.join(userDirectory, datapack, CACHED_USER_DATAPACK_FILENAME);
    if (!(await checkFileExists(cachedDatapack))) {
      throw new Error(`File ${datapack} doesn't exist`);
    }
    const parsedCachedDatapack = JSON.parse(await readFile(cachedDatapack, "utf-8"));
    assertPrivateUserDatapack(parsedCachedDatapack);
    assertDatapack(parsedCachedDatapack);
    if (datapackIndex[datapack]) {
      logger.error(`File system is corrupted, multiple datapacks with the same name: ${datapack}`);
      throw new Error(`Datapack ${datapack} already exists in the index`);
    }
    datapackIndex[datapack] = parsedCachedDatapack;
  }
  return datapackIndex;
}

export async function getUserDirectory(uuid: string): Promise<string> {
  const userDirectory = path.join(assetconfigs.uploadDirectory, uuid);
  if (!(await verifyFilepath(userDirectory))) {
    throw new Error("Invalid filepath");
  }
  return userDirectory;
}

export async function fetchUserDatapack(userDirectory: string, datapack: string): Promise<Datapack> {
  const cachedDatapack = path.join(userDirectory, datapack, CACHED_USER_DATAPACK_FILENAME);
  if (!(await verifyFilepath(cachedDatapack)) || !(await checkFileExists(cachedDatapack))) {
    throw new Error(`File ${datapack} doesn't exist`);
  }
  const parsedCachedDatapack = JSON.parse(await readFile(cachedDatapack, "utf-8"));
  assertPrivateUserDatapack(parsedCachedDatapack);
  assertDatapack(parsedCachedDatapack);
  return parsedCachedDatapack;
}

// here we rename a user datapack title which means we have to rename the folder and the file metadata (the key only)
export async function renameUserDatapack(
  userDirectory: string,
  oldDatapack: string,
  datapack: Datapack
): Promise<void> {
  const oldDatapackPath = path.join(userDirectory, oldDatapack);
  const newDatapackPath = path.join(userDirectory, datapack.title);
  const oldDatapackMetadata = await fetchUserDatapack(userDirectory, oldDatapack);
  if (!(await verifyFilepath(oldDatapackPath))) {
    throw new Error("Invalid filepath");
  }
  if (!path.resolve(newDatapackPath).startsWith(path.resolve(userDirectory))) {
    throw new Error("Invalid filepath");
  }
  await rename(oldDatapackPath, newDatapackPath);
  await writeUserDatapack(userDirectory, datapack).catch(async (e) => {
    await rename(newDatapackPath, oldDatapackPath);
    throw e;
  });
  await changeFileMetadataKey(assetconfigs.fileMetadata, oldDatapackPath, newDatapackPath).catch(async (e) => {
    await rename(newDatapackPath, oldDatapackPath);
    // revert the write if the metadata change fails
    await writeUserDatapack(userDirectory, oldDatapackMetadata);
    throw e;
  });
}

export async function writeUserDatapack(userDirectory: string, datapack: Datapack): Promise<void> {
  const datapackPath = path.join(userDirectory, datapack.title, CACHED_USER_DATAPACK_FILENAME);
  if (!(await verifyFilepath(datapackPath))) {
    throw new Error("Invalid filepath");
  }
  await writeFile(datapackPath, JSON.stringify(datapack, null, 2));
}
