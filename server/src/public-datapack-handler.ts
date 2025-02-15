import { Datapack } from "@tsconline/shared";
import { Mutex } from "async-mutex";
import {
  fetchUserDatapackDirectory,
  getDirectories,
  getPrivateDatapacksDirectoryFromUUID,
  getPrivateUserUUIDDirectory,
  getPublicDatapacksDirectoryFromUUID,
  getPublicUserUUIDDirectory
} from "./user/fetch-user-files.js";
import { fetchUserDatapack } from "./user/user-handler.js";
import logger from "./error-logger.js";
import { assetconfigs, verifyNonExistentFilepath } from "./util.js";
import { rename } from "fs/promises";
import { changeFileMetadataKey } from "./file-metadata-handler.js";
import { join } from "path";
import { isUUIDFolderAWorkshopFolder } from "./workshop/workshop-util.js";

const mutex = new Mutex();

export async function loadPublicUserDatapacks() {
  const release = await mutex.acquire();
  try {
    const datapacks: Datapack[] = [];
    const uuids = await getDirectories(assetconfigs.publicDatapacksDirectory);
    for (const uuid of uuids) {
      if (isUUIDFolderAWorkshopFolder(uuid)) continue;
      try {
        const datapackDirs = await getDirectories(await getPrivateDatapacksDirectoryFromUUID(uuid));
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

export async function switchPrivacySettingsOfDatapack(
  uuid: string,
  datapack: string,
  formerIsPublic: boolean,
  newIsPublic: boolean,
  isTemporaryFile?: boolean
) {
  if (formerIsPublic === newIsPublic) {
    return;
  }
  const release = await mutex.acquire();
  try {
    const oldDatapackPath = await fetchUserDatapackDirectory(uuid, datapack);
    const newDatapackPath = join(
      newIsPublic ? await getPublicDatapacksDirectoryFromUUID(uuid) : await getPrivateDatapacksDirectoryFromUUID(uuid),
      datapack
    );
    if (!(await verifyNonExistentFilepath(newDatapackPath))) {
      throw new Error("Invalid datapack path");
    }
    await rename(oldDatapackPath, newDatapackPath);
    if (isTemporaryFile) {
      await changeFileMetadataKey(assetconfigs.fileMetadata, oldDatapackPath, newDatapackPath).catch(async (e) => {
        await rename(newDatapackPath, oldDatapackPath);
        throw e;
      });
    }
  } finally {
    release();
  }
}
