import { access, readFile, rm, writeFile } from "fs/promises";
import { assertFileMetadataIndex } from "./types.js";
import { assertDatapackIndex, assertMapPackIndex } from "@tsconline/shared";

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
  decryptedFilepath: string,
  mapPackIndexFilepath: string,
  datapackIndexFilepath: string
) {
  const metadata = await loadFileMetadata(fileMetadataFilepath);
  metadata[filepath] = {
    fileName,
    lastUpdated: new Date().toISOString(),
    decryptedFilepath,
    mapPackIndexFilepath,
    datapackIndexFilepath
  };
  await writeFile(fileMetadataFilepath, JSON.stringify(metadata));
}

/**
 * check the metadata for old files
 * @param destination
 */
export async function checkFileMetadata(fileMetadataFilepath: string) {
  console.log("Checking file metadata for sunsetted files");
  try {
    const metadata = await loadFileMetadata(fileMetadataFilepath);
    const twoWeeksAgo = Date.now() - sunsetInterval;
    for (const file in metadata) {
      if (new Date(metadata[file]!.lastUpdated).getTime() < twoWeeksAgo) {
        console.log("Deleting file: ", file, " for being older than 2 weeks");
        const datapackIndex = JSON.parse(await readFile(metadata[file]!.datapackIndexFilepath, "utf-8"));
        assertDatapackIndex(datapackIndex);
        const mapPackIndex = JSON.parse(await readFile(metadata[file]!.mapPackIndexFilepath, "utf-8"));
        assertMapPackIndex(mapPackIndex);
        await rm(metadata[file]!.decryptedFilepath, { recursive: true, force: true });
        await rm(file, { force: true });
        delete datapackIndex[metadata[file]!.fileName];
        delete mapPackIndex[metadata[file]!.fileName];
        await writeFile(metadata[file]!.datapackIndexFilepath, JSON.stringify(datapackIndex));
        await writeFile(metadata[file]!.mapPackIndexFilepath, JSON.stringify(mapPackIndex));
        delete metadata[file];
      }
    }
    await writeFile(fileMetadataFilepath, JSON.stringify(metadata));
  } catch (e) {
    console.error("Error checking file metadata for sunsetted files: ", e);
  }
}

export async function updateFileMetadata(fileMetadataFilepath: string, filepath: string[]) {
  const metadata = await loadFileMetadata(fileMetadataFilepath);
  for (const file of filepath) {
    if (!metadata[file]) throw new Error(`File ${file} not found in metadata`);
    metadata[file]!.lastUpdated = new Date().toISOString();
  }
  await writeFile(fileMetadataFilepath, JSON.stringify(metadata));
}
