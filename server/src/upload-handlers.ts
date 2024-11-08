import {
  Datapack,
  DatapackIndex,
  MAX_AUTHORED_BY_LENGTH,
  MAX_DATAPACK_CONTACT_LENGTH,
  MAX_DATAPACK_DESC_LENGTH,
  MAX_DATAPACK_NOTES_LENGTH,
  MAX_DATAPACK_REFERENCES_ALLOWED,
  MAX_DATAPACK_REFERENCE_LENGTH,
  MAX_DATAPACK_TAGS_ALLOWED,
  MAX_DATAPACK_TAG_LENGTH,
  MAX_DATAPACK_TITLE_LENGTH,
  assertDatapack,
  assertUserDatapack,
  isDatapackTypeString,
  isDateValid,
  isUserDatapack
} from "@tsconline/shared";
import { FastifyReply } from "fastify";
import { copyFile, mkdir, readFile, rename, rm, writeFile } from "fs/promises";
import { DatapackMetadata } from "@tsconline/shared";
import { assetconfigs, checkFileExists, getBytes } from "./util.js";
import path from "path";
import {
  decryptDatapack,
  deleteDatapackFileAndDecryptedCounterpart,
  doesDatapackFolderExistInAllUUIDDirectories
} from "./user/user-handler.js";
import { fetchUserDatapackDirectory, getUserUUIDDirectory } from "./user/fetch-user-files.js";
import { loadDatapackIntoIndex } from "./load-packs.js";
import {
  CACHED_USER_DATAPACK_FILENAME,
  DATAPACK_PROFILE_PICTURE_FILENAME,
  DECRYPTED_DIRECTORY_NAME
} from "./constants.js";
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
  assertUserDatapack(datapack);
  assertDatapack(datapack);
  return datapack.storedFileName;
}

/**
 * Validate the fields and return the metadata if valid
 * @param reply 
 * @param fields
 * @param bytes Bytes read 
 * @returns The metadata if valid, otherwise void
 */
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
    datapackImage,
    priority
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
  if (title === "__proto__" || title === "constructor" || title === "prototype" || title.trim() !== title) {
    await userUploadHandler(reply, 400, "Invalid title", filepath);
    return;
  }
  if (title.length > MAX_DATAPACK_TITLE_LENGTH) {
    await userUploadHandler(reply, 400, `Max title length is ${MAX_DATAPACK_TITLE_LENGTH}`, filepath);
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
  if (tags.length > MAX_DATAPACK_TAGS_ALLOWED) {
    await userUploadHandler(reply, 400, `Max tags allowed is ${MAX_DATAPACK_TAGS_ALLOWED}`, filepath);
    return;
  }
  if (!tags.every((tag) => tag.length <= MAX_DATAPACK_TAG_LENGTH)) {
    await userUploadHandler(reply, 400, `Max tag length is ${MAX_DATAPACK_TAG_LENGTH}`, filepath);
    return;
  }
  if (authoredBy && authoredBy.length > MAX_AUTHORED_BY_LENGTH) {
    await userUploadHandler(reply, 400, `Max authored by length is ${MAX_AUTHORED_BY_LENGTH}`, filepath);
    return;
  }
  if (!priority || isNaN(parseInt(priority))) {
    await userUploadHandler(reply, 400, "Priority must be a number", filepath);
    return;
  }
  if (date && !isDateValid(date)) {
    await userUploadHandler(reply, 400, "Date must be a valid date string", filepath);
    return;
  }
  if (description && description.length > MAX_DATAPACK_DESC_LENGTH) {
    await userUploadHandler(reply, 400, `Max description length is ${MAX_DATAPACK_DESC_LENGTH}`, filepath);
    return;
  }
  if (notes && notes.length > MAX_DATAPACK_NOTES_LENGTH) {
    await userUploadHandler(reply, 400, `Max notes length is ${MAX_DATAPACK_NOTES_LENGTH}`, filepath);
    return;
  }
  if (references.length > MAX_DATAPACK_REFERENCES_ALLOWED) {
    await userUploadHandler(reply, 400, `Max references allowed is ${MAX_DATAPACK_REFERENCES_ALLOWED}`, filepath);
    return;
  }
  if (!references.every((reference) => reference.length <= MAX_DATAPACK_REFERENCE_LENGTH)) {
    await userUploadHandler(reply, 400, `Max references length is ${MAX_DATAPACK_REFERENCE_LENGTH}`, filepath);
    return;
  }
  if (contact && contact.length > MAX_DATAPACK_CONTACT_LENGTH) {
    await userUploadHandler(reply, 400, `Max contact length is ${MAX_DATAPACK_CONTACT_LENGTH}`, filepath);
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
    priority: parseInt(priority),
    isPublic: isPublic === "true",
    size: getBytes(bytes),
    ...(datapackImage && { datapackImage }),
    ...(contact && { contact }),
    ...(notes && { notes }),
    ...(date && { date })
  };
}

/**
 * ONLY REPLACES, does not write to cache
 * @param uuid
 * @param sourceFilePath
 * @param metadata
 */
export async function replaceDatapackFile(uuid: string, sourceFilePath: string, metadata: Datapack) {
  const datapackDirectory = await fetchUserDatapackDirectory(uuid, metadata.title);
  const filename = path.basename(sourceFilePath);
  const decryptionFilepath = path.join(datapackDirectory, DECRYPTED_DIRECTORY_NAME);
  const datapackFilepath = path.join(datapackDirectory, filename);
  await copyFile(sourceFilePath, datapackFilepath);
  if (sourceFilePath !== datapackFilepath) {
    await rm(sourceFilePath, { force: true });
  }
  await decryptDatapack(datapackFilepath, decryptionFilepath);
  const datapackIndex: DatapackIndex = {};
  const success = await loadDatapackIntoIndex(datapackIndex, decryptionFilepath, metadata);
  // will delete the whole directory if the file.
  // otherwise we would have a directory with no valid file, this makes it easier to manage (no dangling directories)
  if (!success || !datapackIndex[metadata.title]) {
    await rm(datapackDirectory, { recursive: true, force: true });
    throw new Error("Failed to load datapack into index, please reupload the file");
  }
  await deleteDatapackFileAndDecryptedCounterpart(uuid, metadata.title);
  return datapackIndex[metadata.title]!;
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
    // remove the original file if it was copied from a temp file
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
    await copyFile(datapackImageFilepath, datapackImageFilepathDest);
    // remove the original file if it was copied from a temp file
    if (datapackImageFilepath !== datapackImageFilepathDest) {
      await rm(datapackImageFilepath, { force: true });
    }
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
export async function getTemporaryFilepath(uuid: string, filename: string) {
  const directory = await getUserUUIDDirectory(uuid, false);
  return path.join(directory, filename);
}

/**
 * only updates the image, does not update the json cache
 * @param uuid
 * @param datapack
 * @param sourceFile
 */
export async function changeProfilePicture(uuid: string, datapack: string, sourceFile: string) {
  const origFilepath = await fetchDatapackProfilePictureFilepath(uuid, datapack);
  const imageName = DATAPACK_PROFILE_PICTURE_FILENAME + path.extname(sourceFile);
  if (!origFilepath) {
    const directory = await fetchUserDatapackDirectory(uuid, datapack);
    await rename(sourceFile, path.join(directory, imageName));
  } else {
    const dir = path.dirname(origFilepath);
    const imagePath = path.join(dir, imageName);
    await rm(origFilepath, { force: true });
    await rename(sourceFile, imagePath);
  }
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
    return { code: 400, message: "File is empty" };
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
  return null;
}
