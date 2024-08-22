import { FastifyRequest, FastifyReply } from "fastify";
import { access, rm, mkdir, readFile, writeFile, rename } from "fs/promises";
import path from "path";
import { runJavaEncrypt } from "../encryption.js";
import { assetconfigs, checkFileExists, checkHeader, resetUploadDirectory, verifyFilepath } from "../util.js";
import { MultipartFile } from "@fastify/multipart";
import { DatapackIndex } from "@tsconline/shared";
import { exec } from "child_process";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import { deleteDatapackFoundInMetadata, writeFileMetadata } from "../file-metadata-handler.js";
import { loadIndexes } from "../load-packs.js";
import { getFileNameFromCachedDatapack, uploadUserDatapackHandler } from "../upload-handlers.js";
import { findUser } from "../database.js";
import { addPublicUserDatapack, loadPublicUserDatapacks } from "../public-datapack-handler.js";
import { CACHED_USER_DATAPACK_FILENAME, PUBLIC_DATAPACK_INDEX_FILENAME } from "../constants.js";
import { fetchAllUsersDatapacks } from "../user/user-handler.js";

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
  const userDir = path.join(assetconfigs.uploadDirectory, uuid);
  const datapackDir = path.join(userDir, datapack);
  const encryptedFilepathDir = path.join(datapackDir, "encrypted-datapacks");
  let filepath = "";
  let filename = "";
  // get valid filepath/filename from cache
  try {
    if (!(await verifyFilepath(datapackDir))) {
      reply.status(403).send({ error: "Invalid file path" });
      return;
    }
    const cachedDatapackFilepath = path.join(datapackDir, CACHED_USER_DATAPACK_FILENAME);
    if (!(await verifyFilepath(cachedDatapackFilepath))) {
      reply.status(403).send({ error: "Invalid file path" });
      return;
    }
    filename = await getFileNameFromCachedDatapack(cachedDatapackFilepath);
    filepath = path.join(datapackDir, filename);
    // check and sanitize filepath
    if (!(await verifyFilepath(filepath))) {
      reply.status(403).send({ error: "Invalid file path" });
      return;
    }
  } catch (e) {
    reply.status(500).send({ error: "Failed to load cached datapack" });
    return;
  }
  // sanitize this differently since this might not exist
  const maybeEncryptedFilepath = path.resolve(path.join(encryptedFilepathDir, filename));
  if (!maybeEncryptedFilepath.startsWith(path.resolve(encryptedFilepathDir))) {
    reply.status(403).send({ error: "Invalid file path" });
    return;
  }
  // user did not ask for an encryption, so send original file
  if (needEncryption === undefined) {
    try {
      await access(filepath);
      const file = await readFile(filepath);
      reply.send(file);
      return;
    } catch (e) {
      const error = e as NodeJS.ErrnoException;
      if (error.code === "ENOENT") {
        console.log(filepath);
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
    await access(maybeEncryptedFilepath);
    const file = await readFile(maybeEncryptedFilepath);
    if (await checkHeader(maybeEncryptedFilepath)) {
      reply.send(file);
      return;
    } else {
      await rm(maybeEncryptedFilepath, { force: true });
    }
  } catch (e) {
    const error = e as NodeJS.ErrnoException;
    if (error.code !== "ENOENT") {
      reply.status(500).send({ error: "An error occurred: " + e });
      return;
    }
  }
  try {
    await access(filepath);
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
    await mkdir(encryptedFilepathDir, { recursive: true });
  } catch (e) {
    reply.status(500).send({ error: "Failed to create encrypted directory with error " + e });
    return;
  }

  try {
    await runJavaEncrypt(assetconfigs.activeJar, filepath, encryptedFilepathDir);
  } catch (e) {
    console.error(e);
    reply.status(500).send({ error: "Failed to encrypt datapacks with error " + e });
    return;
  }

  try {
    await access(maybeEncryptedFilepath);
    const file = await readFile(maybeEncryptedFilepath);

    if (await checkHeader(maybeEncryptedFilepath)) {
      reply.send(file);
      return;
    } else {
      await rm(maybeEncryptedFilepath, { force: true });
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

export const fetchPublicDatapacks = async function fetchPublicDatapacks(request: FastifyRequest, reply: FastifyReply) {
  try {
    const publicDatapackIndexFilepath = path.join(assetconfigs.publicDirectory, "DatapackIndex.json");
    const { datapackIndex } = await loadPublicUserDatapacks(publicDatapackIndexFilepath);
    reply.send(datapackIndex);
  } catch (e) {
    reply.status(500).send({ error: "Failed to load public datapacks" });
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
    const userDir = path.join(assetconfigs.uploadDirectory, uuid);
    const datapackIndex = await fetchAllUsersDatapacks(userDir);
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
    await resetUploadDirectory(filepath, decryptedFilepathDir);
    reply.status(errorStatus).send({ error: message });
  }
  const parts = request.parts();
  const fields: Record<string, string> = {};
  let uploadedFile: MultipartFile | undefined;
  let userDir: string;
  let datapackDir: string = "";
  let filepath: string = "";
  try {
    userDir = path.join(assetconfigs.uploadDirectory, uuid);
    await mkdir(userDir, { recursive: true });
  } catch (e) {
    reply.status(500).send({ error: "Failed to create user directory with error " + e });
    return;
  }
  try {
    for await (const part of parts) {
      if (part.type === "file") {
        uploadedFile = part;
        // only accept a binary file (encoded) or an unecnrypted text file or a zip file
        if (
          (uploadedFile.mimetype !== "application/octet-stream" &&
            uploadedFile.mimetype !== "text/plain" &&
            uploadedFile.mimetype !== "application/zip") ||
          !/^(\.dpk|\.txt|\.map|\.mdpk)$/.test(path.extname(uploadedFile.filename))
        ) {
          reply.status(415).send({ error: "Invalid file type" });
          return;
        }
        // store it in a temp file since we need to know title before we effectively save the file
        filepath = path.join(userDir, "temp_" + uploadedFile.filename);
        try {
          await pipeline(uploadedFile.file, createWriteStream(filepath));
        } catch (e) {
          reply.status(500).send({ error: "Failed to save file with error " + e });
          return;
        }
        if (uploadedFile.file.truncated) {
          await rm(filepath, { force: true });
          reply.status(400).send({ error: "File is too large" });
          return;
        }
        if (uploadedFile.file.bytesRead === 0) {
          await rm(filepath, { force: true });
          reply.status(400).send({ error: `Empty file cannot be uploaded` });
          return;
        }
      } else if (part.type === "field" && typeof part.fieldname === "string" && typeof part.value === "string") {
        fields[part.fieldname] = part.value;
      }
    }
  } catch (e) {
    filepath && (await rm(filepath, { force: true }));
    reply.status(500).send({ error: "Failed to upload file with error " + e });
    return;
  }
  if (!uploadedFile || !filepath) {
    filepath && (await rm(filepath, { force: true }));
    reply.status(400).send({ error: "No file uploaded" });
    return;
  }
  const isPublic = fields.isPublic === "true";
  const filename = uploadedFile.filename;
  fields.filename = filename;
  fields.filepath = filepath;
  const datapackMetadata = await uploadUserDatapackHandler(reply, fields, uploadedFile.file.bytesRead).catch(
    async (e) => {
      filepath && (await rm(filepath, { force: true }));
      reply.status(500).send({ error: "Failed to upload datapack with error " + e });
    }
  );
  // if uploadUserDatapackHandler returns void, it means there was an error and the error message has already been sent
  if (!datapackMetadata) {
    return;
  }
  if (await checkFileExists(path.join(userDir, datapackMetadata.title))) {
    filepath && (await rm(filepath, { force: true }));
    reply.status(500).send({ error: "Datapack with the same title already exists" });
    return;
  }
  try {
    datapackDir = path.join(userDir, datapackMetadata.title);
    await mkdir(datapackDir, { recursive: true });
    await rename(filepath, path.join(datapackDir, datapackMetadata.file));
    filepath = path.join(datapackDir, datapackMetadata.file);
  } catch (e) {
    reply.status(500).send({ error: "Failed to create and move the datapack to the correct directory." });
  }
  const decryptedDir = path.join(datapackDir, "decrypted");
  const decryptedFilepathDir = path.join(decryptedDir, path.parse(filename).name);
  const cachedDatapackFilepath = path.join(datapackDir, CACHED_USER_DATAPACK_FILENAME);

  try {
    await new Promise<void>((resolve, reject) => {
      const cmd =
        `java -jar ${assetconfigs.decryptionJar} ` +
        // Decrypting these datapacks:
        `-d "${filepath.replaceAll("\\", "/")}" ` +
        // Tell it where to send the datapacks
        `-dest ${decryptedDir.replaceAll("\\", "/")} `;
      console.log("Calling Java decrypt.jar: ", cmd);
      exec(cmd, function (error, stdout, stderror) {
        console.log("Java decrypt.jar finished, sending reply to browser");
        if (error) {
          console.error("Java error param: " + error);
          console.error("Java stderr: " + stderror);
          reject(error);
        } else {
          console.log("Java stdout: " + stdout);
          resolve();
        }
      });
    });
  } catch (e) {
    await errorHandler("Failed to decrypt datapacks with error " + e, 500, e);
    return;
  }
  //verify decrypted directory
  try {
    await access(decryptedFilepathDir);
    await access(path.join(decryptedFilepathDir, "datapacks"));
  } catch (e) {
    await errorHandler("Failed to decrypt file", 500);
    return;
  }

  const datapackIndex: DatapackIndex = {};
  // check for if this user has a datapack index already
  const success = await loadIndexes(datapackIndex, decryptedDir.replaceAll("\\", "/"), [datapackMetadata], {
    type: isPublic ? "public_user" : "private_user",
    uuid
  });
  if (!datapackIndex[datapackMetadata.title] || !success) {
    await errorHandler("Failed to load decrypted datapack", 500);
    return;
  }
  if (isPublic) {
    try {
      const publicDatapackPath = path.join(assetconfigs.publicDirectory, PUBLIC_DATAPACK_INDEX_FILENAME);
      await mkdir(assetconfigs.publicDirectory, { recursive: true });
      await addPublicUserDatapack(
        datapackIndex[datapackMetadata.title]!,
        publicDatapackPath,
        filepath,
        assetconfigs.publicUserDatapacksDirectory
      );
    } catch (e) {
      await errorHandler("Could not write to public datapacks, please try again later", 500, e);
      return;
    }
  }
  try {
    const datapack = datapackIndex[datapackMetadata.title];
    await writeFile(cachedDatapackFilepath, JSON.stringify(datapack, null, 2));
  } catch (e) {
    await errorHandler("Failed to save index", 500, e);
    return;
  }
  try {
    await writeFileMetadata(assetconfigs.fileMetadata, filename, filepath, uuid);
  } catch (e) {
    await errorHandler("Failed to load and write metadata for file", 500, e);
    return;
  }
  reply.status(200).send({ message: "File uploaded" });
};

export const userDeleteDatapack = async function userDeleteDatapack(
  request: FastifyRequest<{ Params: { filename: string } }>,
  reply: FastifyReply
) {
  const uuid = request.session.get("uuid");
  if (!uuid) {
    reply.status(401).send({ error: "User not logged in" });
    return;
  }
  const { filename } = request.params;
  if (!filename) {
    reply.status(400).send({ error: "Missing filename" });
    return;
  }
  const filepath = path.join(assetconfigs.uploadDirectory, uuid, path.basename(filename));
  try {
    if (!(await verifyFilepath(filepath))) {
      reply.status(403).send({ error: "Invalid filename/File doesn't exist" });
      return;
    }
  } catch (e) {
    reply.status(500).send({ error: "Failed to verify file path" });
    return;
  }
  try {
    await deleteDatapackFoundInMetadata(assetconfigs.fileMetadata, filepath);
  } catch (e) {
    reply.status(500).send({ error: "There was an error deleting the datapack" });
    return;
  }
  reply.status(200).send({ message: "File deleted" });
};
