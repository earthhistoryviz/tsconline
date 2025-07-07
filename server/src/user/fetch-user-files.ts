import { mkdir, readFile, readdir } from "fs/promises";
import path from "path";
import { assetconfigs, verifyNonExistentFilepath, verifyFilepath } from "../util.js";
import { CACHED_USER_DATAPACK_FILENAME, DECRYPTED_DIRECTORY_NAME } from "../constants.js";
import { fetchUserDatapack } from "./user-handler.js";
import { assertDatapack } from "@tsconline/shared";

export function getDecryptedDirectory(directory: string) {
  return path.join(directory, DECRYPTED_DIRECTORY_NAME);
}
export async function getDecryptedDatapackFilePath(uuid: string, datapackTitle: string) {
  const directory = await fetchUserDatapackDirectory(uuid, datapackTitle);
  const decryptedDirectory = getDecryptedDirectory(directory);
  const datapackJson = await fetchUserDatapack(uuid, datapackTitle);
  const decryptedDatapackDirectory = path.join(
    decryptedDirectory,
    path.parse(datapackJson.storedFileName).name,
    "datapacks"
  );
  const dirs = await readdir(decryptedDatapackDirectory, { withFileTypes: true });
  for (const file of dirs) {
    if (path.extname(file.name) === ".txt") {
      return path.join(decryptedDatapackDirectory, file.name);
    }
  }
  throw new Error("No decrypted datapack found");
}

// TODO WRITE TESTS FOR WHOLE FILE
/**
 * get the private user datapack directories
 * @param uuid
 * @returns
 */
export async function getPrivateUserUUIDDirectory(uuid: string): Promise<string> {
  const userDirectory = path.join(assetconfigs.privateDatapacksDirectory, uuid);
  if (!(await verifyFilepath(userDirectory))) {
    if (await verifyNonExistentFilepath(userDirectory)) {
      await mkdir(userDirectory, { recursive: true });
    } else {
      throw new Error("Invalid filepath");
    }
  }
  return userDirectory;
}
/**
 * get the public user datapack directory
 * @param uuid
 * @returns
 */
export async function getPublicUserUUIDDirectory(uuid: string): Promise<string> {
  const userDirectory = path.join(assetconfigs.publicDatapacksDirectory, uuid);
  if (!(await verifyFilepath(userDirectory))) {
    if (await verifyNonExistentFilepath(userDirectory)) {
      await mkdir(userDirectory, { recursive: true });
    } else {
      throw new Error("Invalid filepath");
    }
  }
  return userDirectory;
}

export async function getUsersPublicDatapacksDirectoryFromUUID(uuid: string) {
  const dir = await getPublicUserUUIDDirectory(uuid);
  const datpackDir = path.join(dir, "datapacks");
  if (!(await verifyFilepath(datpackDir))) {
    if (await verifyNonExistentFilepath(datpackDir)) {
      await mkdir(datpackDir, { recursive: true });
    } else {
      throw new Error("Invalid filepath");
    }
  }
  return datpackDir;
}

export async function getUsersPrivateDatapacksDirectoryFromUUID(uuid: string) {
  const dir = await getPrivateUserUUIDDirectory(uuid);
  const datpackDir = path.join(dir, "datapacks");
  if (!(await verifyFilepath(datpackDir))) {
    if (await verifyNonExistentFilepath(datpackDir)) {
      await mkdir(datpackDir, { recursive: true });
    } else {
      throw new Error("Invalid filepath");
    }
  }
  return datpackDir;
}

export async function getUsersDatapacksDirectoryFromUUIDDirectory(directory: string) {
  const datpackDir = path.join(directory, "datapacks");
  if (!(await verifyFilepath(datpackDir))) {
    if (await verifyNonExistentFilepath(datpackDir)) {
      await mkdir(datpackDir, { recursive: true });
    } else {
      throw new Error("Invalid filepath");
    }
  }
  return datpackDir;
}

export function getUnsafeCachedDatapackFilePath(directory: string) {
  return path.join(directory, CACHED_USER_DATAPACK_FILENAME);
}

export async function getCachedDatapackFilePath(directory: string) {
  const cachedDatapackFilePath = path.join(directory, CACHED_USER_DATAPACK_FILENAME);
  if (!(await verifyFilepath(cachedDatapackFilePath))) {
    throw new Error("Invalid filepath");
  }
  return cachedDatapackFilePath;
}

export async function getCachedDatapackFromDirectory(directory: string) {
  const cachedDatapackFilePath = await getCachedDatapackFilePath(directory);
  const datapack = JSON.parse(await readFile(cachedDatapackFilePath, "utf-8"));
  assertDatapack(datapack);
  return datapack;
}

export async function fetchUserDatapackDirectory(uuid: string, datapack: string): Promise<string> {
  // check both public and private directories
  const directoriesToCheck: string[] = await getAllUserDatapackDirectories(uuid);
  for (const directory of directoriesToCheck) {
    if (directory) {
      try {
        const datapacks = await getDirectories(directory);
        if (datapacks.includes(datapack)) {
          return path.join(directory, datapack);
        }
      } catch (e) {
        // eslint-disable-next-line
      }
    }
  }
  throw new Error(`File ${datapack} doesn't exist`);
}
/**
 * get the directories at a source
 * @param source
 * @returns
 */
export async function getDirectories(source: string): Promise<string[]> {
  const entries = await readdir(source, { withFileTypes: true });
  return entries.filter((dirent) => dirent.isDirectory()).map((dirent) => dirent.name);
}
/**
 * get all the uuid directories, not the datapacks themselves
 * @param uuid
 * @returns
 */
export async function getAllUserDatapackDirectories(uuid: string): Promise<string[]> {
  return [
    await getUsersPrivateDatapacksDirectoryFromUUID(uuid).catch(() => ""),
    await getUsersPublicDatapacksDirectoryFromUUID(uuid).catch(() => "")
  ].filter(Boolean);
}
/**
 * gets the user uuid directory, public or private
 * @param uuid
 * @param isPublic
 * @returns
 */
export async function getUserUUIDDirectory(uuid: string, isPublic: boolean): Promise<string> {
  return isPublic ? getPublicUserUUIDDirectory(uuid) : getPrivateUserUUIDDirectory(uuid);
}

export async function getPDFFilesDirectoryFromDatapackDirectory(directory: string) {
  const pdfFileDir = path.resolve(directory, "files");
  if (!(await verifyFilepath(pdfFileDir))) {
    if (await verifyNonExistentFilepath(pdfFileDir)) {
      await mkdir(pdfFileDir, { recursive: true });
    } else {
      throw new Error("Invalid filepath");
    }
  }
  return pdfFileDir;
}

export async function getDatapackZipFileIfExists(uuid: string, datapackTitle: string) {
  const directory = await fetchUserDatapackDirectory(uuid, datapackTitle);
  const zipFilePath = getDatapackZipFilePath(directory, datapackTitle);
  if (!(await verifyFilepath(zipFilePath))) {
    return null;
  }
  return await readFile(zipFilePath);
}

export const getDatapackZipFilePath = (directory: string, datapackTitle: string) => {
  return path.join(directory, `${datapackTitle}.zip`);
};
