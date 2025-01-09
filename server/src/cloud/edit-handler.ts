import { DatapackMetadata, isUserDatapack } from "@tsconline/shared";
import _ from "lodash";
import logger from "../error-logger.js";
import { switchPrivacySettingsOfDatapack } from "../public-datapack-handler.js";
import { getTemporaryFilepath, replaceDatapackFile, changeProfilePicture } from "../upload-handlers.js";
import { fetchUserDatapack, renameUserDatapack, writeUserDatapack } from "../user/user-handler.js";
import { verifyFilepath } from "../util.js";

/**
 * TODO: write tests
 * @param uuid
 * @param oldDatapackTitle
 * @param newDatapack
 */
export async function editDatapack(
  uuid: string,
  oldDatapackTitle: string,
  newDatapack: Partial<DatapackMetadata>
): Promise<string[]> {
  let metadata = await fetchUserDatapack(uuid, oldDatapackTitle);
  const originalMetadata = _.cloneDeep(metadata);
  Object.assign(metadata, newDatapack);
  const errors: string[] = [];
  if ("title" in newDatapack && oldDatapackTitle !== newDatapack.title) {
    await renameUserDatapack(uuid, oldDatapackTitle, newDatapack.title!).catch((e) => {
      logger.error(e);
      metadata.title = oldDatapackTitle;
      errors.push("Error renaming datapack to a different title");
    });
  }
  if ("originalFileName" in newDatapack) {
    const sourceFilepath = await getTemporaryFilepath(uuid, metadata.storedFileName);
    // check to see if a temp file was uploaded
    if (await verifyFilepath(sourceFilepath)) {
      // this changes the storedFileName as well so we need to update the metadata
      metadata = await replaceDatapackFile(uuid, sourceFilepath, metadata).catch((e) => {
        logger.error(e);
        errors.push("Error replacing datapack file");
        return {
          ...metadata,
          originalFileName: originalMetadata.originalFileName,
          size: originalMetadata.size,
          storedFileName: originalMetadata.storedFileName
        };
      });
    } else {
      metadata = {
        ...metadata,
        originalFileName: originalMetadata.originalFileName,
        size: originalMetadata.size,
        storedFileName: originalMetadata.storedFileName
      };
      errors.push("No file uploaded with edit request");
    }
  }
  if ("datapackImage" in newDatapack) {
    const sourceFilepath = await getTemporaryFilepath(uuid, newDatapack.datapackImage!);
    // check to see if a temp file was uploaded
    if (await verifyFilepath(sourceFilepath)) {
      await changeProfilePicture(
        uuid,
        oldDatapackTitle,
        await getTemporaryFilepath(uuid, newDatapack.datapackImage!)
      ).catch((e) => {
        logger.error(e);
        metadata.datapackImage = originalMetadata.datapackImage;
        errors.push("Error changing profile picture");
      });
    } else {
      metadata.datapackImage = originalMetadata.datapackImage;
      errors.push("No file uploaded with edit request");
    }
  }
  if ("isPublic" in newDatapack && originalMetadata.isPublic !== newDatapack.isPublic) {
    await switchPrivacySettingsOfDatapack(uuid, metadata.title, originalMetadata.isPublic!, metadata.isPublic, isUserDatapack(metadata)).catch(
      (e) => {
        logger.error(e);
        metadata.isPublic = originalMetadata.isPublic;
        errors.push("Error switching privacy settings");
      }
    );
  }
  if (JSON.stringify(metadata) !== JSON.stringify(originalMetadata)) {
    await writeUserDatapack(uuid, metadata).catch((e) => {
      logger.error(e);
      errors.push("Error writing metadata");
    });
  }
  return errors;
}
