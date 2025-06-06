import { FastifyRequest, FastifyReply } from "fastify";
import { createZipFile, editDatapackMetadataRequestHandler } from "../file-handlers/general-file-handler-requests.js";
import { findUser, findWorkshop, isUserInWorkshop } from "../database.js";
import { getWorkshopFilesPath, verifyWorkshopValidity } from "./workshop-util.js";
import { SharedWorkshop } from "@tsconline/shared";
import { getWorkshopDatapacksNames, getWorkshopFilesNames } from "../upload-handlers.js";
import path from "node:path";
import { readFile } from "fs/promises";
import { verifyNonExistentFilepath } from "../util.js";

import { fetchWorkshopCoverPictureFilepath } from "../upload-handlers.js";
import { assetconfigs, checkFileExists } from "../util.js";
import logger from "../error-logger.js";

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

export const downloadWorkshopFilesZip = async (
  request: FastifyRequest<{ Params: { workshopId: number } }>,
  reply: FastifyReply
) => {
  // already verified uuid in verifyAuthority
  const uuid = request.session.get("uuid")!;
  const { workshopId } = request.params;
  try {
    // user exists, already verified in verifyAuthority
    const user = (await findUser({ uuid }))[0]!;
    const isAuthorized = user.isAdmin || (await isUserInWorkshop(user.userId, workshopId));
    if (!isAuthorized) {
      reply.status(403).send({ error: "Unauthorized access" });
      return;
    }
    const filesFolder = await getWorkshopFilesPath(workshopId);
    const baseDir = path.dirname(filesFolder);
    const zipfile = path.resolve(baseDir, `filesFor${workshopId}.zip`);
    if (!(await verifyNonExistentFilepath(zipfile))) {
      reply.status(500).send({ error: "Invalid directory path" });
      return;
    }
    let file: Buffer;
    try {
      file = await readFile(zipfile);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        file = await createZipFile(zipfile, filesFolder);
      } else {
        reply.status(500).send({ error: `Read error: ${(error as Error).message}` });
        return;
      }
    }
    reply.send(file);
  } catch (error) {
    logger.error("Error downloading workshop files zip:", error);
    reply.status(500).send({ error: "An error occurred" });
    return;
  }
};

export const fetchWorkshopCoverImage = async function (
  request: FastifyRequest<{ Params: { workshopId: number } }>,
  reply: FastifyReply
) {
  const { workshopId } = request.params;
  const defaultFilepath = path.join(assetconfigs.datapackImagesDirectory, "TSCreatorLogo.png");
  try {
    const imageFilepath = await fetchWorkshopCoverPictureFilepath(workshopId);
    if (!imageFilepath) throw new Error("No cover image found");

    reply.send(await readFile(imageFilepath));
  } catch (e) {
    try {
      if (await checkFileExists(defaultFilepath)) {
        reply.send(await readFile(defaultFilepath));
        return;
      }
    } catch (e) {
      // eslint-disable-next-line no-console
    }
    console.error("Error fetching image: ", e);
    reply.status(500).send({ error: "Internal Server Error" });
  }
};
