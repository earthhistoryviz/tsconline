import { FastifyRequest, FastifyReply } from "fastify";
import { realpath, access, rm, mkdir, readFile, writeFile } from "fs/promises";
import path, { join } from "path";
import { runJavaEncrypt } from "../encryption.js";
import { assetconfigs, checkHeader, resetUploadDirectory, verifyFilepath } from "../util.js";
import { MultipartFile } from "@fastify/multipart";
import { assertDatapackIndex, assertMapPackIndex, DatapackIndex, MapPackIndex } from "@tsconline/shared";
import { exec } from "child_process";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import { deleteDatapack, loadFileMetadata, writeFileMetadata } from "../file-metadata-handler.js";
import { loadIndexes } from "../load-packs.js";
import { uploadUserDatapackHandler } from "../upload-handlers.js";
import logger from "../error-logger.js";
import { FileMetadata } from "../types.js";

export const requestDownload = async function requestDownload(
  request: FastifyRequest<{ Params: { filename: string }; Querystring: { needEncryption?: boolean } }>,
  reply: FastifyReply
) {
  const uuid = request.session.get("uuid");
  if (!uuid) {
    reply.status(401).send({ error: "User not logged in" });
    return;
  }
  // for test usage: const uuid = "username";
  const { needEncryption } = request.query;
  const { filename } = request.params;
  const userDir = path.join(assetconfigs.uploadDirectory, uuid);
  const datapackDir = path.join(userDir, "datapacks");
  let filepath = path.join(datapackDir, filename);
  const encryptedFilepathDir = path.join(userDir, "encrypted-datapacks");
  let maybeEncryptedFilepath = path.join(encryptedFilepathDir, filename);
  // check and sanitize filepath
  try {
    filepath = await realpath(path.resolve(filepath));
  } catch (e) {
    reply.status(403).send({ error: "Invalid file path" });
    return;
  }
  maybeEncryptedFilepath = path.resolve(maybeEncryptedFilepath);
  if (!filepath.startsWith(datapackDir) || !maybeEncryptedFilepath.startsWith(encryptedFilepathDir)) {
    reply.status(403).send({ error: "Invalid file path" });
    return;
  }
  if (needEncryption === undefined) {
    try {
      await access(filepath);
      const file = await readFile(filepath);
      reply.send(file);
      return;
    } catch (e) {
      const error = e as NodeJS.ErrnoException;
      if (error.code === "ENOENT") {
        const errormsg = "The file requested " + filename + " does not exist within user's upload directory";
        reply.status(404).send({ error: errormsg });
      } else {
        reply.status(500).send({ error: "An error occurred: " + e });
      }
      return;
    }
  }
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
      const errormsg = "The file requested " + filename + " does not exist within user's upload directory";
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
        "Java file was unable to encrypt the file " + filename + ", resulting in an incorrect encryption header.";
      reply.status(422).send({
        error: errormsg
      });
      return;
    }
  } catch (e) {
    const error = e as NodeJS.ErrnoException;
    if (error.code === "ENOENT") {
      const errormsg = "Java file did not successfully process the file " + filename;
      reply.status(404).send({ error: errormsg });
    } else {
      reply.status(500).send({ error: "An error occurred: " + e });
    }
  }
};

export const fetchUserDatapacks = async function fetchUserDatapacks(request: FastifyRequest, reply: FastifyReply) {
  // for test usage: const uuid = "username";
  const uuid = request.session.get("uuid");
  if (!uuid) {
    reply.status(401).send({ error: "User not logged in" });
    return;
  }
  const userDir = path.join(assetconfigs.uploadDirectory, uuid);

  try {
    await access(userDir);
    await access(path.join(userDir, "DatapackIndex.json"));
    await access(path.join(userDir, "MapPackIndex.json"));
  } catch (e) {
    reply.send({ datapackIndex: {}, mapPackIndex: {} });
    return;
  }
  try {
    const datapackIndex = JSON.parse(await readFile(path.join(userDir, "DatapackIndex.json"), "utf8"));
    assertDatapackIndex(datapackIndex);
    const mapPackIndex = JSON.parse(await readFile(path.join(userDir, "MapPackIndex.json"), "utf8"));
    assertMapPackIndex(mapPackIndex);
    const indexResponse = { datapackIndex, mapPackIndex };
    reply.status(200).send(indexResponse);
  } catch (e) {
    reply
      .status(500)
      .send({ error: "Failed to load indexes, corrupt json files present. Please contact customer service." });
    return;
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
  let datapackDir: string;
  let filepath: string = "";
  try {
    userDir = path.join(assetconfigs.uploadDirectory, uuid);
    datapackDir = path.join(userDir, "datapacks");
    await mkdir(datapackDir, { recursive: true });
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
        filepath = path.join(datapackDir, uploadedFile.filename);
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
  const ext = path.extname(filename);
  const filenameWithoutExtension = path.basename(filename, ext);
  const decryptDir = path.join(userDir, "decrypted");
  const decryptedFilepathDir = path.join(decryptDir, filenameWithoutExtension);
  const mapPackIndexFilepath = path.join(userDir, "MapPackIndex.json");
  const datapackIndexFilepath = path.join(userDir, "DatapackIndex.json");

  try {
    await new Promise<void>((resolve, reject) => {
      const cmd =
        `java -jar ${assetconfigs.decryptionJar} ` +
        // Decrypting these datapacks:
        `-d "${filepath.replaceAll("\\", "/")}" ` +
        // Tell it where to send the datapacks
        `-dest ${decryptDir.replaceAll("\\", "/")} `;
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
  const mapPackIndex: MapPackIndex = {};
  // check for if this user has a datapack index already
  try {
    const data = await readFile(datapackIndexFilepath, "utf-8");
    Object.assign(datapackIndex, JSON.parse(data));
    assertDatapackIndex(datapackIndex);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code != "ENOENT") {
      await errorHandler("Failed to parse DatapackIndex.json", 500, e);
      return;
    }
  }
  // check for if this user has a map index already
  try {
    const data = await readFile(mapPackIndexFilepath, "utf-8");
    Object.assign(mapPackIndex, JSON.parse(data));
    assertMapPackIndex(mapPackIndex);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code != "ENOENT") {
      errorHandler("Failed to parse MapPackIndex.json", 500, e);
      return;
    }
  }
  const success = await loadIndexes(
    datapackIndex,
    mapPackIndex,
    decryptDir.replaceAll("\\", "/"),
    [datapackMetadata],
    uuid
  );
  if (!success) {
    await errorHandler("Failed to load decrypted datapack", 500);
    return;
  }
  try {
    await writeFile(datapackIndexFilepath, JSON.stringify(datapackIndex, null, 2));
    await writeFile(mapPackIndexFilepath, JSON.stringify(mapPackIndex, null, 2));
  } catch (e) {
    await errorHandler("Failed to save indexes", 500, e);
    return;
  }
  try {
    await writeFileMetadata(
      assetconfigs.fileMetadata,
      filename,
      filepath,
      decryptedFilepathDir,
      mapPackIndexFilepath,
      datapackIndexFilepath
    );
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
  const path = join(assetconfigs.uploadDirectory, uuid, "datapacks", filename);
  try {
    if (!(await verifyFilepath(path))) {
      reply.status(403).send({ error: "Invalid filename/File doesn't exist" });
      return;
    }
  } catch (e) {
    reply.status(500).send({ error: "Failed to verify file path" });
    return;
  }
  try {
    const metadataIndex = await loadFileMetadata(assetconfigs.fileMetadata);
    const metadata = metadataIndex[path];
    if (!metadata) {
      // file exists but not in metadata (THIS CASE SHOULD NOT HAPPEN AND SHOULD BE INVESTIGATED IF OCCURS)
      logger.error("File exists but not in metadata, could require extra supervision of deletion ", {
        path,
        uuid,
        filename
      });
      await rm(path, { force: true });
      reply.status(404).send({ error: "File not found in metadata, but file was deleted. See administrator for more help." });
      return;
    }
    await deleteDatapack(metadataIndex, path);
    await writeFile(assetconfigs.fileMetadata, JSON.stringify(metadataIndex, null, 2));
  } catch (e) {
    reply.status(500).send({ error: "There was an error loading/writing file metadata" });
    return;
  }
  reply.status(200).send({ message: "File deleted" });
};
