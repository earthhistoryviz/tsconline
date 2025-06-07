import {
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
  assertDatapackMetadata,
  assertUserDatapack,
  isDatapackTypeString,
  isDateValid,
  isUserDatapack
} from "@tsconline/shared";
import { copyFile, mkdir, readFile, readdir, rename, rm, writeFile } from "fs/promises";
import { DatapackMetadata } from "@tsconline/shared";
import { assetconfigs, checkFileExists, getBytes, makeTempFilename, verifyNonExistentFilepath } from "./util.js";
import path, { extname, join } from "path";
import {
  checkFileTypeIsDatapack,
  checkFileTypeIsDatapackImage,
  checkFileTypeIsPDF,
  decryptDatapack,
  deleteDatapackFileAndDecryptedCounterpart,
  doesDatapackFolderExistInAllUUIDDirectories
} from "./user/user-handler.js";
import {
  fetchUserDatapackDirectory,
  getUsersDatapacksDirectoryFromUUIDDirectory,
  getUnsafeCachedDatapackFilePath,
  getUserUUIDDirectory,
  getPDFFilesDirectoryFromDatapackDirectory,
  getDirectories,
  getDecryptedDirectory
} from "./user/fetch-user-files.js";
import { loadDatapackIntoIndex } from "./load-packs.js";
import {
  DATAPACK_PROFILE_PICTURE_FILENAME,
  DECRYPTED_DIRECTORY_NAME,
  MAPPACK_DIRECTORY_NAME,
  WORKSHOP_COVER_PICTURE
} from "./constants.js";
import { writeFileMetadata } from "./file-metadata-handler.js";
import { Multipart, MultipartFile } from "@fastify/multipart";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import { tmpdir } from "os";
import { OperationResult } from "./types.js";
import { findUser } from "./database.js";
import { getWorkshopUUIDFromWorkshopId, getWorkshopCoverPath, getWorkshopFilesPath } from "./workshop/workshop-util.js";

async function userUploadHandler(filepath?: string, tempProfilePictureFilepath?: string) {
  filepath && (await rm(filepath, { force: true }));
  tempProfilePictureFilepath && (await rm(tempProfilePictureFilepath, { force: true }));
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
  fields: Record<string, string>,
  bytes: number
): Promise<DatapackMetadata | OperationResult> {
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
    tempProfilePictureFilepath,
    priority,
    hasFiles
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
    !hasFiles
  ) {
    await userUploadHandler(filepath, tempProfilePictureFilepath);
    return { code: 400, message: "Missing required fields" };
  }
  if (title === "__proto__" || title === "constructor" || title === "prototype" || title.trim() !== title) {
    await userUploadHandler(filepath, tempProfilePictureFilepath);
    return { code: 400, message: "Invalid title" };
  }
  if (title.length > MAX_DATAPACK_TITLE_LENGTH) {
    await userUploadHandler(filepath);
    return { code: 400, message: `Max title length is ${MAX_DATAPACK_TITLE_LENGTH}` };
  }
  if (!bytes) {
    await userUploadHandler(filepath, tempProfilePictureFilepath);
    return { code: 400, message: "File is empty" };
  }
  if (!isDatapackTypeString(type)) {
    await userUploadHandler(filepath, tempProfilePictureFilepath);
    return { code: 400, message: "Invalid datapack type" };
  }
  try {
    references = JSON.parse(references);
    tags = JSON.parse(tags);
  } catch {
    await userUploadHandler(filepath, tempProfilePictureFilepath);
    return { code: 400, message: "References and tags must be valid arrays" };
  }
  if (!Array.isArray(references) || !references.every((ref) => typeof ref === "string")) {
    await userUploadHandler(filepath, tempProfilePictureFilepath);
    return { code: 400, message: "References must be an array of strings" };
  }
  if (!Array.isArray(tags) || !tags.every((tag) => typeof tag === "string")) {
    await userUploadHandler(filepath, tempProfilePictureFilepath);
    return { code: 400, message: "Tags must be an array of strings" };
  }
  if (tags.length > MAX_DATAPACK_TAGS_ALLOWED) {
    await userUploadHandler(filepath, tempProfilePictureFilepath);
    return { code: 400, message: `Max tags allowed is ${MAX_DATAPACK_TAGS_ALLOWED}` };
  }
  if (!tags.every((tag) => tag.length <= MAX_DATAPACK_TAG_LENGTH)) {
    await userUploadHandler(filepath, tempProfilePictureFilepath);
    return { code: 400, message: `Max tag length is ${MAX_DATAPACK_TAG_LENGTH}` };
  }
  if (authoredBy && authoredBy.length > MAX_AUTHORED_BY_LENGTH) {
    await userUploadHandler(filepath, tempProfilePictureFilepath);
    return { code: 400, message: `Max authored by length is ${MAX_AUTHORED_BY_LENGTH}` };
  }
  if (!priority || isNaN(parseInt(priority))) {
    await userUploadHandler(filepath, tempProfilePictureFilepath);
    return { code: 400, message: "Priority must be a number" };
  }
  if (date && !isDateValid(date)) {
    await userUploadHandler(filepath, tempProfilePictureFilepath);
    return { code: 400, message: "Date must be a valid date string" };
  }
  if (description && description.length > MAX_DATAPACK_DESC_LENGTH) {
    await userUploadHandler(filepath, tempProfilePictureFilepath);
    return { code: 400, message: `Max description length is ${MAX_DATAPACK_DESC_LENGTH}` };
  }
  if (notes && notes.length > MAX_DATAPACK_NOTES_LENGTH) {
    await userUploadHandler(filepath, tempProfilePictureFilepath);
    return { code: 400, message: `Max notes length is ${MAX_DATAPACK_NOTES_LENGTH}` };
  }
  if (references.length > MAX_DATAPACK_REFERENCES_ALLOWED) {
    await userUploadHandler(filepath, tempProfilePictureFilepath);
    return { code: 400, message: `Max references allowed is ${MAX_DATAPACK_REFERENCES_ALLOWED}` };
  }
  if (!references.every((reference) => reference.length <= MAX_DATAPACK_REFERENCE_LENGTH)) {
    await userUploadHandler(filepath, tempProfilePictureFilepath);
    return { code: 400, message: `Max references length is ${MAX_DATAPACK_REFERENCE_LENGTH}` };
  }
  if (contact && contact.length > MAX_DATAPACK_CONTACT_LENGTH) {
    await userUploadHandler(filepath, tempProfilePictureFilepath);
    return { code: 400, message: `Max contact length is ${MAX_DATAPACK_CONTACT_LENGTH}` };
  }
  try {
    const metadata = {
      originalFileName,
      storedFileName,
      description,
      title,
      authoredBy,
      references,
      tags,
      type,
      priority: parseInt(priority),
      isPublic: isPublic === "true",
      hasFiles: hasFiles === "true",
      size: getBytes(bytes),
      ...(uuid && { uuid }),
      ...(datapackImage && { datapackImage }),
      ...(tempProfilePictureFilepath && { tempProfilePictureFilepath }),
      ...(contact && { contact }),
      ...(notes && { notes }),
      ...(date && { date })
    };
    assertDatapackMetadata(metadata);
    return metadata;
  } catch (e) {
    await userUploadHandler(filepath, tempProfilePictureFilepath);
    return { code: 400, message: "Invalid metadata received/processed" };
  }
}

/**
 * ONLY REPLACES, does not write to cache
 * @param uuid
 * @param sourceFilePath
 * @param metadata MAKE SURE THIS IS ONLY DATAPACK METADATA @WARNING
 */
export async function replaceDatapackFile(uuid: string, sourceFilePath: string, metadata: DatapackMetadata) {
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
 * @param sourceFilePath
 * @param metadata
 * @param manual
 * @param pdfFields
 * @param datapackImageFilepath
 * @returns
 */
export async function setupNewDatapackDirectoryInUUIDDirectory(
  uuid: string,
  sourceFilePath: string,
  metadata: DatapackMetadata,
  manual: boolean, // if true, the source file will not be deleted and admin config will not be updated in memory or in the file system
  datapackImageFilepath?: string,
  pdfFields?: { [fileName: string]: string }
) {
  if (await doesDatapackFolderExistInAllUUIDDirectories(uuid, metadata.title)) {
    throw new Error("Datapack already exists");
  }
  const datapackIndex: DatapackIndex = {};
  const directory = await getUserUUIDDirectory(uuid, metadata.isPublic);
  const datapacksFolder = await getUsersDatapacksDirectoryFromUUIDDirectory(directory);
  const datapackFolder = path.join(datapacksFolder, metadata.title);
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
    if (!manual && datapackImageFilepath !== datapackImageFilepathDest) {
      await rm(datapackImageFilepath, { force: true });
    }
  }
  if (pdfFields && Object.keys(pdfFields).length > 0) {
    const filesDir = await getPDFFilesDirectoryFromDatapackDirectory(datapackFolder);
    for (const [pdfFileName, pdfFilePath] of Object.entries(pdfFields)) {
      if (!pdfFilePath || !pdfFileName) continue;
      const datapackPDFFilepathDest = path.resolve(filesDir, pdfFileName);
      if (
        !datapackPDFFilepathDest.startsWith(filesDir) ||
        !(await verifyNonExistentFilepath(datapackPDFFilepathDest))
      ) {
        throw new Error("Invalid datapack PDF filepath destination path");
      }
      await copyFile(pdfFilePath, datapackPDFFilepathDest);
      // remove the original file if it was copied from a temp file
      if (!manual && pdfFilePath !== datapackPDFFilepathDest) {
        await rm(pdfFilePath, { force: true });
      }
    }
  }
  await writeFile(
    getUnsafeCachedDatapackFilePath(datapackFolder),
    JSON.stringify(datapackIndex[metadata.title]!, null, 2)
  );
  // could change when we want to allow users make workshops
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
    return { code: 413, message: "File is too large" };
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

export async function fetchMapPackImageFilepath(uuid: string, datapackTitle: string, img: string) {
  const directory = await fetchUserDatapackDirectory(uuid, datapackTitle);
  const decryptedDirectory = getDecryptedDirectory(directory);
  const dirs = await getDirectories(decryptedDirectory);
  for (const dir of dirs) {
    const mapImagePath = path.join(decryptedDirectory, dir, MAPPACK_DIRECTORY_NAME, img);
    if (await checkFileExists(mapImagePath)) {
      return mapImagePath;
    }
  }
  return null;
}

export async function processMultipartPartsForDatapackUpload(
  uuid: string | undefined,
  parts: AsyncIterableIterator<Multipart>,
  options?: { bearerToken?: string }
): Promise<
  | { fields: { [key: string]: string }; file: MultipartFile; pdfFields?: { [fileName: string]: string } }
  | OperationResult
> {
  let file: MultipartFile | undefined;
  let filepath: string | undefined;
  let originalFileName: string | undefined;
  let storedFileName: string | undefined;
  let tempProfilePictureFilepath: string | undefined;
  const pdfFields: Record<string, string> = {};
  let datapackImage: string | undefined;
  const fields: { [key: string]: string } = {};
  async function cleanupTempFiles() {
    if (tempProfilePictureFilepath) {
      await rm(tempProfilePictureFilepath, { force: true });
    }
    if (filepath) {
      await rm(filepath, { force: true });
    }
    for (const pdfPath of Object.values(pdfFields)) {
      await rm(pdfPath, { force: true });
    }
  }
  const user = await findUser({ uuid }).catch(() => []);
  if ((!uuid || !user || !user[0]) && uuid !== "official") {
    return { code: 404, message: "User not found" };
  }
  const isProOrAdmin = user[0] && (user[0].isAdmin || user[0].accountType === "pro");
  for await (const part of parts) {
    if (part.type === "file") {
      if (part.fieldname === "datapack") {
        // DOWNLOAD FILE HERE AND SAVE TO FILE
        file = part;
        originalFileName = file.filename;
        storedFileName = makeTempFilename(originalFileName);
        // store it temporarily in the /tmp directory
        // this is because we can't check if the file should overwrite the existing file until we verify it
        filepath = join(tmpdir(), storedFileName);
        if (!checkFileTypeIsDatapack(file)) {
          await cleanupTempFiles();
          return { code: 415, message: "Invalid file type for datapack file" };
        }
        if (file.file.bytesRead > 3000 && !isProOrAdmin) {
          if (!(process.env.BEARER_TOKEN && options?.bearerToken === process.env.BEARER_TOKEN)) {
            await cleanupTempFiles();
            return { code: 413, message: "File is too large" };
          }
        }
        const { code, message } = await uploadFileToFileSystem(file, filepath);
        if (code !== 200) {
          await cleanupTempFiles();
          return { code, message };
        }
      } else if (part.fieldname === DATAPACK_PROFILE_PICTURE_FILENAME) {
        if (!checkFileTypeIsDatapackImage(part)) {
          await cleanupTempFiles();
          return { code: 415, message: "Invalid file type for datapack image" };
        }
        datapackImage = DATAPACK_PROFILE_PICTURE_FILENAME + extname(part.filename);
        tempProfilePictureFilepath = join(tmpdir(), datapackImage);
        const { code, message } = await uploadFileToFileSystem(part, tempProfilePictureFilepath);
        if (code !== 200) {
          await cleanupTempFiles();
          return { code, message };
        }
      } else if (part.fieldname == "pdfFiles[]") {
        if (!checkFileTypeIsPDF(part)) {
          await cleanupTempFiles();
          return { code: 415, message: "Invalid file type for datapack pdf file" };
        }
        const filePath = join(tmpdir(), part.filename);
        pdfFields[part.filename] = filePath;
        const { code, message } = await uploadFileToFileSystem(part, filePath);
        if (code !== 200) {
          await cleanupTempFiles();
          return { code, message };
        }
      }
    } else if (part.type === "field" && typeof part.fieldname === "string" && typeof part.value === "string") {
      fields[part.fieldname] = part.value;
    }
  }
  if (!file || !filepath || !originalFileName || !storedFileName) {
    await cleanupTempFiles();
    return { code: 400, message: "Missing file" };
  }
  return {
    file,
    fields: {
      ...fields,
      filepath,
      originalFileName,
      storedFileName,
      priority: "0",
      ...(datapackImage && { datapackImage }),
      ...(tempProfilePictureFilepath && { tempProfilePictureFilepath })
    },
    ...(Object.keys(pdfFields).length > 0 && { pdfFields })
  };
}

export async function uploadFilesToWorkshop(workshopId: number, file: MultipartFile) {
  const workshopUUID = getWorkshopUUIDFromWorkshopId(workshopId);
  const directory = await getUserUUIDDirectory(workshopUUID, true);
  let filesFolder;
  try {
    filesFolder = await getWorkshopFilesPath(directory);
  } catch (error) {
    console.error(error);
    return { code: 500, message: error instanceof Error ? error.message : "Invalid Workshop Files Directory." };
  }

  const filename = file.filename;
  const filePath = join(filesFolder, filename);
  try {
    const { code, message } = await uploadFileToFileSystem(file, filePath);
    if (code !== 200) {
      await rm(filePath, { force: true }).catch((e) => {
        console.error(e);
      });
    }
    return { code, message };
  } catch (error) {
    await rm(filePath, { force: true }).catch((e) => {
      console.error(e);
    });
    return { code: 500, message: error instanceof Error ? error.message : "Failed to upload file To file System." };
  }
}

export async function uploadCoverPicToWorkshop(workshopId: number, coverPicture: MultipartFile) {
  const workshopUUID = getWorkshopUUIDFromWorkshopId(workshopId);
  const directory = await getUserUUIDDirectory(workshopUUID, true);
  let filesFolder;
  try {
    filesFolder = await getWorkshopCoverPath(directory);
  } catch (error) {
    console.error(error);
    return { code: 500, message: error instanceof Error ? error.message : "Invalid Workshop Cover Directory." };
  }
  const oldCover = await fetchWorkshopCoverPictureFilepath(workshopId);
  if (oldCover) {
    await rm(oldCover, { force: true }).catch((e) => {
      console.error(e);
    });
  }
  const filename = coverPicture.filename;
  const fileExtension = path.extname(filename);
  const filePath = join(filesFolder, `${WORKSHOP_COVER_PICTURE}${fileExtension}`);
  try {
    const { code, message } = await uploadFileToFileSystem(coverPicture, filePath);
    if (code !== 200) {
      await rm(filePath, { force: true }).catch((e) => {
        console.error(e);
      });
    }
    return { code, message };
  } catch (error) {
    await rm(filePath, { force: true }).catch((e) => {
      console.error(e);
    });
    return { code: 500, message: error instanceof Error ? error.message : "Failed to upload file To file System." };
  }
}

export async function fetchWorkshopCoverPictureFilepath(workshopId: number) {
  const workshopUUID = getWorkshopUUIDFromWorkshopId(workshopId);
  const directory = await getUserUUIDDirectory(workshopUUID, true);

  let filesFolder;
  try {
    filesFolder = await getWorkshopCoverPath(directory);
  } catch (error) {
    console.error(error);
    return null;
  }
  const possibleExtensions = [".png", ".jpeg", ".jpg"];
  // Loop through possible extensions and check if the file exists
  for (const ext of possibleExtensions) {
    const coverPicturePath = path.join(filesFolder, WORKSHOP_COVER_PICTURE + ext);
    if (await checkFileExists(coverPicturePath)) {
      return coverPicturePath;
    }
  }
  return null;
}

/**
 * get the name of all datapacks of a workshop. Since they will be stored in the form of directories, this function retrieves the name of each subdir under a workshop dir.
 * @param workshopId workshop id
 * @returns the name of all datapacks of a workshop
 */
export async function getWorkshopDatapacksNames(workshopId: number): Promise<string[]> {
  const workshopUUID = getWorkshopUUIDFromWorkshopId(workshopId);
  const directory = await getUserUUIDDirectory(workshopUUID, true);
  let datapacksDirectory;
  try {
    datapacksDirectory = await getUsersDatapacksDirectoryFromUUIDDirectory(directory);
  } catch (error) {
    console.error(error);
    return [];
  }
  try {
    const entries = readdir(datapacksDirectory, { withFileTypes: true });
    const folders = (await entries).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
    return folders;
  } catch (error) {
    console.error(`Error reading directory ${directory}:`, error);
    return [];
  }
}

/**
 * get the name of all files of a workshop.
 * @param workshopId workshop id
 * @returns the name of all files of a workshop
 */
export async function getWorkshopFilesNames(workshopId: number): Promise<string[]> {
  const workshopUUID = getWorkshopUUIDFromWorkshopId(workshopId);
  const directory = await getUserUUIDDirectory(workshopUUID, true);
  let filesFolder;
  try {
    filesFolder = await getWorkshopFilesPath(directory);
  } catch (error) {
    console.error(error);
    return [];
  }
  try {
    const entries = readdir(filesFolder, { withFileTypes: true });
    const files = (await entries).map((entry) => entry.name);
    return files;
  } catch (e) {
    const error = e as NodeJS.ErrnoException;
    if (error.code === "ENOENT") {
      return [];
    }
    console.error(`Error reading directory ${filesFolder}:`, error);
    return [];
  }
}
