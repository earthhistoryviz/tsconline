import { FastifyRequest, FastifyReply } from "fastify";
import { rm, mkdir, readFile } from "fs/promises";
import { getEncryptionDatapackFileSystemDetails, runJavaEncrypt } from "../encryption.js";
import { assetconfigs, checkHeader, extractMetadataFromDatapack } from "../util.js";
import { findUser, getActiveWorkshopsUserIsIn } from "../database.js";
import { deleteUserDatapack, fetchAllUsersDatapacks, fetchUserDatapack } from "../user/user-handler.js";
import { getWorkshopUUIDFromWorkshopId, verifyWorkshopValidity } from "../workshop/workshop-util.js";
import { processAndUploadDatapack } from "../upload-datapack.js";
import { editDatapackMetadataRequestHandler } from "../file-handlers/general-file-handler-requests.js";
import { DatapackMetadata } from "@tsconline/shared";

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
  try {
    const response = await editDatapackMetadataRequestHandler(request.parts(), uuid, datapack);
    reply.status(response.code).send({ message: response.message });
  } catch (e) {
    reply.status(500).send({ error: "Failed to edit metadata" });
  }
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

/**
 * Will fetch both user and workshop metadatas
 * @param request
 * @param reply
 * @returns
 */
export const fetchUserDatapacksMetadata = async function fetchUserDatapackMetadata(
  request: FastifyRequest,
  reply: FastifyReply
) {
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

    const userDatapacks = await fetchAllUsersDatapacks(uuid);
    const workshops = await getActiveWorkshopsUserIsIn(user[0].userId);
    const workshopDatapacksPromises = workshops.map((workshop) =>
      fetchAllUsersDatapacks(getWorkshopUUIDFromWorkshopId(workshop.workshopId))
    );

    const workshopDatapacks = await Promise.all(workshopDatapacksPromises);
    const allDatapacks = [...userDatapacks, ...workshopDatapacks.flat()];

    const metadatas: DatapackMetadata[] = allDatapacks.map((datapack) => {
      return extractMetadataFromDatapack(datapack);
    });

    reply.send(metadatas);
  } catch (e) {
    console.error(e);
    reply.status(500).send({ error: "Failed to fetch metadatas" });
  }
};

export const fetchPublicUserDatapack = async function fetchPublicUserDatapack(
  request: FastifyRequest<{ Params: { uuid: string; datapackTitle: string } }>,
  reply: FastifyReply
) {
  const { uuid, datapackTitle } = request.params;
  const datapack = await fetchUserDatapack(uuid, datapackTitle).catch(() => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  });
  if (!datapack) {
    reply.status(404).send({ error: "Datapack or user does not exist or cannot be found" });
    return;
  }
  if (!datapack.isPublic) {
    reply.status(401).send({ error: "Datapack is not public" });
    return;
  }
  reply.send(datapack);
};

export const fetchWorkshopDatapack = async function fetchWorkshopDatapack(
  request: FastifyRequest<{ Params: { workshopUUID: string; datapackTitle: string } }>,
  reply: FastifyReply
) {
  const { workshopUUID, datapackTitle } = request.params;
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
    const result = verifyWorkshopValidity(workshopUUID, user[0].userId);
    if (result.code !== 200) {
      reply.status(result.code).send({ error: result.message });
      return;
    }
    const datapack = await fetchUserDatapack(workshopUUID, datapackTitle);
    if (!datapack) {
      reply.status(404).send({ error: "Datapack not found" });
      return;
    }
    reply.send(datapack);
  } catch (e) {
    console.error(e);
    reply.status(500).send({ error: "Unknown Error" });
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
  try {
    const result = await processAndUploadDatapack(uuid, request.parts());
    if (result.code !== 200) {
      reply.status(result.code).send({ error: result.message });
      return;
    }
  } catch (e) {
    reply.status(500).send({ error: "Error uploading datapack" });
  }
  reply.send({ message: "Datapack uploaded" });
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
