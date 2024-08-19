import { mkdir, readFile, readdir } from "fs/promises";
import path from "path";
import { CACHED_USER_DATAPACK_FILENAME } from "../constants.js";
import { checkFileExists } from "../util.js";
import { DatapackIndex, assertDatapack, assertPrivateUserDatapack } from "@tsconline/shared";

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
      throw new Error(`Datapack ${datapack} already exists in the index`);
    }
    datapackIndex[datapack] = parsedCachedDatapack;
  }
  return datapackIndex;
}
