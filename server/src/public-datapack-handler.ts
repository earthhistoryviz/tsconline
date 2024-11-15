import { Datapack } from "@tsconline/shared";
import { Mutex } from "async-mutex";
import { getDirectories, getPublicUserUUIDDirectory } from "./user/fetch-user-files.js";
import { fetchUserDatapack } from "./user/user-handler.js";
import logger from "./error-logger.js";
import { assetconfigs } from "./util.js";

const mutex = new Mutex();

export async function loadPublicUserDatapacks(uuidChunk?: string[]) {
  const release = await mutex.acquire();
  try {
    const datapacks: Datapack[] = [];
    const uuids = uuidChunk ? uuidChunk : await getDirectories(assetconfigs.publicDatapacksDirectory);
    for (const uuid of uuids) {
      try {
        const datapackDirs = await getDirectories(await getPublicUserUUIDDirectory(uuid));
        for (const datapack of datapackDirs) {
          try {
            const dp = await fetchUserDatapack(uuid, datapack);
            datapacks.push(dp);
          } catch (e) {
            logger.error(`Error loading datapack ${datapack} with error ${e}`);
          }
        }
      } catch (e) {
        logger.error(`Error loading user ${uuid} with error ${e}`);
      }
    }
    return datapacks;
  } finally {
    release();
  }
}
