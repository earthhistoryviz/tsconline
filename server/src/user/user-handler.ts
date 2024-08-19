import { readFile, readdir } from "fs/promises";
import path from "path";
import { CACHED_USER_DATAPACK_FILENAME } from "../constants";
import { checkFileExists } from "../util";
import { DatapackIndex, assertDatapack, assertPrivateUserDatapack } from "@tsconline/shared";

async function getDirectories(source: string): Promise<string[]> {
  const entries = await readdir(source, { withFileTypes: true });
  return entries.filter((dirent) => dirent.isDirectory()).map((dirent) => dirent.name);
}
export async function fetchAllUsersDatapacks(userDirectory: string): Promise<DatapackIndex> {
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
