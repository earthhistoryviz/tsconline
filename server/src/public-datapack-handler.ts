import {
  Datapack,
  DatapackIndex,
  MapPack,
  MapPackIndex,
  assertDatapackIndex,
  assertMapPackIndex
} from "@tsconline/shared";
import { Mutex } from "async-mutex";
import { readFile, writeFile } from "fs/promises";
import { checkFileExists } from "./util";

const mutex = new Mutex();
export async function addPublicUserDatapack(
  filename: string,
  datapack: Datapack,
  datapackIndexFilepath: string,
  mapPackIndexFilepath: string,
  mapPack?: MapPack
) {
  const release = await mutex.acquire();
  try {
    let publicDatapackIndex: DatapackIndex = {};
    let publicMapPackIndex: MapPackIndex = {};
    if (await checkFileExists(datapackIndexFilepath)) {
      publicDatapackIndex = JSON.parse(await readFile(datapackIndexFilepath, "utf-8"));
      assertDatapackIndex(publicDatapackIndex);
    }
    if (await checkFileExists(mapPackIndexFilepath)) {
      publicMapPackIndex = JSON.parse(await readFile(mapPackIndexFilepath, "utf-8"));
      assertMapPackIndex(publicMapPackIndex);
    }
    if (publicDatapackIndex[filename] || publicMapPackIndex[filename]) {
      throw new Error("File already exists");
    }
    publicDatapackIndex[filename] = datapack;
    if (mapPack) {
      publicMapPackIndex[filename] = mapPack;
    }
    await writeFile(datapackIndexFilepath, JSON.stringify(publicDatapackIndex, null, 2));
    await writeFile(mapPackIndexFilepath, JSON.stringify(publicMapPackIndex, null, 2));
  } finally {
    release();
  }
}

export async function loadPublicUserDatapacks(datapackIndexFilepath: string, mapPackIndexFilepath: string) {
  const release = await mutex.acquire();
  try {
    let publicDatapackIndex: DatapackIndex = {};
    let publicMapPackIndex: MapPackIndex = {};
    if (await checkFileExists(datapackIndexFilepath)) {
      publicDatapackIndex = JSON.parse(await readFile(datapackIndexFilepath, "utf-8"));
      assertDatapackIndex(publicDatapackIndex);
    }
    if (await checkFileExists(mapPackIndexFilepath)) {
      publicMapPackIndex = JSON.parse(await readFile(mapPackIndexFilepath, "utf-8"));
      assertMapPackIndex(publicMapPackIndex);
    }
    return { datapackIndex: publicDatapackIndex, mapPackIndex: publicMapPackIndex };
  } finally {
    release();
  }
}
