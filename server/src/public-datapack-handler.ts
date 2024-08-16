import {
  Datapack,
  DatapackIndex,
  MapPack,
  MapPackIndex,
  assertDatapackIndex,
  assertMapPackIndex
} from "@tsconline/shared";
import { Mutex } from "async-mutex";
import { readFile, writeFile, mkdir, copyFile } from "fs/promises";
import { checkFileExists } from "./util.js";
import { publicDatapackIndex, publicMapPackIndex } from "./index.js";
import { join } from "path";

const mutex = new Mutex();
/**
 *
 * @param filename the name of the file to add
 * @param datapack the datapack to add
 * @param datapackIndexFilepath the path to the datapack index file that will be updated (public)
 * @param mapPackIndexFilepath the path to the map pack index file that will be updated (public)
 * @param datapackFilepath the path to the undecrypted datapack file
 * @param publicDatapacksDirectory the directory where the public datapacks are stored
 * @param mapPack the map pack to add (optional)
 */
export async function addPublicUserDatapack(
  filename: string,
  datapack: Datapack,
  datapackIndexFilepath: string,
  mapPackIndexFilepath: string,
  datapackFilepath: string,
  publicDatapacksDirectory: string,
  mapPack?: MapPack
) {
  const release = await mutex.acquire();
  try {
    const { datapackIndex: parsedPublicDatapackIndex, mapPackIndex: parsedMapPackIndex } =
      await loadPublicUserDatapacks(datapackIndexFilepath, mapPackIndexFilepath);
    parsedPublicDatapackIndex[filename] = datapack;
    if (mapPack) {
      parsedMapPackIndex[filename] = mapPack;
    }
    if (!(await checkFileExists(datapackFilepath))) {
      throw new Error("Datapack file does not exist");
    }
    await mkdir(publicDatapacksDirectory, { recursive: true });
    // copy the file (so charts can be generated seperate from the user dir)
    await copyFile(datapackFilepath, join(publicDatapacksDirectory, filename));
    // update the file
    await writeFile(datapackIndexFilepath, JSON.stringify(parsedPublicDatapackIndex, null, 2));
    await writeFile(mapPackIndexFilepath, JSON.stringify(parsedMapPackIndex, null, 2));
    // Update the in-memory index
    publicDatapackIndex[filename] = datapack;
    if (mapPack) {
      publicMapPackIndex[filename] = mapPack;
    }
  } finally {
    release();
  }
}

export async function loadPublicUserDatapacks(datapackIndexFilepath: string, mapPackIndexFilepath: string) {
  let parsedPublicDatapackIndex: DatapackIndex = {};
  let parsedMapPackIndex: MapPackIndex = {};
  if (await checkFileExists(datapackIndexFilepath)) {
    parsedPublicDatapackIndex = JSON.parse(await readFile(datapackIndexFilepath, "utf-8"));
    assertDatapackIndex(parsedPublicDatapackIndex);
  }
  if (await checkFileExists(mapPackIndexFilepath)) {
    parsedMapPackIndex = JSON.parse(await readFile(mapPackIndexFilepath, "utf-8"));
    assertMapPackIndex(parsedMapPackIndex);
  }
  return { datapackIndex: parsedPublicDatapackIndex, mapPackIndex: parsedMapPackIndex };
}
