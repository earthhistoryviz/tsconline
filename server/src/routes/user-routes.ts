import { FastifyRequest, FastifyReply, RouteGenericInterface } from "fastify";
import { rm, mkdir, readFile } from "fs/promises";
import { getEncryptionDatapackFileSystemDetails, runJavaEncrypt } from "../encryption.js";
import { assetconfigs, checkHeader, extractMetadataFromDatapack } from "../util.js";
import {
  createDatapackComment,
  deleteComment,
  findCurrentDatapackComments,
  findDatapackComment,
  getActiveWorkshopsUserIsIn,
  updateComment
} from "../database.js";
import {
  deleteUserDatapack,
  downloadDatapackFilesZip,
  fetchAllUsersDatapacks,
  fetchUserDatapack
} from "../user/user-handler.js";
import { getWorkshopIdFromUUID, verifyWorkshopValidity } from "../workshop/workshop-util.js";
import { downloadWorkshopFilesZip } from "../workshop/workshop-routes.js";
import { processAndUploadDatapack } from "../upload-datapack.js";
import { editDatapackMetadataRequestHandler } from "../file-handlers/general-file-handler-requests.js";
import { DatapackMetadata, getWorkshopUUIDFromWorkshopId, checkUserAllowedDownloadDatapack } from "@tsconline/shared";
import { deleteChartHistory, getChartHistory, getChartHistoryMetadata } from "../user/chart-history.js";
import { NewDatapackComment, assertDatapackCommentWithProfilePicture } from "../types.js";
import logger from "../error-logger.js";

interface EditDatapackMetadataRequest extends RouteGenericInterface {
  Params: {
    datapack: string;
  };
}
export const editDatapackMetadata = async function editDatapackMetadata(
  request: FastifyRequest<EditDatapackMetadataRequest>,
  reply: FastifyReply
) {
  const { datapack } = request.params;
  const user = request.user!; // This should be set by a preHandler that verifies the user is logged in
  try {
    const response = await editDatapackMetadataRequestHandler(request.parts(), user.uuid, datapack);
    reply.status(response.code).send({ message: response.message });
  } catch (e) {
    reply.status(500).send({ error: "Failed to edit metadata" });
  }
};

interface FetchSingleUserDatapackRequest extends RouteGenericInterface {
  Params: {
    datapack: string;
  };
}
export const fetchSingleUserDatapack = async function fetchSingleUserDatapack(
  request: FastifyRequest<FetchSingleUserDatapackRequest>,
  reply: FastifyReply
) {
  const { datapack } = request.params;
  const user = request.user!; // This should be set by a preHandler that verifies the user is logged in
  const metadata = await fetchUserDatapack(user.uuid, datapack).catch(() => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  });
  if (!metadata) {
    reply.status(404).send({ error: "Datapack does not exist or cannot be found" });
    return;
  }
  reply.send(metadata);
};

interface RequestDownloadRequest extends RouteGenericInterface {
  Params: {
    datapack: string;
  };
  Querystring: {
    needEncryption?: boolean;
  };
}
export const requestDownload = async function requestDownload(
  request: FastifyRequest<RequestDownloadRequest>,
  reply: FastifyReply
) {
  const user = request.user!; // This should be set by a preHandler that verifies the user is logged in
  // for test usage: const uuid = "username";
  const { needEncryption } = request.query;
  const { datapack } = request.params;
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
    } = await getEncryptionDatapackFileSystemDetails(user.uuid, datapack);
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

// user route to download all workshop files
export const downloadAllFilesZip = async (
  request: FastifyRequest<{ Params: { workshopId: number } }>,
  reply: FastifyReply
) => {
  const user = request.user!;
  await downloadWorkshopFilesZip(request, reply);
}

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
  const user = request.user!; // This should be set by a preHandler that verifies the user is logged in
  try {
    const userDatapacks = await fetchAllUsersDatapacks(user.uuid);
    const workshops = await getActiveWorkshopsUserIsIn(user.userId);
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

interface FetchPublicUserDatapackRequest extends RouteGenericInterface {
  Params: {
    uuid: string;
    datapackTitle: string;
  };
}
export const fetchPublicUserDatapack = async function fetchPublicUserDatapack(
  request: FastifyRequest<FetchPublicUserDatapackRequest>,
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

interface FetchWorkshopDatapackRequest extends RouteGenericInterface {
  Params: {
    workshopUUID: string;
    datapackTitle: string;
  };
}
export const fetchWorkshopDatapack = async function fetchWorkshopDatapack(
  request: FastifyRequest<FetchWorkshopDatapackRequest>,
  reply: FastifyReply
) {
  const { workshopUUID, datapackTitle } = request.params;
  const user = request.user!; // This should be set by a preHandler that verifies the user is logged in
  try {
    const workshopId = getWorkshopIdFromUUID(workshopUUID);
    if (!workshopId) {
      reply.status(400).send({ error: "Invalid workshop UUID" });
      return;
    }
    const result = await verifyWorkshopValidity(workshopId, user.userId);
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
  const user = request.user!; // This should be set by a preHandler that verifies the user is logged in
  try {
    const result = await processAndUploadDatapack(user.uuid, request.parts());
    if (result.code !== 200) {
      reply.status(result.code).send({ error: result.message });
      return;
    }
  } catch (e) {
    reply.status(500).send({ error: "Error uploading datapack" });
  }
  reply.send({ message: "Datapack uploaded" });
};

interface UserDeleteDatapackRequest extends RouteGenericInterface {
  Params: {
    datapack: string;
  };
}
export const userDeleteDatapack = async function userDeleteDatapack(
  request: FastifyRequest<UserDeleteDatapackRequest>,
  reply: FastifyReply
) {
  const user = request.user!; // This should be set by a preHandler that verifies the user is logged in
  const { datapack } = request.params;
  try {
    await deleteUserDatapack(user.uuid, datapack);
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
    logger.error(error);
    reply.status(500).send({ error: "Internal server error" });
  }
};

interface FetchUserHistoryRequest extends RouteGenericInterface {
  Params: {
    timestamp: string;
  };
}
export const fetchUserHistory = async function fetchUserHistory(
  request: FastifyRequest<FetchUserHistoryRequest>,
  reply: FastifyReply
) {
  const user = request.user!;
  const { timestamp } = request.params;
  try {
    const history = await getChartHistory(user.uuid, timestamp);
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
  try {
    const user = request.user!; // This should be set by a preHandler that verifies the user is logged in
    const metadata = await getChartHistoryMetadata(user.uuid);
    reply.send(metadata);
  } catch (e) {
    reply.status(500).send({ error: "Failed to fetch history metadata" });
  }
};

interface DeleteUserHistoryRequest extends RouteGenericInterface {
  Params: {
    timestamp: string;
  };
}
export const deleteUserHistory = async function deleteUserHistory(
  request: FastifyRequest<DeleteUserHistoryRequest>,
  reply: FastifyReply
) {
  const user = request.user!; // This should be set by a preHandler that verifies the user is logged in
  const { timestamp } = request.params;
  try {
    await deleteChartHistory(user.uuid, timestamp);
    reply.send({ message: "History deleted" });
  } catch (e) {
    console.error(e);
    reply.status(500).send({ error: "Failed to delete history" });
  }
};

interface DownloadDatapackFilesZipRequest extends RouteGenericInterface {
  Params: {
    datapackTitle: string;
    uuid: string;
  };
}
export const downloadPublicDatapackFilesZip = async function downloadPublicDatapackFilesZip(
  request: FastifyRequest<DownloadDatapackFilesZipRequest>,
  reply: FastifyReply
) {
  try {
    const { datapackTitle, uuid } = request.params;
    reply.send(await downloadDatapackFilesZip(uuid, datapackTitle));
  } catch (e) {
    console.error(e);
    reply.status(500).send({ error: "Error downloading datapack files zip" });
  }
};
export const downloadPrivateDatapackFilesZip = async function downloadPrivateDatapackFilesZip(
  request: FastifyRequest<DownloadDatapackFilesZipRequest>,
  reply: FastifyReply
) {
  const user = request.user!; // This should be set by a preHandler that verifies the user is logged in
  const { datapackTitle, uuid } = request.params;
  try {
    const datapackMetadata = await fetchUserDatapack(uuid, datapackTitle).catch(() => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    });
    if (!datapackMetadata) {
      reply.status(404).send({ error: "Datapack not found" });
      return;
    }
    if (!checkUserAllowedDownloadDatapack({ isAdmin: !!user.isAdmin, uuid: user.uuid }, datapackMetadata)) {
      reply.status(403).send({ error: "Unauthorized to download this datapack" });
      return;
    }
    reply.send(await downloadDatapackFilesZip(uuid, datapackTitle));
  } catch (e) {
    reply.status(500).send({ error: "Error downloading datapack files zip" });
    console.error(e);
  }
};

interface UploadDatapackComment extends RouteGenericInterface {
  Params: {
    datapackTitle: string;
  };
  Body: {
    commentText: string;
  };
}
export const uploadDatapackComment = async function uploadDatapackComment(
  request: FastifyRequest<UploadDatapackComment>,
  reply: FastifyReply
) {
  const user = request.user!; // This should be set by a preHandler that verifies the user is logged in
  const { commentText } = request.body;
  const { datapackTitle } = request.params;

  try {
    const newDatapackComment: NewDatapackComment = {
      uuid: user.uuid,
      commentText: commentText,
      datapackTitle: datapackTitle,
      dateCreated: new Date().toISOString(),
      flagged: 0,
      username: user.username
    };

    await createDatapackComment(newDatapackComment);

    const insertedComment = (
      await findDatapackComment({ uuid: user.uuid, datapackTitle: datapackTitle, commentText: commentText })
    )[0];
    if (!insertedComment) {
      throw new Error("Datapack comment not inserted");
    }

    reply.send({ message: "Datapack comment creation successful", id: insertedComment.id });
  } catch (e) {
    reply.status(500).send({ error: "Error uploading datapack comment" });
  }
};

interface FetchDatapackCommentsRequest extends RouteGenericInterface {
  Params: {
    datapackTitle: string;
  };
}
export const fetchDatapackComments = async function fetchDatapackComments(
  request: FastifyRequest<FetchDatapackCommentsRequest>,
  reply: FastifyReply
) {
  const { datapackTitle } = request.params;

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

interface UpdateDatapackCommentRequest extends RouteGenericInterface {
  Params: {
    commentId: number;
  };
  Body: {
    flagged: number;
  };
}
export const updateDatapackComment = async function updateDatapackComment(
  request: FastifyRequest<UpdateDatapackCommentRequest>,
  reply: FastifyReply
) {
  const { commentId } = request.params;
  const { flagged } = request.body;

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

interface DeleteDatapackCommentRequest extends RouteGenericInterface {
  Params: {
    commentId: number;
  };
}
export const deleteDatapackComment = async function deleteDatapackComment(
  request: FastifyRequest<DeleteDatapackCommentRequest>,
  reply: FastifyReply
) {
  const user = request.user!; // This should be set by a preHandler that verifies the user is logged in
  const { commentId } = request.params;

  try {
    const comment = await findDatapackComment({ id: commentId });
    // check that user deleting comment is same user that posted comment
    if (!comment.length) {
      reply.status(404).send({ error: "Requested comment not found." });
      return;
    } else if (comment[0]?.uuid !== user.uuid) {
      reply.status(403).send({ error: "Cannot delete other's comments." });
      return;
    }
    await deleteComment({ id: commentId });
    reply.send({ message: "Datapack comment deleted." });
  } catch (e) {
    reply.status(500).send({ error: "Error deleting datapack comment" });
  }
};
