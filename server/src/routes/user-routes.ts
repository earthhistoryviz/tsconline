import { FastifyRequest, FastifyReply } from "fastify";
import { rm, mkdir, readFile } from "fs/promises";
import path from "path";
import { getEncryptionDatapackFileSystemDetails, runJavaEncrypt } from "../encryption.js";
import { assetconfigs, checkHeader, makeTempFilename } from "../util.js";
import { MultipartFile } from "@fastify/multipart";
import {
  setupNewDatapackDirectoryInUUIDDirectory,
  uploadFileToFileSystem,
  uploadUserDatapackHandler
} from "../upload-handlers.js";
import { findUser } from "../database.js";
import {
  checkFileTypeIsDatapack,
  checkFileTypeIsDatapackImage,
  convertNonStringFieldsToCorrectTypesInDatapackMetadataRequest,
  deleteUserDatapack,
  doesDatapackFolderExistInAllUUIDDirectories,
  editDatapack,
  fetchAllUsersDatapacks,
  fetchUserDatapack,
  processEditDatapackRequest
} from "../user/user-handler.js";
import { getPrivateUserUUIDDirectory } from "../user/fetch-user-files.js";
import { DATAPACK_PROFILE_PICTURE_FILENAME } from "../constants.js";
import { User, isOperationResult } from "../types.js";

export const editDatapackMetadata = async function editDatapackMetadata(
  request: FastifyRequest<{ Params: { datapack: string } }>,
  reply: FastifyReply
) {
  const { datapack } = request.params;
  const uuid = request.session.get("uuid");
  if (!uuid) {
    reply.status(401).send({ error: "User not logged in" });
    return;
  }
  if (!datapack) {
    reply.status(400).send({ error: "Missing datapack" });
    return;
  }
  const response = await processEditDatapackRequest(request.parts(), uuid).catch(() => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  });
  if (!response) {
    reply.status(500).send({ error: "Failed to process request" });
    return;
  }
  if (isOperationResult(response)) {
    reply.status(response.code).send({ error: response.message });
    return;
  }
  try {
    const partial = convertNonStringFieldsToCorrectTypesInDatapackMetadataRequest(response.fields);
    const errors = await editDatapack(uuid, datapack, partial);
    if (errors.length > 0) {
      reply.status(422).send({ error: "There were errors updating the datapack", errors });
      return;
    }
  } catch (e) {
    console.error(e);
    reply.status(500).send({ error: "Failed to edit metadata" });
    return;
  } finally {
    // remove temp files; files should be removed normally, but if there is an error, we should remove them here
    for (const file of response.tempFiles) {
      await rm(file, { force: true }).catch(() => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      });
    }
  }
  reply.send({ message: `Successfully updated ${datapack}` });
};

export const fetchSingleUserDatapack = async function fetchSingleUserDatapack(
  request: FastifyRequest<{ Params: { datapack: string } }>,
  reply: FastifyReply
) {
  const { datapack } = request.params;
  const uuid = request.session.get("uuid");
  if (!uuid) {
    reply.status(401).send({ error: "User not logged in" });
    return;
  }
  try {
    const user = await findUser({ uuid });
    if (!user || user.length !== 1 || !user[0]) {
      reply.status(401).send({ error: "Unauthorized access" });
      return;
    }
  } catch (e) {
    reply.status(500).send({ error: "Database error" });
    return;
  }
  try {
    const metadata = await fetchUserDatapack(uuid, datapack).catch(() => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    });
    if (!metadata) {
      reply.status(500).send({ error: "Datapack does not exist or cannot be found" });
      return;
    }
    reply.send(metadata);
  } catch (e) {
    reply.status(500).send({ error: "Failed to fetch datapacks" });
  }
};

export const requestDownload = async function requestDownload(
  request: FastifyRequest<{ Params: { datapack: string }; Querystring: { needEncryption?: boolean } }>,
  reply: FastifyReply
) {
  const uuid = request.session.get("uuid");
  if (!uuid) {
    reply.status(401).send({ error: "User not logged in" });
    return;
  }
  // for test usage: const uuid = "username";
  const { needEncryption } = request.query;
  const { datapack } = request.params;
  if (!datapack) {
    reply.status(400).send({ error: "Missing datapack" });
    return;
  }
  let filepath = "";
  let filename = "";
  let encryptedDir = "";
  let encryptedFilepath = ""; // this could not exist
  // get valid filepath/filename from cache
  try {
    const {
      filepath: f,
      filename: fn,
      encryptedDir: ed,
      encryptedFilepath: ef
    } = await getEncryptionDatapackFileSystemDetails(uuid, datapack);
    filepath = f;
    filename = fn;
    encryptedDir = ed;
    encryptedFilepath = ef;
  } catch (e) {
    console.error(e);
    reply.status(500).send({ error: "Failed to load/fetch datapack information in filesystem" });
    return;
  }
  if (!filepath || !filename || !encryptedDir || !encryptedFilepath) {
    reply.status(500).send({ error: "Unknown error occurred" });
    return;
  }
  // user did not ask for an encryption, so send original file
  if (needEncryption === undefined) {
    try {
      const file = await readFile(filepath);
      reply.send(file);
      return;
    } catch (e) {
      const error = e as NodeJS.ErrnoException;
      if (error.code === "ENOENT") {
        const errormsg = "The file requested " + datapack + " does not exist within user's upload directory";
        reply.status(404).send({ error: errormsg });
      } else {
        reply.status(500).send({ error: "An error occurred: " + e });
      }
      return;
    }
  }
  // see if we have already encrypted the file
  try {
    const file = await readFile(encryptedFilepath);
    if (await checkHeader(encryptedFilepath)) {
      reply.send(file);
      return;
    } else {
      await rm(encryptedFilepath, { force: true });
    }
  } catch (e) {
    const error = e as NodeJS.ErrnoException;
    if (error.code !== "ENOENT") {
      console.error(e);
      reply.status(500).send({ error: "An error occurred: " + e });
      return;
    }
  }
  try {
    const file = await readFile(filepath);
    if (await checkHeader(filepath)) {
      reply.send(file);
      return;
    }
  } catch (e) {
    const error = e as NodeJS.ErrnoException;
    if (error.code === "ENOENT") {
      const errormsg = "The file requested " + datapack + " does not exist within user's upload directory";
      reply.status(404).send({ error: errormsg });
    } else {
      reply.status(500).send({ error: "An error occurred: " + e });
    }
    return;
  }

  try {
    await mkdir(encryptedDir, { recursive: true });
  } catch (e) {
    reply.status(500).send({ error: "Failed to create encrypted directory with error " + e });
    return;
  }

  try {
    await runJavaEncrypt(assetconfigs.activeJar, filepath, encryptedDir);
  } catch (e) {
    console.error(e);
    reply.status(500).send({ error: "Failed to encrypt datapacks with error " + e });
    return;
  }

  try {
    const file = await readFile(encryptedFilepath);

    if (await checkHeader(encryptedFilepath)) {
      reply.send(file);
      return;
    } else {
      await rm(encryptedFilepath, { force: true });
      const errormsg =
        "Java file was unable to encrypt the file " + datapack + ", resulting in an incorrect encryption header.";
      reply.status(422).send({
        error: errormsg
      });
      return;
    }
  } catch (e) {
    const error = e as NodeJS.ErrnoException;
    if (error.code === "ENOENT") {
      const errormsg = "Java file did not successfully process the file " + datapack;
      reply.status(404).send({ error: errormsg });
    } else {
      reply.status(500).send({ error: "An error occurred: " + e });
    }
  }
};

// NOTE: this is not used in user-auth.ts since it does not require recaptcha verification
export const fetchUserDatapacks = async function fetchUserDatapacks(request: FastifyRequest, reply: FastifyReply) {
  // for test usage: const uuid = "username";
  const uuid = request.session.get("uuid");
  if (!uuid) {
    reply.status(401).send({ error: "User not logged in" });
    return;
  }
  try {
    const user = await findUser({ uuid });
    if (!user || user.length !== 1 || !user[0]) {
      reply.status(401).send({ error: "Unauthorized access" });
      return;
    }
  } catch (e) {
    reply.status(500).send({ error: "Database error" });
    return;
  }

  try {
    const datapackIndex = await fetchAllUsersDatapacks(uuid);
    reply.send(datapackIndex);
  } catch (e) {
    console.error(e);
    reply.status(500).send({ error: "Failed to load cached user datapacks in user directory" });
  }
};

// If at some point a delete datapack function is needed, this function needs to be modified for race conditions
export const uploadDatapack = async function uploadDatapack(request: FastifyRequest, reply: FastifyReply) {
  const uuid = request.session.get("uuid");
  if (!uuid) {
    reply.status(401).send({ error: "User not logged in" });
    return;
  }
  // for test usage: const uuid = "username";

  async function errorHandler(message: string, errorStatus: number, e?: unknown) {
    e && console.error(e);
    reply.status(errorStatus).send({ error: message });
  }
  const parts = request.parts();
  const fields: Record<string, string> = {};
  let uploadedFile: MultipartFile | undefined;
  let filepath: string | undefined;
  let originalFileName: string | undefined;
  let storedFileName: string | undefined;
  let tempProfilePictureFilepath: string | undefined;
  const cleanupTempFiles = async () => {
    filepath && (await rm(filepath, { force: true }));
    tempProfilePictureFilepath && (await rm(tempProfilePictureFilepath, { force: true }));
    if (fields.title) {
      await deleteUserDatapack(uuid, fields.title);
    }
  };
  let userDir: string = "";
  let user: User;
  try {
    const userArray = await findUser({ uuid });
    if (userArray.length == 0 || !userArray) {
      reply.status(401).send({ error: "Could not find user." });
      return;
    }
    userDir = await getPrivateUserUUIDDirectory(uuid);
    user = userArray[0]!;
  } catch (e) {
    reply.status(401).send({ error: "Could not find private user directory or user with error " + e });
    return;
  }
  const isProOrAdmin = user && (user.accountType === "pro" || user.isAdmin);
  try {
    for await (const part of parts) {
      if (part.type === "file") {
        if (part.fieldname === "datapack") {
          uploadedFile = part;
          storedFileName = makeTempFilename(uploadedFile.filename);
          filepath = path.join(userDir, storedFileName);
          originalFileName = uploadedFile.filename;
          if (!checkFileTypeIsDatapack(uploadedFile)) {
            reply.status(415).send({ error: "Invalid file type" });
            return;
          }
          if (uploadedFile.file.bytesRead > 3000 && !isProOrAdmin) {
            reply.status(400).send({ error: `Regular users cannot upload datapacks over 3000 characters.` });
            return;
          }
          const { code, message } = await uploadFileToFileSystem(uploadedFile, filepath);
          if (code !== 200) {
            reply.status(code).send({ error: message });
            await cleanupTempFiles();
            return;
          }
        } else if (part.fieldname === DATAPACK_PROFILE_PICTURE_FILENAME) {
          if (!checkFileTypeIsDatapackImage(part)) {
            reply.status(415).send({ error: "Invalid file type" });
            return;
          }
          fields.datapackImage = DATAPACK_PROFILE_PICTURE_FILENAME + path.extname(part.filename);
          tempProfilePictureFilepath = path.join(userDir, fields.datapackImage);
          const { code, message } = await uploadFileToFileSystem(part, tempProfilePictureFilepath);
          if (code !== 200) {
            reply.status(code).send({ error: message });
            await cleanupTempFiles();
            return;
          }
        }
      } else if (part.type === "field" && typeof part.fieldname === "string" && typeof part.value === "string") {
        fields[part.fieldname] = part.value;
      }
    }
  } catch (e) {
    await cleanupTempFiles();
    reply.status(500).send({ error: "Failed to upload file with error " + e });
    return;
  }
  if (!uploadedFile || !filepath || !originalFileName || !storedFileName) {
    await cleanupTempFiles();
    reply.status(400).send({ error: "No file uploaded" });
    return;
  }
  fields.storedFileName = storedFileName;
  fields.originalFileName = originalFileName;
  fields.filepath = filepath;
  const datapackMetadata = await uploadUserDatapackHandler(reply, fields, uploadedFile.file.bytesRead).catch(
    async (e) => {
      await cleanupTempFiles();
      reply.status(500).send({ error: "Failed to upload datapack with error " + e });
    }
  );
  // if uploadUserDatapackHandler returns void, it means there was an error and the error message has already been sent
  if (!datapackMetadata) {
    return;
  }
  if (await doesDatapackFolderExistInAllUUIDDirectories(uuid, datapackMetadata.title)) {
    await cleanupTempFiles();
    reply.status(500).send({ error: "Datapack with the same title already exists" });
    return;
  }
  try {
    await setupNewDatapackDirectoryInUUIDDirectory(uuid, filepath, datapackMetadata, false, tempProfilePictureFilepath);
  } catch (e) {
    await errorHandler("Failed to load and write metadata for file", 500, e);
    return;
  }
  reply.status(200).send({ message: "File uploaded" });
};

export const userDeleteDatapack = async function userDeleteDatapack(
  request: FastifyRequest<{ Params: { datapack: string } }>,
  reply: FastifyReply
) {
  const uuid = request.session.get("uuid");
  if (!uuid) {
    reply.status(401).send({ error: "User not logged in" });
    return;
  }
  const { datapack } = request.params;
  if (!datapack) {
    reply.status(400).send({ error: "Missing datapack" });
    return;
  }
  try {
    await deleteUserDatapack(uuid, datapack);
  } catch (e) {
    reply.status(500).send({ error: "There was an error deleting the datapack" });
    return;
  }
  reply.status(200).send({ message: "Datapack deleted" });
};
