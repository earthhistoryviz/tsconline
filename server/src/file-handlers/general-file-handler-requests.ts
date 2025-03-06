import { Multipart } from "@fastify/multipart";
import { rm, readFile } from "fs/promises";
import { OperationResult, isOperationResult } from "../types.js";
import {
  convertNonStringFieldsToCorrectTypesInDatapackMetadataRequest,
  processEditDatapackRequest
} from "../user/user-handler.js";
import { editDatapack } from "./edit-handler.js";
import { createWriteStream } from "fs";
import archiver from "archiver";
import path from "path";

export const editDatapackMetadataRequestHandler = async function editDatapackMetadataRequestHandler(
  parts: AsyncIterableIterator<Multipart>,
  uuid: string,
  datapack: string
): Promise<OperationResult> {
  const response = await processEditDatapackRequest(parts, uuid).catch(() => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  });
  if (!response) {
    return { code: 500, message: "Failed to process request" };
  }
  if (isOperationResult(response)) {
    return response;
  }
  try {
    const partial = convertNonStringFieldsToCorrectTypesInDatapackMetadataRequest(response.fields);
    const errors = await editDatapack(uuid, datapack, partial);
    if (errors.length > 0) {
      return { code: 422, message: "There were errors updating the datapack" };
    }
  } catch (e) {
    return { code: 500, message: "Failed to edit metadata" };
  } finally {
    // remove temp files; files should be removed normally, but if there is an error, we should remove them here
    for (const file of response.tempFiles) {
      await rm(file, { force: true }).catch(() => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      });
    }
  }
  return { code: 200, message: `Successfully edited metadata for ${datapack}` };
};

/**
 * Creates a ZIP archive of the specified folder and returns its contents.
 * @param zipFilePath - The path where the ZIP file will be saved.
 * @param filesFolder - The folder whose contents should be zipped.
 * @returns A Promise that resolves with the ZIP file contents (Buffer).
 * @throws An error if the ZIP creation or reading fails.
 */
export async function createZipFile(zipFilePath: string, filesFolder: string): Promise<Buffer> {
  try {
    const output = createWriteStream(zipFilePath);
    output.on("close", () => {
      console.log(`ZIP file created successfully: ${archive.pointer()} total bytes`);
    });

    output.on("error", (err) => {
      console.error("Error writing ZIP file:", err);
      throw err;
    });
    const archive = archiver("zip", {
      zlib: { level: 9 } // Compression level
    });
    archive.pipe(output);
    archive.directory(filesFolder + path.sep, false);
    await archive.finalize();
    const file = await readFile(zipFilePath);
    return file;
  } catch (error) {
    throw new Error(`ZIP file creation failed: ${error}`);
  }
}
