import { access, mkdir, readFile, readdir, rename, rm, writeFile } from "fs/promises";
import path from "path";
import { CACHED_USER_DATAPACK_FILENAME } from "../constants.js";
import { assetconfigs, verifyFilepath, verifyNonExistentFilepath } from "../util.js";
import { Datapack, assertDatapack } from "@tsconline/shared";
import logger from "../error-logger.js";
import { changeFileMetadataKey, deleteDatapackFoundInMetadata } from "../file-metadata-handler.js";
import { spawn } from "child_process";

export async function doesDatapackFolderExistInAllUUIDDirectories(uuid: string, datapack: string): Promise<boolean> {
  const directories = await getAllUserDatapackDirectories(uuid);
  for (const directory of directories) {
    if (directory) {
      const datapacks = await getDirectories(directory);
      if (datapacks.includes(datapack)) {
        return true;
      }
    }
  }
  return false;
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
 * fetch all datapacks a user has
 * @param uuid
 * @returns
 */
export async function fetchAllUsersDatapacks(uuid: string): Promise<Datapack[]> {
  const directories = await getAllUserDatapackDirectories(uuid);
  const datapacksArray: Datapack[] = [];
  for (const directory of directories) {
    const datapacks = await getDirectories(directory);
    for (const datapack of datapacks) {
      const cachedDatapack = path.join(directory, datapack, CACHED_USER_DATAPACK_FILENAME);
      const parsedCachedDatapack = JSON.parse(await readFile(cachedDatapack, "utf-8"));
      if (await verifyFilepath(cachedDatapack)) {
        if (datapacksArray.find((datapack) => datapack === parsedCachedDatapack.title)) {
          logger.error(`File system is corrupted, multiple datapacks with the same name: ${datapack}`);
          throw new Error(`Datapack ${datapack} already exists in the index`);
        }
        assertDatapack(parsedCachedDatapack);
        datapacksArray.push(parsedCachedDatapack);
      }
    }
  }
  return datapacksArray;
}

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

/**
 * get all the uuid directories, not the datapacks themselves
 * @param uuid
 * @returns
 */
async function getAllUserDatapackDirectories(uuid: string): Promise<string[]> {
  return [
    await getPrivateUserUUIDDirectory(uuid).catch(() => ""),
    await getPublicUserUUIDDirectory(uuid).catch(() => "")
  ].filter(Boolean);
}
export async function fetchUserDatapackFilepath(uuid: string, datapack: string): Promise<string> {
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
 * gets the user uuid directory, public or private
 * @param uuid
 * @param isPublic
 * @returns
 */
export async function getUserUUIDDirectory(uuid: string, isPublic: boolean): Promise<string> {
  return isPublic ? getPublicUserUUIDDirectory(uuid) : getPrivateUserUUIDDirectory(uuid);
}

/**
 * fetches the user datapack, public or private
 * @param uuid
 * @param datapack
 * @returns
 */
export async function fetchUserDatapack(uuid: string, datapack: string): Promise<Datapack> {
  const directories = await getAllUserDatapackDirectories(uuid);
  for (const directory of directories) {
    if (directory) {
      const cachedDatapack = path.join(directory, datapack, CACHED_USER_DATAPACK_FILENAME);
      if (await verifyFilepath(cachedDatapack)) {
        const parsedCachedDatapack = JSON.parse(await readFile(cachedDatapack, "utf-8"));
        assertDatapack(parsedCachedDatapack);
        return parsedCachedDatapack;
      }
    }
  }
  const datapackPath = await fetchUserDatapackFilepath(uuid, datapack);
  const cachedDatapack = path.join(datapackPath, CACHED_USER_DATAPACK_FILENAME);
  if (!cachedDatapack || !(await verifyFilepath(cachedDatapack))) {
    throw new Error(`File ${datapack} doesn't exist`);
  }
  const parsedCachedDatapack = JSON.parse(await readFile(cachedDatapack, "utf-8"));
  assertDatapack(parsedCachedDatapack);
  return parsedCachedDatapack;
}

/**
 * rename a user datapack which means we have to rename the folder and the file metadata (the key only)
 * @param uuid
 * @param oldDatapack
 * @param datapack
 */
export async function renameUserDatapack(uuid: string, oldDatapack: string, datapack: Datapack): Promise<void> {
  const oldDatapackPath = await fetchUserDatapackFilepath(uuid, oldDatapack);
  const oldDatapackMetadata = await fetchUserDatapack(uuid, oldDatapack);
  const newDatapackPath = path.join(path.dirname(oldDatapackPath), datapack.title);
  if (!path.resolve(newDatapackPath).startsWith(path.resolve(path.dirname(oldDatapackPath)))) {
    throw new Error("Invalid filepath");
  }
  try {
    await fetchUserDatapack(uuid, datapack.title);
    throw new Error("Datapack with that title already exists");
  } catch (e) {
    // eslint-disable-next-line
  }
  await rename(oldDatapackPath, newDatapackPath);
  await writeUserDatapack(uuid, datapack).catch(async (e) => {
    await rename(newDatapackPath, oldDatapackPath);
    throw e;
  });
  await changeFileMetadataKey(assetconfigs.fileMetadata, oldDatapackPath, newDatapackPath).catch(async (e) => {
    await rename(newDatapackPath, oldDatapackPath);
    // revert the write if the metadata change fails
    await writeUserDatapack(uuid, oldDatapackMetadata);
    throw e;
  });
}

/**
 * deletes all the user datapacks, public and private
 * @param uuid
 */
export async function deleteAllUserDatapacks(uuid: string): Promise<void> {
  const directories = await getAllUserDatapackDirectories(uuid);
  for (const directory of directories) {
    // just to make sure it's not falsy ie ""
    if (directory) {
      await rm(directory, { recursive: true, force: true });
      await deleteDatapackFoundInMetadata(assetconfigs.fileMetadata, directory);
    }
  }
}

/**
 * deletes a single user datapack
 * @param uuid
 * @param datapack
 */
export async function deleteUserDatapack(uuid: string, datapack: string): Promise<void> {
  const datapackPath = await fetchUserDatapackFilepath(uuid, datapack);
  if (!(await verifyFilepath(datapackPath))) {
    throw new Error("Invalid filepath");
  }
  await rm(datapackPath, { recursive: true, force: true });
  await deleteDatapackFoundInMetadata(assetconfigs.fileMetadata, datapackPath);
}

export async function deleteServerDatapack(datapack: string): Promise<void> {
  const datapackPath = await fetchUserDatapackFilepath("server", datapack);
  if (!(await verifyFilepath(datapackPath))) {
    throw new Error("Invalid filepath");
  }
  await rm(datapackPath, { recursive: true, force: true });
}

/**
 * writes a user datapack to the file system
 * @param uuid
 * @param datapack
 */
export async function writeUserDatapack(uuid: string, datapack: Datapack): Promise<void> {
  const datapackPath = path.join(await fetchUserDatapackFilepath(uuid, datapack.title), CACHED_USER_DATAPACK_FILENAME);
  if (!(await verifyFilepath(datapackPath))) {
    throw new Error("Invalid filepath");
  }
  await writeFile(datapackPath, JSON.stringify(datapack, null, 2));
}
export async function decryptDatapack(filepath: string, outputDirectory: string): Promise<void> {
  const filenameWithoutExtension = path.parse(filepath).name;
  const args = [
    "-jar",
    assetconfigs.decryptionJar,
    "-d",
    filepath.replaceAll("\\", "/"),
    "-dest",
    outputDirectory.replaceAll("\\", "/")
  ];
  await new Promise<void>((resolve, reject) => {
    const cmd = "java";
    const javaProcess = spawn(cmd, args, { timeout: 1000 * 60 * 5, killSignal: "SIGKILL" });
    let stdout = "";
    let stderr = "";
    javaProcess.stdout.on("data", (data) => {
      stdout += data;
    });
    javaProcess.stderr.on("data", (data) => {
      stderr += data;
    });
    javaProcess.on("error", (error) => {
      reject(error);
    });
    javaProcess.on("close", (code, signal) => {
      if (signal == "SIGKILL") {
        reject(new Error("Process timed out"));
        return;
      }
      console.log("Java process finished");
      console.log("Java stdout: " + stdout);
      console.log("Java stderr: " + stderr);
      resolve();
    });
  });
  await access(path.join(outputDirectory, filenameWithoutExtension));
  await access(path.join(outputDirectory, filenameWithoutExtension, "datapacks"));
}
