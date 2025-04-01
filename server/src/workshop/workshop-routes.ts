import { FastifyRequest, FastifyReply } from "fastify";
import { createZipFile, editDatapackMetadataRequestHandler } from "../file-handlers/general-file-handler-requests.js";
import { findUser, findWorkshop, isUserInWorkshop } from "../database.js";
import { getWorkshopFilesPath, getWorkshopUUIDFromWorkshopId, verifyWorkshopValidity } from "./workshop-util.js";
import { SharedWorkshop } from "@tsconline/shared";
import { getWorkshopDatapacksNames, getWorkshopFilesNames } from "../upload-handlers.js";
import path from "node:path";
import { readFile } from "fs/promises";
import { getUserUUIDDirectory } from "../user/fetch-user-files.js";
import { verifyNonExistentFilepath } from "../util.js";

export const editWorkshopDatapackMetadata = async function editWorkshopDatapackMetadata(
  request: FastifyRequest<{ Params: { workshopUUID: string; datapackTitle: string } }>,
  reply: FastifyReply
) {
  const { workshopUUID, datapackTitle } = request.params;
  const uuid = request.session.get("uuid");
  try {
    const user = await findUser({ uuid });
    if (!user || user.length !== 1 || !user[0]) {
      reply.status(401).send({ error: "Unauthorized access" });
      return;
    }
    const result = await verifyWorkshopValidity(workshopUUID, user[0].userId);
    if (result.code !== 200) {
      reply.status(result.code).send({ error: result.message });
      return;
    }
    const response = await editDatapackMetadataRequestHandler(request.parts(), workshopUUID, datapackTitle);
    reply.status(response.code).send({ message: response.message });
  } catch (e) {
    reply.status(500).send({ error: "Failed to edit metadata" });
  }
};

/**
 * Fetch all workshops
 * @param _request
 * @param reply
 * @returns
 */
export const fetchAllWorkshops = async function fetchAllWorkshops(_request: FastifyRequest, reply: FastifyReply) {
  try {
    const workshops: SharedWorkshop[] = await Promise.all(
      (await findWorkshop({})).map(async (workshop) => {
        const now = new Date();
        const start = new Date(workshop.start);
        const end = new Date(workshop.end);

        const datapacks = (await getWorkshopDatapacksNames(workshop.workshopId)) || [];
        const files = (await getWorkshopFilesNames(workshop.workshopId)) || [];

        return {
          title: workshop.title,
          start: start.toISOString(),
          end: end.toISOString(),
          workshopId: workshop.workshopId,
          active: start <= now && now <= end,
          regRestrict: Number(workshop.regRestrict) === 1,
          creatorUUID: workshop.creatorUUID,
          regLink: workshop.regLink ? workshop.regLink : "",
          datapacks: datapacks,
          files: files
        };
      })
    );

    reply.send(workshops);
  } catch (error) {
    console.error(error);
    reply.status(500).send({ error: "Unknown error" });
  }
};

export const downloadWorkshopFilesZip = async function downloadWorkshopFilesZip(
  request: FastifyRequest<{ Params: { workshopId: number } }>,
  reply: FastifyReply
) {
  // already verified uuid in verifyAuthority
  const uuid = request.session.get("uuid")!;
  const { workshopId } = request.params;
  try {
    // user exists, already verified in verifyAuthority
    const user = (await findUser({ uuid }))[0]!;
    if (!user.isAdmin && !(await isUserInWorkshop(user.userId, workshopId))) {
      reply.status(403).send({ error: "Unauthorized access" });
      return;
    }
    const workshopUUID = getWorkshopUUIDFromWorkshopId(workshopId);
    const directory = await getUserUUIDDirectory(workshopUUID, true);
    let filesFolder;
    try {
      filesFolder = await getWorkshopFilesPath(directory);
    } catch (error) {
      reply.status(500).send({ error: "Invalid directory path" });
      return;
    }
    const zipfile = path.resolve(directory, `filesFor${workshopUUID}.zip`); //could be non-existent
    if (!(await verifyNonExistentFilepath(zipfile))) {
      reply.status(500).send({ error: "Invalid directory path" });
      return;
    }
    try {
      let file;

      // Check if ZIP file already exists
      try {
        file = await readFile(zipfile);
      } catch (e) {
        const error = e as NodeJS.ErrnoException;
        if (error.code !== "ENOENT") {
          reply.status(500).send({ error: "An error occurred: " + e });
          return;
        }
      }

      // If ZIP file doesn't exist, create one
      if (!file) {
        file = await createZipFile(zipfile, filesFolder);
      }
      reply.send(file);
    } catch (e) {
      const error = e as NodeJS.ErrnoException;
      if (error.code === "ENOENT") {
        reply.status(404).send({ error: "Failed to process the file" });
        return;
      }
      throw e;
    }
  } catch (e) {
    reply.status(500).send({ error: "An error occurred" });
  }
};
