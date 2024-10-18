import {
  DatapackIndex,
  assertDatapack,
  assertUserDatapack,
  isDatapackTypeString,
  isDateValid,
  isUserDatapack
} from "@tsconline/shared";
import { FastifyReply } from "fastify";
import { copyFile, mkdir, readFile, rm, writeFile } from "fs/promises";
import { DatapackMetadata } from "@tsconline/shared";
import { assetconfigs, checkFileExists, getBytes } from "./util.js";
import path from "path";
import { decryptDatapack, doesDatapackFolderExistInAllUUIDDirectories } from "./user/user-handler.js";
import { fetchUserDatapackDirectory, getUserUUIDDirectory } from "./user/fetch-user-files.js";
import { loadDatapackIntoIndex } from "./load-packs.js";
import { CACHED_USER_DATAPACK_FILENAME, DATAPACK_PROFILE_PICTURE_FILENAME } from "./constants.js";
import { writeFileMetadata } from "./file-metadata-handler.js";
import { MultipartFile } from "@fastify/multipart";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";

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
    uuid,
    datapackImage
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
    await userUploadHandler(reply, 400, "Invalid datapack type", filepath);
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
    ...(datapackImage && { datapackImage }),
    ...(contact && { contact }),
    ...(notes && { notes }),
    ...(date && { date })
  };
}

/**
 * THIS DOES NOT SETUP METADATA OR ADD TO ANY EXISTING INDEXES
 * TODO: WRITE TESTS
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
  manual: boolean, // if true, the source file will not be deleted and admin config will not be updated in memory or in the file system
  datapackImageFilepath?: string
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
  if (!manual && sourceFilePath !== sourceFileDestination) {
    await rm(sourceFilePath, { force: true });
  }
  await decryptDatapack(sourceFileDestination, decryptDestination);
  const successful = await loadDatapackIntoIndex(datapackIndex, decryptDestination, metadata);
  if (!successful || !datapackIndex[metadata.title]) {
    await rm(datapackFolder, { force: true });
    throw new Error("Failed to load datapack into index");
  }
  if (datapackImageFilepath) {
    const datapackImageFilepathDest = path.join(
      datapackFolder,
      DATAPACK_PROFILE_PICTURE_FILENAME + path.extname(datapackImageFilepath)
    );
    console.log("Copying profile picture to", datapackImageFilepathDest);
    await copyFile(datapackImageFilepath, datapackImageFilepathDest);
    await rm(datapackImageFilepath, { force: true });
  }
  await writeFile(
    path.join(datapackFolder, CACHED_USER_DATAPACK_FILENAME),
    JSON.stringify(datapackIndex[metadata.title]!, null, 2)
  );
  if (isUserDatapack(metadata)) {
    await writeFileMetadata(assetconfigs.fileMetadata, metadata.storedFileName, datapackFolder, uuid);
  }
  return datapackIndex;
}

export async function uploadFileToFileSystem(
  file: MultipartFile,
  filepath: string
): Promise<{ code: number; message: string }> {
  try {
    await pipeline(file.file, createWriteStream(filepath));
  } catch (e) {
    return { code: 500, message: "Failed to save file" };
  }
  if (file.file.truncated) {
    await rm(filepath, { force: true });
    return { code: 400, message: "File is too large" };
  }
  if (file.file.bytesRead === 0) {
    await rm(filepath, { force: true });
    return { code: 400, message: "Empty file" };
  }
  return { code: 200, message: "File uploaded" };
}

export async function fetchDatapackProfilePictureFilepath(uuid: string, datapackTitle: string) {
  const directory = await fetchUserDatapackDirectory(uuid, datapackTitle);
  const possibleExtensions = [".png", ".jpeg", ".jpg"];

  // Loop through possible extensions and check if the file exists
  for (const ext of possibleExtensions) {
    const profilePicturePath = path.join(directory, DATAPACK_PROFILE_PICTURE_FILENAME + ext);
    if (await checkFileExists(profilePicturePath)) {
      return profilePicturePath;
    }
  }
  throw new Error("Profile picture does not exist");
}
