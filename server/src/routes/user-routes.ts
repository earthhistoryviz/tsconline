import { FastifyRequest, FastifyReply } from "fastify";
import { rm, mkdir, readFile } from "fs/promises";
import { getEncryptionDatapackFileSystemDetails, runJavaEncrypt } from "../encryption.js";
import { assetconfigs, checkHeader } from "../util.js";
import { findUser, getActiveWorkshopsUserIsIn } from "../database.js";
import {
  convertNonStringFieldsToCorrectTypesInDatapackMetadataRequest,
  deleteUserDatapack,
  editDatapack,
  fetchAllUsersDatapacks,
  fetchUserDatapack,
  processEditDatapackRequest
} from "../user/user-handler.js";
import { isOperationResult } from "../types.js";
import { getWorkshopUUIDFromWorkshopId } from "../workshop/workshop-util.js";
import { processAndUploadDatapack } from "../upload-datapack.js";

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

    const userDatapacks = await fetchAllUsersDatapacks(uuid);
    const workshops = await getActiveWorkshopsUserIsIn(user[0].userId);
    const workshopDatapacksPromises = workshops.map((workshop) =>
      fetchAllUsersDatapacks(getWorkshopUUIDFromWorkshopId(workshop.workshopId))
    );

    const workshopDatapacks = await Promise.all(workshopDatapacksPromises);
    const allDatapacks = [...userDatapacks, ...workshopDatapacks.flat()];

    reply.send(allDatapacks);
  } catch (e) {
    console.error(e);
    reply.status(500).send({ error: "Database or processing error" });
  }
};

// If at some point a delete datapack function is needed, this function needs to be modified for race conditions
export const uploadDatapack = async function uploadDatapack(request: FastifyRequest, reply: FastifyReply) {
  const uuid = request.session.get("uuid");
  if (!uuid) {
    reply.status(401).send({ error: "User not logged in" });
    return;
  }
  const parts = request.parts();
  try {
    const result = await processAndUploadDatapack(uuid, parts);
    if (result.code !== 200) {
      reply.status(result.code).send({ error: result.message });
      return;
    }
  } catch (e) {
    reply.status(500).send({ error: "Unknown error" });
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
