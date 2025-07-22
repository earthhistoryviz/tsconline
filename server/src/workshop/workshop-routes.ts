import { FastifyRequest, FastifyReply } from "fastify";
import { createZipFile, editDatapackMetadataRequestHandler } from "../file-handlers/general-file-handler-requests.js";
import { findWorkshop, isUserInWorkshop } from "../database.js";
import { getWorkshopFilesPath, getWorkshopIdFromUUID, verifyWorkshopValidity } from "./workshop-util.js";
import {
  ReservedWorkshopFileKey,
  SharedWorkshop,
  filenameInfoMap,
  getWorkshopUUIDFromWorkshopId
} from "@tsconline/shared";
import { getWorkshopDatapacksNames, getWorkshopFilesNames } from "../upload-handlers.js";
import path from "node:path";
import { readFile } from "fs/promises";
import { verifyNonExistentFilepath } from "../util.js";
import { fetchWorkshopCoverPictureFilepath } from "../upload-handlers.js";
import { assetconfigs, checkFileExists } from "../util.js";
import logger from "../error-logger.js";
import { createReadStream } from "fs";
import { readdir } from "node:fs/promises";
import fs from "fs/promises";
import os from "os";
import { getUserUUIDDirectory } from "../user/fetch-user-files.js";

export const serveWorkshopHyperlinks = async (
  request: FastifyRequest<{ Params: { workshopId: number; filename: ReservedWorkshopFileKey } }>,
  reply: FastifyReply
) => {
  const { workshopId, filename } = request.params;
  try {
    const fileInfo = filenameInfoMap[filename];
    const user = request.user!; // already verified in verifyAuthority
    const isAuthorized = user.isAdmin || (await isUserInWorkshop(user.userId, workshopId));
    if (!isAuthorized) {
      return reply.status(403).send({ error: "Not registered for workshop" });
    }
    const filesDir = await getWorkshopFilesPath(workshopId);
    const filePath = path.join(filesDir, fileInfo.actualFilename);
    if (!(await checkFileExists(filePath))) {
      reply.status(404).send({ error: "File not found" });
      return;
    }
    return reply
      .type("application/pdf")
      .header("Content-Disposition", `inline; filename="${fileInfo.displayName}"`)
      .send(createReadStream(filePath));
  } catch (e) {
    logger.error("Error serving workshop hyperlinks:", e);
    reply.status(500).send({ error: "An error occurred" });
  }
};

export const editWorkshopDatapackMetadata = async function editWorkshopDatapackMetadata(
  request: FastifyRequest<{ Params: { workshopUUID: string; datapackTitle: string } }>,
  reply: FastifyReply
) {
  const { workshopUUID, datapackTitle } = request.params;
  try {
    const user = request.user!; // already verified in verifyAuthority
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
    const response = await editDatapackMetadataRequestHandler(
      request.parts(),
      getWorkshopUUIDFromWorkshopId(workshopId),
      datapackTitle
    );
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

        const datapacks = await getWorkshopDatapacksNames(workshop.workshopId);
        const files = await getWorkshopFilesNames(workshop.workshopId);

        return {
          title: workshop.title,
          start: start.toISOString(),
          end: end.toISOString(),
          workshopId: workshop.workshopId,
          active: start <= now && now <= end,
          regRestrict: Number(workshop.regRestrict) === 1,
          creatorUUID: workshop.creatorUUID,
          regLink: workshop.regLink,
          description: workshop.description,
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
  const { workshopId } = request.params;
  try {
    // user exists, already verified in verifyAuthority
    const user = request.user!;
    const isAuthorized = user.isAdmin || (await isUserInWorkshop(user.userId, workshopId));
    if (!isAuthorized) {
      reply.status(403).send({ error: "Unauthorized access" });
      return;
    }
    /*const filesFolder = await getWorkshopFilesPath(workshopId);
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
        const dir = await readdir(filesFolder, { withFileTypes: true });
        if (dir.length === 0) {
          reply.status(404).send({ error: "No files found for this workshop" });
          return;
        }
        file = await createZipFile(zipfile, filesFolder);
      } else {
        reply.status(500).send({ error: `Read error: ${(error as Error).message}` });
        return;
      }
    }
    reply.send(file);*/
    const filesDir = await getWorkshopFilesPath(workshopId);
    const workshopUUID = getWorkshopUUIDFromWorkshopId(workshopId);
    const datapacksRootDir = await getUserUUIDDirectory(workshopUUID, true);
    const datapacksDir = path.join(datapacksRootDir, "datapacks");

    // Create a temp directory to hold both folders
    const tempDir = path.join(os.tmpdir(), `workshop_zip_${workshopId}`);
    await fs.mkdir(tempDir, { recursive: true });

    // Copy filesDir and datapacksDir into tempDir (if they exist)
    const copyIfExists = async (src: string, dest: string) => {
      try {
        await fs.access(src);
        await fs.cp(src, dest, { recursive: true });
      } catch {
        // ignore if not exists
      }
    };
    await copyIfExists(filesDir, path.join(tempDir, "files"));
    await copyIfExists(datapacksDir, path.join(tempDir, "datapacks"));

    // Create the zip
    const zipFilePath = path.join(os.tmpdir(), `workshop_${workshopId}_all_files.zip`);
    if (!(await verifyNonExistentFilepath(zipFilePath))) {
      reply.status(500).send({ error: "Invalid directory path" });
      return;
    }
    const zipBuffer = await createZipFile(zipFilePath, tempDir);

    // Clean up tempDir
    await fs.rm(tempDir, { recursive: true, force: true });
    reply
      .header("Content-Type", "application/zip")
      .header("Content-Disposition", `attachment; filename="workshop_${workshopId}_all_files.zip"`)
      .send(zipBuffer);
  } catch (error) {
    logger.error("Error downloading workshop files zip:", error);
    reply.status(500).send({ error: "An error occurred" });
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
