import { existsSync, readFileSync, unlink, writeFileSync } from "fs";
import { readFile, rm } from "fs/promises";
import { FileMetadata, FileMetadataIndex, assertFileMetadata, assertFileMetadataIndex } from "./types.js";
import { assertDatapackIndex, assertMapPackIndex } from "@tsconline/shared";

/**
 * load the metadata from the file
 * @param destination
 * @returns
 */
export function loadFileMetadata(destination: string) {
  if (!existsSync(destination)) {
    writeFileSync(destination, "{}");
  }
  const metadata = readFileSync(destination, "utf-8");
  return JSON.parse(metadata);
}

/**
 * Writes the metadata to the file
 * @param metadata
 * @param filepath
 * @param destination
 */
export function writeFileMetadata(
  fileMetadataFilepath: string,
  filepath: string,
  decryptedFilepath: string,
  mapPackIndexFilepath: string,
  datapackIndexFilepath: string
) {
  const metadata = loadFileMetadata(fileMetadataFilepath);
  assertFileMetadataIndex(metadata);
  metadata[filepath] = {
    uploadedAt: new Date().toISOString(),
    decryptedFilepath,
    mapPackIndexFilepath,
    datapackIndexFilepath
  };
  writeFileSync(fileMetadataFilepath, JSON.stringify(metadata));
}

/**
 * check the metadata for old files
 * @param destination
 */
export async function checkFileMetadata(fileMetadataFilepath: string) {
  const metadata = loadFileMetadata(fileMetadataFilepath);
  assertFileMetadataIndex(metadata);
  const twoWeeksAgo = Date.now() - 1000 * 60 * 60 * 24 * 14;
  for (const file in metadata) {
    if (new Date(metadata[file]!.uploadedAt).getTime() < twoWeeksAgo) {
      const datapackIndex = await readFile(metadata[file]!.datapackIndexFilepath, "utf-8");
      assertDatapackIndex(datapackIndex);
      const mapPackIndex = await readFile(metadata[file]!.mapPackIndexFilepath, "utf-8");
      assertMapPackIndex(mapPackIndex);
      await rm(metadata[file]!.decryptedFilepath, { recursive: true, force: true });
      unlink(file, (err) => {
        if (err) {
          console.error(`Error deleting file ${file} with error: ${err}`);
        }
      });
      delete datapackIndex[file];
      delete mapPackIndex[file];
      delete metadata[file];
    }
  }
  writeFileSync(fileMetadataFilepath, JSON.stringify(metadata));
}
