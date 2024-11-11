import { mkdir, readdir } from "fs/promises";
import path from "path";
import { assetconfigs, verifyNonExistentFilepath, verifyFilepath } from "../util.js";

// TODO WRITE TESTS FOR WHOLE FILE
/**
 * get the private and public user datapack directories
 * @param uuid
 * @returns
 */
export async function getPrivateUserUUIDDirectory(uuid: string): Promise<string> {
  const userDirectory = path.join(assetconfigs.privateDatapacksDirectory, uuid);
  if (!(await verifyNonExistentFilepath(userDirectory))) {
    await mkdir(userDirectory, { recursive: true });
  }
  if (!(await verifyFilepath(userDirectory))) {
    throw new Error("Invalid filepath");
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
  if (!(await verifyNonExistentFilepath(userDirectory))) {
    await mkdir(userDirectory, { recursive: true });
  }
  if (!(await verifyFilepath(userDirectory))) {
    throw new Error("Invalid filepath");
  }
  return userDirectory;
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
    await getPrivateUserUUIDDirectory(uuid).catch(() => ""),
    await getPublicUserUUIDDirectory(uuid).catch(() => "")
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
