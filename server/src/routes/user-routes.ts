import { FastifyRequest, FastifyReply } from "fastify";
import { rm, mkdir, readFile } from "fs/promises";
import path from "path";
import { getEncryptionDatapackFileSystemDetails, runJavaEncrypt } from "../encryption.js";
import { assetconfigs, checkFileExists, checkHeader, makeTempFilename } from "../util.js";
import { MultipartFile } from "@fastify/multipart";
import { DatapackMetadata, isPartialDatapackMetadata } from "@tsconline/shared";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import { setupNewDatapackDirectoryInUUIDDirectory, uploadUserDatapackHandler } from "../upload-handlers.js";
import { findUser } from "../database.js";
import { deleteUserDatapack, editDatapack, fetchAllUsersDatapacks, fetchUserDatapack, fetchUserDatapackFilepath } from "../user/user-handler.js";
import { getPrivateUserUUIDDirectory } from "../user/fetch-user-files.js";

export const editDatapackMetadata = async function editDatapackMetadata(
  request: FastifyRequest<{ Params: { datapack: string }; Body: Partial<DatapackMetadata> }>,
  reply: FastifyReply
) {
  const { datapack } = request.params;
  const body = request.body;
  if (!datapack) {
    reply.status(400).send({ error: "Missing datapack" });
    return;
  }
  if (!body) {
    reply.status(400).send({ error: "Missing body" });
    return;
  }
  if (body.originalFileName || body.storedFileName || body.size) {
    reply.status(400).send({ error: "Cannot edit originalFileName, storedFileName, or size" });
    return;
  }
  if (!isPartialDatapackMetadata(body)) {
    reply.status(400).send({ error: "Invalid body" });
    return;
  }
  const uuid = request.session.get("uuid");
  if (!uuid) {
    reply.status(401).send({ error: "User not logged in" });
    return;
  }
  try {
    await editDatapack(uuid, datapack, body);
  } catch (e) {
    console.error(e);
    reply.status(500).send({ error: "Failed to edit metadata" });
    return;
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
  const userDir = await getPrivateUserUUIDDirectory(uuid);
  let filepath: string = "";
  let originalFilename: string = "";
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
        originalFilename = uploadedFile.filename;
        // store it in a temp file since we need to know title before we effectively save the file
        filepath = path.join(userDir, makeTempFilename(originalFilename));
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
  if (!uploadedFile || !filepath || !originalFilename) {
    filepath && (await rm(filepath, { force: true }));
    reply.status(400).send({ error: "No file uploaded" });
    return;
  }
  const filename = uploadedFile.filename;
  fields.storedFileName = filename;
  fields.originalFileName = originalFilename;
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
    await setupNewDatapackDirectoryInUUIDDirectory(uuid, filepath, datapackMetadata);
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
