import {
  DatapackIndex,
  assertDatapack,
  assertUserDatapack,
  isDatapackTypeString,
  isDateValid,
  isServerDatapack,
  isUserDatapack
} from "@tsconline/shared";
import { FastifyReply } from "fastify";
import { copyFile, mkdir, readFile, rm, writeFile } from "fs/promises";
import { DatapackMetadata } from "@tsconline/shared";
import { assetconfigs, checkFileExists, getBytes } from "./util.js";
import path from "path";
import {
  decryptDatapack,
  doesDatapackFolderExistInAllUUIDDirectories,
  getUserUUIDDirectory
} from "./user/user-handler.js";
import { loadDatapackIntoIndex } from "./load-packs.js";
import { addAdminConfigDatapack } from "./admin/admin-config.js";
import { CACHED_USER_DATAPACK_FILENAME } from "./constants.js";
import { writeFileMetadata } from "./file-metadata-handler.js";

async function userUploadHandler(reply: FastifyReply, code: number, message: string, filepath?: string) {
  filepath && (await rm(filepath, { force: true }));
  reply.status(code).send({ error: message });
}
export async function getFileNameFromCachedDatapack(cachedFilepath: string) {
  if (!(await checkFileExists(cachedFilepath))) {
    throw new Error("File does not exist");
  }
  const datapack = JSON.parse(await readFile(cachedFilepath, "utf-8"));
  if (!datapack) {
    throw new Error("File is empty");
  }
  assertUserDatapack(datapack);
  assertDatapack(datapack);
  return datapack.storedFileName;
}

export async function uploadUserDatapackHandler(
  reply: FastifyReply,
  fields: Record<string, string>,
  bytes: number
): Promise<DatapackMetadata | void> {
  const {
    title,
    description,
    authoredBy,
    contact,
    notes,
    date,
    filepath,
    originalFileName,
    storedFileName,
    isPublic,
    type,
    uuid
  } = fields;
  let { references, tags } = fields;
  if (
    !tags ||
    !references ||
    !authoredBy ||
    !title ||
    !description ||
    !filepath ||
    !originalFileName ||
    !storedFileName ||
    !isPublic ||
    !type ||
    !uuid
  ) {
    await userUploadHandler(
      reply,
      400,
      "Missing required fields [title, description, authoredBy, references, tags, filepath, originalFileName, storedFileName, isPublic]",
      filepath
    );
    return;
  }
  if (title === "__proto__" || title === "constructor" || title === "prototype") {
    await userUploadHandler(reply, 400, "Invalid title", filepath);
    return;
  }
  if (!bytes) {
    await userUploadHandler(reply, 400, "File is empty", filepath);
    return;
  }
  if (!isDatapackTypeString(type)) {
    await userUploadHandler(reply, 400, "Invalid type", filepath);
    return;
  }
  try {
    references = JSON.parse(references);
    tags = JSON.parse(tags);
  } catch {
    await userUploadHandler(reply, 400, "References and tags must be valid arrays", filepath);
    return;
  }
  if (!Array.isArray(references) || !references.every((ref) => typeof ref === "string")) {
    await userUploadHandler(reply, 400, "References must be an array of strings", filepath);
    return;
  }
  if (!Array.isArray(tags) || !tags.every((tag) => typeof tag === "string")) {
    await userUploadHandler(reply, 400, "Tags must be an array of strings", filepath);
    return;
  }
  if (date && !isDateValid(date)) {
    await userUploadHandler(reply, 400, "Date must be a valid date string", filepath);
    return;
  }
  return {
    originalFileName,
    storedFileName,
    description,
    title,
    authoredBy,
    references,
    tags,
    type,
    uuid,
    isPublic: isPublic === "true",
    size: getBytes(bytes),
    ...(contact && { contact }),
    ...(notes && { notes }),
    ...(date && { date })
  };
}

/**
 * THIS DOES NOT SETUP METADATA OR ADD TO ANY EXISTING INDEXES
 * @param uuid
 * @param isPublic
 * @param sourceFilePath
 * @param metadata
 * @returns
 */
export async function setupNewDatapackDirectoryInUUIDDirectory(
  uuid: string,
  sourceFilePath: string,
  metadata: DatapackMetadata,
  manual?: boolean // if true, the source file will not be deleted and admin config will not be updated in memory or in the file system
) {
  if (await doesDatapackFolderExistInAllUUIDDirectories(uuid, metadata.title)) {
    throw new Error("Datapack already exists");
  }
  const datapackIndex: DatapackIndex = {};
  const directory = await getUserUUIDDirectory(uuid, metadata.isPublic);
  const datapackFolder = path.join(directory, metadata.title);
  await mkdir(datapackFolder, { recursive: true });
  const sourceFileDestination = path.join(datapackFolder, metadata.storedFileName);
  const decryptDestination = path.join(datapackFolder, "decrypted");
  await copyFile(sourceFilePath, sourceFileDestination);
  if (!manual) {
    await rm(sourceFilePath, { force: true });
  }
  await decryptDatapack(sourceFileDestination, decryptDestination);
  const successful = await loadDatapackIntoIndex(datapackIndex, decryptDestination, metadata);
  if (!successful) {
    await rm(datapackFolder, { force: true });
    throw new Error("Failed to load datapack into index");
  }
  await writeFile(path.join(datapackFolder, CACHED_USER_DATAPACK_FILENAME), JSON.stringify(metadata, null, 2));
  if (isUserDatapack(metadata)) {
    await writeFileMetadata(assetconfigs.fileMetadata, metadata.storedFileName, datapackFolder, uuid);
  } else if (isServerDatapack(metadata) && !manual) {
    await addAdminConfigDatapack(metadata);
  }
  return datapackIndex;
}
