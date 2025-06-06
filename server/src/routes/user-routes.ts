import { FastifyRequest, FastifyReply } from "fastify";
import { rm, mkdir, readFile } from "fs/promises";
import { getEncryptionDatapackFileSystemDetails, runJavaEncrypt } from "../encryption.js";
import {
  assetconfigs,
  checkHeader,
  extractMetadataFromDatapack,
  verifyFilepath,
  verifyNonExistentFilepath
} from "../util.js";
import {
  createDatapackComment,
  deleteComment,
  findCurrentDatapackComments,
  findDatapackComment,
  findUser,
  getActiveWorkshopsUserIsIn,
  updateComment
} from "../database.js";
import { deleteUserDatapack, fetchAllUsersDatapacks, fetchUserDatapack } from "../user/user-handler.js";
import {
  getWorkshopIdFromUUID,
  getWorkshopUUIDFromWorkshopId,
  verifyWorkshopValidity
} from "../workshop/workshop-util.js";
import { processAndUploadDatapack } from "../upload-datapack.js";
import { createZipFile, editDatapackMetadataRequestHandler } from "../file-handlers/general-file-handler-requests.js";
import { DatapackMetadata } from "@tsconline/shared";
import {
  getPDFFilesDirectoryFromDatapackDirectory,
  getUsersDatapacksDirectoryFromUUIDDirectory,
  getUserUUIDDirectory
} from "../user/fetch-user-files.js";
import path from "path";
import { deleteChartHistory, getChartHistory, getChartHistoryMetadata } from "../user/chart-history.js";
import { NewDatapackComment, assertDatapackCommentWithProfilePicture } from "../types.js";

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
      reply.status(404).send({ error: "Datapack does not exist or cannot be found" });
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
    const workshopId = getWorkshopIdFromUUID(workshopUUID);
    if (!workshopId) {
      reply.status(400).send({ error: "Invalid workshop UUID" });
      return;
    }
    const result = await verifyWorkshopValidity(workshopId, user[0].userId);
    if (result.code !== 200) {
      reply.status(result.code).send({ error: result.message });
      return;
    }
    const datapack = await fetchUserDatapack(workshopUUID, datapackTitle).catch(() => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    });
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

export const uploadExternalDatapack = async function uploadExternalDatapack(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    // Check token
    const authHeader = request.headers["authorization"];
    if (!authHeader) {
      reply.status(401).send({ error: "Token missing" });
      return;
    }
    const token = authHeader.split(" ")[1];
    if (!token) {
      reply.status(401).send({ error: "Token missing" });
      return;
    }
    const validToken = process.env.BEARER_TOKEN;
    if (!validToken) {
      reply.status(500).send({
        error: "Server misconfiguration: Missing BEARER_TOKEN on TSC Online. Contact admin"
      });
      return;
    }
    if (token !== validToken) {
      reply.status(403).send({ error: "Token mismatch" });
      return;
    }
    const datapackTitle = request.headers["datapacktitle"]; // This would be the phylum name for Treatise, and formation for Lexicons/OneStrat
    if (!datapackTitle) {
      console.error("Datapack requires datapackTitle field in header");
      reply.status(401).send({ error: "Datapack requires datapackTitle field in header" });
      return;
    }
    const datapackHash = request.headers["datapackhash"];
    if (!datapackHash) {
      reply.status(401).send({ error: "DatapackHash missing" });
      return;
    }
    const parts = request.parts();

    // If the title exist and the exact file exists, send it, otherwise delete the old file and upload the new one
    const officialDatapacks = await fetchAllUsersDatapacks("official");
    for (const datapack of officialDatapacks) {
      if (datapack.title === datapackTitle.toString()) {
        if (datapack.originalFileName === datapackHash + ".txt") {
          reply.status(200).send({ datapackTitle: datapack.title });
          return;
        } else {
          await deleteUserDatapack("official", datapackTitle.toString());
          break;
        }
      }
    }

    // does not exist, upload normally
    const result = await processAndUploadDatapack("official", parts, { bearerToken: token });
    if (result.code === 200) {
      reply.status(200).send({ datapackTitle: datapackTitle.toString() });
    } else {
      reply.status(result.code).send({ error: result.message });
    }
  } catch (error) {
    console.error("Error during /external-chart route:", error);
    reply.status(500).send({ error: "Internal server error" });
  }
};

export const fetchUserHistory = async function fetchUserHistory(
  request: FastifyRequest<{ Params: { timestamp: string } }>,
  reply: FastifyReply
) {
  const uuid = request.session.get("uuid");
  if (!uuid) {
    reply.status(401).send({ error: "User not logged in" });
    return;
  }
  const { timestamp } = request.params;
  try {
    const history = await getChartHistory(uuid, timestamp);
    reply.send(history);
  } catch (e) {
    if ((e as Error).message === "Invalid datapack symlink") {
      reply.status(404).send({ error: "Datapacks not found" });
      return;
    }
    reply.status(500).send({ error: "Failed to fetch history" });
  }
};

export const fetchUserHistoryMetadata = async function fetchUserHistoryMetadata(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const uuid = request.session.get("uuid");
  if (!uuid) {
    reply.status(401).send({ error: "User not logged in" });
    return;
  }
  try {
    const metadata = await getChartHistoryMetadata(uuid);
    reply.send(metadata);
  } catch (e) {
    reply.status(500).send({ error: "Failed to fetch history metadata" });
  }
};

export const deleteUserHistory = async function deleteUserHistory(
  request: FastifyRequest<{ Params: { timestamp: string } }>,
  reply: FastifyReply
) {
  const uuid = request.session.get("uuid");
  if (!uuid) {
    reply.status(401).send({ error: "User not logged in" });
    return;
  }
  const { timestamp } = request.params;
  try {
    await deleteChartHistory(uuid, timestamp);
    reply.send({ message: "History deleted" });
  } catch (e) {
    console.error(e);
    reply.status(500).send({ error: "Failed to delete history" });
  }
};

export const downloadDatapackFilesZip = async function downloadDatapackFilesZip(
  request: FastifyRequest<{ Params: { datapackTitle: string; uuid: string; isPublic: boolean } }>,
  reply: FastifyReply
) {
  const { datapackTitle, uuid, isPublic } = request.params;

  if (!datapackTitle || /[<>:"/\\|?*]/.test(datapackTitle)) {
    reply.status(400).send({ error: "Missing datapack title" });
    return;
  }

  const directory = await getUserUUIDDirectory(uuid, isPublic);
  const datapacksFolder = await getUsersDatapacksDirectoryFromUUIDDirectory(directory);
  const datapackFolder = path.join(datapacksFolder, datapackTitle);

  if (!datapackFolder.startsWith(datapacksFolder)) {
    reply.status(400).send({ error: "Invalid datapack title" });
    return;
  }

  const filesDir = await getPDFFilesDirectoryFromDatapackDirectory(datapackFolder);
  if (!(await verifyFilepath(filesDir))) {
    reply.status(500).send({ error: "Invalid directory path" });
    return;
  }
  const zipfile = path.resolve(directory, `filesFor${datapackTitle}.zip`); //could be non-existent
  if (!(await verifyNonExistentFilepath(zipfile))) {
    reply.status(500).send({ error: "Invalid directory path" });
    return;
  }
  if (!zipfile.startsWith(path.join(process.cwd(), directory))) {
    reply.status(500).send({ error: "Invalid directory path" });
    return;
  }
  try {
    let file;
    try {
      if (!zipfile.startsWith(process.cwd())) {
        reply.status(500).send({ error: "Invalid directory path" });
      }
      file = await readFile(zipfile);
    } catch (e) {
      const error = e as NodeJS.ErrnoException;
      if (error.code !== "ENOENT") {
        reply.status(500).send({ error: "An error occurred: " + e });
        return;
      }
    }

    if (!file) {
      file = await createZipFile(zipfile, filesDir);
    }
    reply.send(file);
  } catch (e) {
    const error = e as NodeJS.ErrnoException;
    if (error.code === "ENOENT") {
      reply.status(404).send({ error: "Failed to process the file" });
    } else {
      reply.status(500).send({ error: "An error occurred: " + e });
    }
  }
};

export const uploadDatapackComment = async function uploadDatapackComment(
  request: FastifyRequest<{ Params: { datapackTitle: string }; Body: { commentText: string } }>,
  reply: FastifyReply
) {
  const uuid = request.session.get("uuid");
  const user = await findUser({ uuid });
  if (!user || user.length !== 1 || !user[0]) {
    reply.status(401).send({ error: "Unauthorized access" });
    return;
  }
  const { commentText } = request.body;
  const { datapackTitle } = request.params;
  if (!uuid) {
    reply.status(401).send({ error: "User not logged in" });
    return;
  }

  if (!datapackTitle || /[<>:"/\\|?*]/.test(datapackTitle)) {
    reply.status(400).send({ error: "Missing datapack title" });
    return;
  }

  if (!commentText || commentText.trim().length === 0) {
    reply.status(400).send({ error: "Missing comment text" });
    return;
  }

  try {
    const newDatapackComment: NewDatapackComment = {
      uuid: uuid,
      commentText: commentText,
      datapackTitle: datapackTitle,
      dateCreated: new Date().toISOString(),
      flagged: 0,
      username: user[0].username
    };

    await createDatapackComment(newDatapackComment);

    const insertedComment = (
      await findDatapackComment({ uuid: uuid, datapackTitle: datapackTitle, commentText: commentText })
    )[0];
    if (!insertedComment) {
      throw new Error("Datapack comment not inserted");
    }

    reply.send({ message: "Datapack comment creation successful", id: insertedComment.id });
  } catch (e) {
    reply.status(500).send({ error: "Error uploading datapack comment" });
  }
};

export const fetchDatapackComments = async function fetchDatapackComments(
  request: FastifyRequest<{ Params: { datapackTitle: string } }>,
  reply: FastifyReply
) {
  const { datapackTitle } = request.params;

  if (!datapackTitle || datapackTitle.trim() === "") {
    reply.status(400).send({ error: "Missing or invalid datapack title" });
    return;
  }
  try {
    const datapackComments = await findCurrentDatapackComments({ datapackTitle: datapackTitle });
    for (const comment of datapackComments) {
      assertDatapackCommentWithProfilePicture(comment);
    }
    reply.send(datapackComments);
  } catch (e) {
    reply.status(500).send({ error: "Error fetching datapack comments" });
  }
};

export const updateDatapackComment = async function updateDatapackComment(
  request: FastifyRequest<{ Params: { commentId: number }; Body: { flagged: number } }>,
  reply: FastifyReply
) {
  const uuid = request.session.get("uuid");
  const user = await findUser({ uuid });
  if (!user || user.length !== 1 || !user[0]) {
    reply.status(401).send({ error: "Unauthorized access" });
    return;
  }
  if (!uuid) {
    reply.status(401).send({ error: "User not logged in" });
    return;
  }
  const { commentId } = request.params;
  const { flagged } = request.body;

  if (!commentId || isNaN(Number(commentId))) {
    reply.status(400).send({ error: "Invalid or missing comment ID" });
    return;
  }
  if (flagged === undefined) {
    reply.status(400).send({ error: "Missing flagged in body" });
    return;
  }

  const updateData: { flagged: number } = { flagged: flagged };
  try {
    const result = await updateComment({ id: commentId }, updateData);

    // check that database entry was updated
    if (result.length && result[0]?.numUpdatedRows) {
      reply.send({ message: "Datapack comment modified." });
    } else {
      reply.status(404).send({ error: "Datapack comment not found." });
    }
  } catch (e) {
    reply.status(500).send({ error: "Error updating datapack comment" });
  }
};

export const deleteDatapackComment = async function deleteDatapackComment(
  request: FastifyRequest<{ Params: { commentId: number } }>,
  reply: FastifyReply
) {
  const uuid = request.session.get("uuid");
  const user = await findUser({ uuid });
  if (!user || user.length !== 1 || !user[0]) {
    reply.status(401).send({ error: "Unauthorized access" });
    return;
  }
  if (!uuid) {
    reply.status(401).send({ error: "User not logged in" });
    return;
  }
  const { commentId } = request.params;

  if (commentId === undefined) {
    reply.status(400).send({ error: "Missing or invalid comment ID." });
    return;
  }

  try {
    const comment = await findDatapackComment({ id: commentId });
    // check that user deleting comment is same user that posted comment
    if (!comment.length) {
      reply.status(404).send({ error: "Requested comment not found." });
      return;
    } else if (comment[0]?.uuid !== uuid) {
      reply.status(403).send({ error: "Cannot delete other's comments." });
      return;
    }
    await deleteComment({ id: commentId });
    reply.send({ message: "Datapack comment deleted." });
  } catch (e) {
    reply.status(500).send({ error: "Error deleting datapack comment" });
  }
};
