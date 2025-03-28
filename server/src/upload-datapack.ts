import { Multipart, MultipartFile } from "@fastify/multipart";
import { rm } from "fs/promises";
import { OperationResult, isOperationResult } from "./types.js";
import {
  processMultipartPartsForDatapackUpload,
  uploadUserDatapackHandler,
  setupNewDatapackDirectoryInUUIDDirectory
} from "./upload-handlers.js";
import { deleteUserDatapack, doesDatapackFolderExistInAllUUIDDirectories } from "./user/user-handler.js";
import { DatapackMetadata, isOfficialDatapack, isWorkshopDatapack } from "@tsconline/shared";
import { grabAndVerifyWorkshopUUID } from "./workshop/workshop-handler.js";
import { findUser } from "./database.js";

export const getDatapackMetadataFromIterableAndTemporarilyDownloadDatapack = async (
  uuid: string,
  parts: AsyncIterableIterator<Multipart>
): Promise<
  | OperationResult
  | {
      file: MultipartFile;
      filepath: string;
      datapackMetadata: DatapackMetadata;
      tempProfilePictureFilepath?: string;
      pdfFields: { [fileName: string]: string };
    }
> => {
  let fields: Record<string, string> = {};
  let file: MultipartFile | undefined;
  let pdfFields: { [fileName: string]: string } = {};
  try {
    const result = await processMultipartPartsForDatapackUpload(uuid, parts);
    if (isOperationResult(result)) {
      return result;
    }
    file = result.file;
    fields = result.fields;
    pdfFields = result.pdfFields;
  } catch (error) {
    return { code: 500, message: "Failed to process multipart parts" };
  }
  if (!file || !fields.filepath || !fields.originalFileName || !fields.storedFileName) {
    return { code: 400, message: "No file uploaded" };
  }
  const datapackMetadata = await uploadUserDatapackHandler(fields, file.file.bytesRead).catch(async () => {
    const result: OperationResult = { code: 500, message: "Failed to upload datapack and parse metadata" };
    return result;
  });
  if (isOperationResult(datapackMetadata)) {
    return datapackMetadata;
  }
  return {
    file,
    filepath: fields.filepath,
    tempProfilePictureFilepath: fields.tempProfilePictureFilepath,
    datapackMetadata,
    pdfFields
  };
};
export const processAndUploadDatapack = async (uuid: string, parts: AsyncIterableIterator<Multipart>) => {
  const user = await findUser({ uuid }).catch(() => {
    return [];
  });
  if ((!uuid || !user || !user[0]) && uuid !== "treatise") {
    return { code: 404, message: "Error finding user" };
  }

  const isAdmin = user[0] ? !!user[0].isAdmin : false;
  const result = await getDatapackMetadataFromIterableAndTemporarilyDownloadDatapack(uuid, parts);
  if (isOperationResult(result)) {
    return result;
  }
  const { filepath, tempProfilePictureFilepath, datapackMetadata, pdfFields } = result;
  try {
    if ((isOfficialDatapack(datapackMetadata) || isWorkshopDatapack(datapackMetadata)) && !isAdmin) {
      return { code: 401, message: "Only admins can upload official or workshop datapacks" };
    }
    // change the uuid to reflect where we are downloading the datapack to depending on the type of datapack
    const uuidDirectoryToDownloadTo = isOfficialDatapack(datapackMetadata)
      ? "official"
      : isWorkshopDatapack(datapackMetadata)
        ? datapackMetadata.uuid
        : uuid;
    if (isWorkshopDatapack(datapackMetadata)) {
      try {
        const result = await grabAndVerifyWorkshopUUID(datapackMetadata);
        if (result.code !== 200) {
          return result;
        }
      } catch (e) {
        return { code: 500, message: "Failed to verify workshop UUID" };
      }
    }
    if (await doesDatapackFolderExistInAllUUIDDirectories(uuidDirectoryToDownloadTo, datapackMetadata.title)) {
      return { code: 409, message: "Datapack with the same title already exists" };
    }
    try {
      await setupNewDatapackDirectoryInUUIDDirectory(
        uuidDirectoryToDownloadTo,
        filepath,
        datapackMetadata,
        false,
        tempProfilePictureFilepath,
        pdfFields
      );
    } catch (e) {
      await deleteUserDatapack(uuidDirectoryToDownloadTo, datapackMetadata.title);
      return { code: 500, message: "Failed to setup new datapack directory" };
    }
    return { code: 200, message: "Datapack uploaded successfully", phylum: datapackMetadata.title };
  } catch (e) {
    filepath && (await rm(filepath, { force: true }));
    tempProfilePictureFilepath && (await rm(tempProfilePictureFilepath, { force: true }));
    return { code: 500, message: "Unknown error" };
  }
};
