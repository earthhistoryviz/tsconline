import { access, readFile, rm, writeFile } from "fs/promises";
import { assertFileMetadataIndex } from "./types.js";
import { checkFileExists } from "./util.js";
import { Mutex } from "async-mutex";

const mutex = new Mutex();
export const sunsetInterval = 1000 * 60 * 60 * 24 * 14;

/**
 * load the metadata from the file
 * @param destination
 * @returns
 */
export async function loadFileMetadata(destination: string) {
  try {
    await access(destination);
  } catch (e) {
    await writeFile(destination, "{}");
  }
  const metadata = await readFile(destination, "utf-8");
  const parsedMetadata = JSON.parse(metadata);
  assertFileMetadataIndex(parsedMetadata);
  return parsedMetadata;
}

/**
 * Writes the metadata to the file
 * @param metadata
 * @param filepath
 * @param destination
 */
export async function writeFileMetadata(
  fileMetadataFilepath: string,
  fileName: string,
  filepath: string,
  uuid: string
) {
  const release = await mutex.acquire();
  try {
    const metadata = await loadFileMetadata(fileMetadataFilepath);
    metadata[filepath] = {
      fileName,
      lastUpdated: new Date().toISOString(),
      uuid
    };
    await writeFile(fileMetadataFilepath, JSON.stringify(metadata, null, 2));
  } finally {
    release();
  }
}

/**
 * check the metadata for old files
 * @param destination
 */
export async function checkFileMetadata(fileMetadataFilepath: string) {
  console.log("Checking file metadata for sunsetted files");
  const release = await mutex.acquire();
  try {
    const metadata = await loadFileMetadata(fileMetadataFilepath);
    const twoWeeksAgo = Date.now() - sunsetInterval;
    for (const file in metadata) {
      if (!(await checkFileExists(file))) {
        console.log("Deleting file: ", file, " for not existing");
        await rm(file, { recursive: true, force: true });
        delete metadata[file];
      } else if (new Date(metadata[file]!.lastUpdated).getTime() < twoWeeksAgo) {
        console.log("Deleting file: ", file, " for being older than 2 weeks");
        await rm(file, { recursive: true, force: true });
        delete metadata[file];
      }
    }
    await writeFile(fileMetadataFilepath, JSON.stringify(metadata, null, 2));
  } catch (e) {
    console.error("Error checking file metadata for sunsetted files: ", e);
  } finally {
    release();
  }
}

export async function deleteAllUserMetadata(fileMetadataFilepath: string, uuid: string) {
  const release = await mutex.acquire();
  try {
    const metadata = await loadFileMetadata(fileMetadataFilepath);
    for (const file in metadata) {
      const val = metadata[file];
      if (!val) throw new Error("Error parsing metadata");
      if (val.uuid === uuid) {
        delete metadata[file];
      }
    }
    await writeFile(fileMetadataFilepath, JSON.stringify(metadata, null, 2));
  } finally {
    release();
  }
}

export async function deleteDatapackFoundInMetadata(fileMetadataFilepath: string, filePath: string) {
  const release = await mutex.acquire();
  try {
    const metadata = await loadFileMetadata(fileMetadataFilepath);
    if (!metadata[filePath]) throw new Error(`File ${filePath} not found in metadata`);
    await rm(filePath, { recursive: true, force: true });
    delete metadata[filePath];
    await writeFile(fileMetadataFilepath, JSON.stringify(metadata, null, 2));
  } finally {
    release();
  }
}

export async function updateFileMetadata(fileMetadataFilepath: string, filepath: string[]) {
  const release = await mutex.acquire();
  try {
    const metadata = await loadFileMetadata(fileMetadataFilepath);
    for (const file of filepath) {
      if (file === "__proto__" || file === "constructor" || file === "prototype")
        throw new Error(`Invalid file name: ${file}`);
      if (!metadata[file]) throw new Error(`File ${file} not found in metadata`);
      metadata[file]!.lastUpdated = new Date().toISOString();
    }
    await writeFile(fileMetadataFilepath, JSON.stringify(metadata, null, 2));
  } finally {
    release();
  }
}
