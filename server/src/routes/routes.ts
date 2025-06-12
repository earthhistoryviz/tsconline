import type { FastifyRequest, FastifyReply } from "fastify";
import { readFile } from "fs/promises";
import { TimescaleItem, assertTimescale, DatapackMetadata } from "@tsconline/shared";
import {
  assetconfigs,
  verifyFilepath,
  checkFileExists,
  extractMetadataFromDatapack,
  isFileTypeAllowed,
  uploadFileToGitHub
} from "../util.js";
import fs, { realpathSync } from "fs";
import { parseExcelFile } from "../parse-excel-file.js";
import path from "path";
import { fetchUserDatapackDirectory } from "../user/fetch-user-files.js";
import { fetchUserDatapack } from "../user/user-handler.js";
import { loadPublicUserDatapacks } from "../public-datapack-handler.js";
import { fetchDatapackProfilePictureFilepath, fetchMapPackImageFilepath } from "../upload-handlers.js";
import logger from "../error-logger.js";
import "dotenv/config";
import { randomUUID } from "crypto";
import {
  Job,
  jobStore,
  notifyListener,
  closeListener,
  generateChart,
  waitForSVGReady,
  ChartGenerationError
} from "../chart-generation-service.js";

export const submitBugReport = async function submitBugReport(request: FastifyRequest, reply: FastifyReply) {
  const parts = request.parts();
  let title = "";
  let description = "";
  let email = "";
  const files: { filename: string; buffer: Buffer }[] = [];
  const owner = "earthhistoryviz";

  const allowedExtensions = ["png", "jpg", "jpeg", "gif", "svg", "txt", "log", "json", "csv"];
  const allowedMimeTypes = [
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/svg+xml",
    "text/plain",
    "application/json",
    "text/csv"
  ];
  try {
    for await (const part of parts) {
      if (part.type === "file") {
        if (part.file.truncated) {
          reply.status(400).send({ error: "File size exceeds the limit" });
          return;
        }
        const { filename, mimetype } = part;
        if (!isFileTypeAllowed(filename, mimetype, allowedExtensions, allowedMimeTypes)) {
          reply.status(400).send({ error: "Invalid file type" });
          return;
        }
        const buffer = await part.toBuffer();
        files.push({ filename, buffer });
      } else if (part.type === "field") {
        if (part.fieldname === "title") title = (part.value as string).trim();
        else if (part.fieldname === "description") description = (part.value as string).trim();
        else if (part.fieldname === "email") email = (part.value as string).trim();
      }
    }
    if (!title || !description) {
      reply.status(400).send({ error: "Title and description are required" });
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const baseUploadPath = `bug-reports/${timestamp}-${Math.random().toString(36).slice(2, 4)}`;
    const uploadedFileLinks: string[] = [];
    for (const { filename, buffer } of files) {
      const link = await uploadFileToGitHub(owner, "tsconline-bug-reports", baseUploadPath, filename, buffer);
      const isImage = /\.(png|jpe?g|gif|svg)$/i.test(filename);
      uploadedFileLinks.push(isImage ? `![${filename}](${link})` : `- [${filename}](${link})`);
    }

    const issueTitle = `Bug Report: ${title}`;
    const issueBody = [
      "## Description",
      description,
      uploadedFileLinks.length > 0 ? `## Attachments\n\n${uploadedFileLinks.join("\n")}` : "",
      email ? `## Contact Email\n\n${email}` : ""
    ].join("\n\n");
    const response = await fetch(`https://api.github.com/repos/${owner}/tsconline/issues`, {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${process.env.GH_ISSUES_TOKEN}`
      },
      body: JSON.stringify({
        title: issueTitle,
        body: issueBody,
        labels: ["bug", "user-report"],
        assignees: ["JimOggPurdue"]
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Error submitting bug report:", errorText);
      reply.status(500).send({ error: "Failed to submit bug report" });
      return;
    }
    reply.send({ message: "Bug report submitted successfully" });
  } catch (error) {
    logger.error("Error processing bug report:", error);
    reply.status(500).send({ error: "Internal Server Error" });
  }
};

/**
 * Fetches the official datapack with the given name if it is public
 * @param request
 * @param reply
 * @returns
 */
export const fetchPublicOfficialDatapack = async function fetchPublicOfficialDatapack(
  request: FastifyRequest<{ Params: { name: string } }>,
  reply: FastifyReply
) {
  const { name } = request.params;
  if (!name) {
    reply.status(400).send({ error: "Invalid datapack" });
    return;
  }
  const officialDatapack = await fetchUserDatapack("official", name);
  if (!officialDatapack) {
    reply.status(404).send({ error: "Datapack not found" });
    return;
  }
  if (!officialDatapack.isPublic) {
    reply.status(403).send({ error: "Datapack is not public" });
    return;
  }
  reply.send(officialDatapack);
};

export const fetchPublicDatapacksMetadata = async function fetchPublicDatapacksMetadata(
  _request: FastifyRequest,
  reply: FastifyReply
) {
  const datapackArray = await loadPublicUserDatapacks();
  const datapackMetadata: DatapackMetadata[] = datapackArray.map((datapack) => {
    return extractMetadataFromDatapack(datapack);
  });
  reply.send(datapackMetadata);
};

export const fetchImage = async function (request: FastifyRequest, reply: FastifyReply) {
  const tryReadFile = async (filepath: string) => {
    if (!(await verifyFilepath(filepath))) {
      reply.status(403).send({ error: "Invalid file path" });
      return;
    }
    try {
      const file = await readFile(filepath);
      return file;
    } catch (e) {
      if (e instanceof Error && (e as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw e;
    }
  };
  try {
    const { isPublic, datapackTitle, datapackFilename, imageName, uuid } = request.body as {
      datapackTitle: string;
      datapackFilename: string;
      imageName: string;
      uuid: string;
      isPublic: boolean;
    };
    if (!datapackTitle || !imageName || !datapackFilename || !uuid || !isPublic) {
      reply.status(400).send({ error: "Invalid request" });
    }
    const datapackDir = await fetchUserDatapackDirectory(uuid, datapackTitle);
    // uuid can be server or workshop
    const imagePath = path.join(
      datapackDir,
      "decrypted",
      path.parse(datapackFilename).name,
      "datapack-images",
      imageName
    );
    const image = await tryReadFile(imagePath);
    if (!image) {
      reply.status(404).send({ error: "Image not found" });
      return;
    }
    reply.send(image);
  } catch (e) {
    console.error("Error fetching image: ", e);
    reply.status(500).send({ error: "Unknown error" });
  }
};

export const fetchSettingsXml = async function fetchSettingsJson(
  request: FastifyRequest<{ Params: { file: string } }>,
  reply: FastifyReply
) {
  try {
    let { file } = request.params;
    // sanitize and check filepath
    const root = process.cwd();
    file = realpathSync(path.resolve(root, file));
    if (!file.startsWith(root)) {
      reply.status(403).send({ error: "Invalid file path" });
      return;
    }
    //TODO: differentiate between preset and user uploaded datpack
    const settingsXml = (await readFile(`${decodeURIComponent(file)}`)).toString();
    reply.send(settingsXml);
  } catch (e) {
    reply.send({ error: e });
  }
};

export const handleChartGeneration = async function handleChartGeneration(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const jobId = randomUUID();
  const job: Job = {};
  jobStore.set(jobId, job);
  reply.send({ jobId });
  try {
    const { chartpath, hash } = await generateChart(request, jobId);
    notifyListener(jobId, JSON.stringify({ stage: "Waiting for file", percent: 90 }));
    await waitForSVGReady(path.join(assetconfigs.chartsDirectory, hash, "chart.svg"), 1000 * 30);
    notifyListener(jobId, JSON.stringify({ stage: "Complete", percent: 100, chartpath, hash }));
    closeListener(jobId);
    console.log("Chart generation complete for job:", jobId);
  } catch (error) {
    let message = "Unknown error";
    let errorCode = 5000;
    if (error instanceof ChartGenerationError) {
      message = error.message;
      errorCode = error.errorCode ?? 5000;
    } else if (error instanceof Error) {
      message = error.message;
    }
    notifyListener(jobId, JSON.stringify({ stage: "Error", percent: 0, error: message, errorCode }));
    closeListener(jobId);
  }
};

export const getChartProgress = async function getChartProgress(
  request: FastifyRequest<{ Params: { jobId: string } }>,
  reply: FastifyReply
) {
  const { jobId } = request.params;
  const job = jobStore.get(jobId);
  if (!job) {
    reply.status(404).send({ error: "Job not found" });
    return;
  }

  reply.raw.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": process.env.DOMAIN || "http://localhost:5173"
  });
  reply.raw.write("\n");
  job.listener = reply;

  request.raw.on("close", () => {
    console.log(`Client disconnected from job ${jobId}`);
    closeListener(jobId);
  });
};

// Serve timescale data endpoint
export const fetchTimescale = async function (_request: FastifyRequest, reply: FastifyReply) {
  try {
    const filePath = assetconfigs.timescaleFilepath;

    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      console.error("Error: Excel file not found");
      reply.status(404).send({ error: "Excel file not found" });
      return;
    }

    const excelData: string[][] = await parseExcelFile(filePath, 2);
    const timescaleData: TimescaleItem[] = excelData
      .map(([, , stage, ma]) => {
        const age = parseFloat(ma as string);
        return {
          key: stage as string,
          value: age > 10 ? Math.round(age * 100) / 100 : age
        };
      })
      .filter((item) => item.key);
    timescaleData.forEach((data) => assertTimescale(data));

    reply.send({ timescaleData });
  } catch (error) {
    console.error("Error reading Excel file:", error);
    reply.status(500).send({ error: "Internal Server Error" });
  }
};

export const fetchDatapackCoverImage = async function (
  request: FastifyRequest<{ Params: { title: string; uuid: string } }>,
  reply: FastifyReply
) {
  const { title, uuid } = request.params;
  const defaultFilepath = path.join(assetconfigs.datapackImagesDirectory, "default.png");
  try {
    if (title === "") {
      if (!(await checkFileExists(defaultFilepath))) {
        reply.status(404).send({ error: "Default image not found" });
        return;
      }
      reply.send(await readFile(defaultFilepath));
      return;
    }
    const uniqueImageFilepath = await fetchDatapackProfilePictureFilepath(decodeURIComponent(uuid), title);
    if (!uniqueImageFilepath || !(await checkFileExists(uniqueImageFilepath))) {
      if (!(await checkFileExists(defaultFilepath))) {
        reply.status(404).send({ error: "Default image not found" });
        return;
      }
      reply.send(await readFile(defaultFilepath));
      return;
    }
    reply.send(await readFile(uniqueImageFilepath));
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

export async function fetchMapImages(
  request: FastifyRequest<{ Params: { title: string; uuid: string; img: string } }>,
  reply: FastifyReply
) {
  try {
    const { title, uuid, img } = request.params;
    const path = await fetchMapPackImageFilepath(decodeURIComponent(uuid), title, img);
    if (!path) {
      return reply.status(404).send({ error: "Image not found" });
    }
    reply.send(await readFile(path));
  } catch (err) {
    console.error(err);
    reply.status(500).send({ error: "Internal Server Error" });
  }
}
