import { FastifyRequest, FastifyReply } from "fastify";
import { createZipFile, editDatapackMetadataRequestHandler } from "../file-handlers/general-file-handler-requests.js";
import { findUser, findWorkshop, isUserInWorkshop } from "../database.js";
import { getWorkshopFilesPath, getWorkshopUUIDFromWorkshopId, verifyWorkshopValidity } from "./workshop-util.js";
import { SharedWorkshop } from "@tsconline/shared";
import { getWorkshopDatapacksNames, getWorkshopFilesNames } from "../upload-handlers.js";
import path from "node:path";
import { readFile } from "fs/promises";
import {createReadStream} from 'fs';
import { getUserUUIDDirectory } from "../user/fetch-user-files.js";
import { verifyFilepath, verifyNonExistentFilepath } from "../util.js";

import { fetchWorkshopCoverPictureFilepath } from "../upload-handlers.js";
import { assetconfigs, checkFileExists } from "../util.js";

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


export const downloadWorkshopFile = async function downloadWorkshopFile(
  request: FastifyRequest<{ Params: { workshopId: number, fileName: string} }>,
  reply: FastifyReply
) {
  try{
    // already verified uuid in verifyAuthority
    const uuid = request.session.get("uuid")!;
    const { workshopId, fileName} = request.params;

    const user = (await findUser({ uuid }))[0]!;
    if (!user.isAdmin && !(await isUserInWorkshop(user.userId, workshopId))) {
      reply.status(403).send({ error: "Unauthorized access" });
      return;
    }

    const workshopUUID = getWorkshopUUIDFromWorkshopId(workshopId);
    const directory = await getUserUUIDDirectory(workshopUUID, true);


    var filePath = path.join(directory, "files");
    filePath = path.join(filePath, fileName);


    if (!(await verifyFilepath(filePath))){
      reply.status(500).send({ error: "Invalid file path"});
      return;
    }

    const stream = createReadStream(filePath);
    return reply.send(stream);

  } catch (e) {
    reply.status(500).send({ error: "An error occurred" });
  }
};

export const downloadWorkshopDetailsDataPack = async function downloadWorkshopDetailsDataPack(
  request: FastifyRequest<{ Params: { workshopId: number, datapackTitle: string} }>,
  reply: FastifyReply
) {
  try{

    // already verified uuid in verifyAuthority
    const uuid = request.session.get("uuid")!;
    const { workshopId, datapackTitle} = request.params;

    const user = (await findUser({ uuid }))[0]!;
    if (!user.isAdmin && !(await isUserInWorkshop(user.userId, workshopId))) {
      reply.status(403).send({ error: "Unauthorized access" });
      return;
    }

    const workshopUUID = getWorkshopUUIDFromWorkshopId(workshopId);
    const directory = await getUserUUIDDirectory(workshopUUID, true);

    var datapackBasePath = path.join(directory, "datapacks/");

    let zipfile = path.join(datapackBasePath, `/${datapackTitle}.zip`);;

    //contains path of datapack folder
    let datapackPath = path.join(datapackBasePath, datapackTitle);



    // Check if ZIP file already exists
    let file;
    try {
      file = await readFile(zipfile);
    } catch (e) {
      const error = e as NodeJS.ErrnoException;
      if (error.code !== "ENOENT") {
        reply.status(500).send({ error: "An error occurred: " + e });
        return;
      }
    }

    //check if decrypted folder exists
    if (!(await verifyFilepath(datapackPath))){
      reply.status(500).send({ error: "Invalid datapack path"});
      return;
    }
    try {   
      if (!file){
       file = await createZipFile(zipfile, datapackPath);
      }
      reply.status(200).send(file);

    } catch(e) {
      reply.status(500).send({ error: "Error creating Zip"});
    }

  } catch (e: any) {
    reply.status(500).send({ error: e});
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
