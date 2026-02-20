import { Multipart, MultipartFile } from "@fastify/multipart";
import { rm } from "fs/promises";
import { OperationResult, isOperationResult } from "./types.js";
import {
  processMultipartPartsForDatapackUpload,
  uploadUserDatapackHandler,
  setupNewDatapackDirectoryInUUIDDirectory
} from "./upload-handlers.js";
import {
  deleteUserDatapack,
  doesDatapackFolderExistInAllUUIDDirectories,
  fetchUserDatapack
} from "./user/user-handler.js";
import { Datapack, DatapackMetadata, isOfficialDatapack, isTempDatapack, isWorkshopDatapack } from "@tsconline/shared";
import { grabAndVerifyWorkshopUUID } from "./workshop/workshop-handler.js";
import { findUser } from "./database.js";
import logger from "./error-logger.js";

export const getDatapackMetadataFromIterableAndTemporarilyDownloadDatapack = async (
  uuid: string,
  parts: AsyncIterableIterator<Multipart>,
  options?: { bearerToken?: string }
): Promise<
  | OperationResult
  | {
      file: MultipartFile;
      filepath: string;
      datapackMetadata: DatapackMetadata;
      tempProfilePictureFilepath?: string;
      pdfFields?: { [fileName: string]: string };
    }
> => {
  let fields: Record<string, string> = {};
  let file: MultipartFile | undefined;
  let pdfFields: { [fileName: string]: string } = {};
  try {
    const result = await processMultipartPartsForDatapackUpload(
      uuid,
      parts,
      options?.bearerToken ? { bearerToken: options.bearerToken } : undefined
    );
    if (isOperationResult(result)) {
      return result;
    }
    file = result.file;
    fields = result.fields;
    if (result.pdfFields) {
      pdfFields = result.pdfFields;
    }
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
    ...(Object.keys(pdfFields).length > 0 && { pdfFields })
  };
};
export const processAndUploadDatapack = async (
  uuid: string,
  parts: AsyncIterableIterator<Multipart>,
  options?: { bearerToken?: string }
) => {
  const user = await findUser({ uuid }).catch(() => {
    return [];
  });
  if ((!uuid || !user || !user[0]) && uuid !== "official") {
    return { code: 404, message: "Error finding user" };
  }

  console.log("Processing datapack upload for user", user[0]?.username);
  const isAdmin = user[0] ? !!user[0].isAdmin : false;
  const result = await getDatapackMetadataFromIterableAndTemporarilyDownloadDatapack(
    uuid,
    parts,
    options?.bearerToken ? { bearerToken: options.bearerToken } : undefined
  );
  if (isOperationResult(result)) {
    return result;
  }
  const { filepath, tempProfilePictureFilepath, datapackMetadata, pdfFields } = result;
  try {
    if ((isOfficialDatapack(datapackMetadata) || isWorkshopDatapack(datapackMetadata)) && !isAdmin) {
      if (!(process.env.BEARER_TOKEN && options?.bearerToken === process.env.BEARER_TOKEN)) {
        return { code: 401, message: "Only admins can upload official or workshop datapacks" };
      }
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
    return { code: 200, message: "Datapack uploaded successfully" };
  } catch (e) {
    filepath && (await rm(filepath, { force: true }));
    tempProfilePictureFilepath && (await rm(tempProfilePictureFilepath, { force: true }));
    return { code: 500, message: "Unknown error" };
  }
};

export const uploadTemporaryDatapack = async (
  metadata: DatapackMetadata,
  sourceFile: string
): Promise<OperationResult | Datapack> => {
  if (!isTempDatapack(metadata)) {
    return { code: 400, message: "Datapack is not a temporary datapack" };
  }
  // upload the temp datapack
  try {
    await setupNewDatapackDirectoryInUUIDDirectory(metadata.type, sourceFile, metadata, false);
  } catch (e) {
    logger.error(e);
    await deleteUserDatapack("temp", metadata.title);
    return { code: 500, message: "Error creating temporary datapack directory" };
  }
  try {
    const datapack = await fetchUserDatapack(metadata.type, metadata.title);
    return datapack;
  } catch (e) {
    logger.error(e);
    return { code: 500, message: "Error parsing temporary datapack" };
  }
};
