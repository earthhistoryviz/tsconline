import {
  AutoPlotResponse,
  isAutoPlotMarkerArray,
  assertAutoPlotRequest,
  assertConvertCrossPlotRequest,
  DatapackMetadata
} from "@tsconline/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import { verifyFilepath } from "../util.js";
import { readFile } from "fs/promises";
import {
  autoPlotPointsWithJar,
  convertCrossPlotWithModelsInJar,
  setupAutoPlotDirectory,
  setupConversionDirectory
} from "./crossplot-handler.js";
import { getMarkersFromTextFile } from "./extract-markers.js";
import { isOperationResult } from "../types.js";
import logger from "../error-logger.js";
import { uploadTemporaryDatapack } from "../upload-datapack.js";
import { basename } from "path";

export const convertCrossPlot = async function convertCrossPlot(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body;
  try {
    assertConvertCrossPlotRequest(body);
  } catch (error) {
    reply.code(400).send({ error: "Incorrect request body for converting to crossplot" });
    return;
  }
  try {
    const result = await setupConversionDirectory(body);
    // If the result is a string, it means the conversion already exists
    if (typeof result === "string") {
      reply.code(200).send(result);
      return;
    }
    if (isOperationResult(result)) {
      reply.code(result.code).send({ error: result.message });
      return;
    }
    const { outputTextFilepath, modelsTextFilepath, settingsTextFilepath, hash } = result;
    const convertedCrossPlot = await convertCrossPlotWithModelsInJar(
      body.datapackUniqueIdentifiers,
      outputTextFilepath,
      modelsTextFilepath,
      settingsTextFilepath
    );
    if (!convertedCrossPlot || !(await verifyFilepath(outputTextFilepath))) {
      throw new Error("Conversion failed");
    }
    if (body.action === "file") {
      const file = await readFile(outputTextFilepath, "utf-8");
      reply.code(200).send(file);
      return;
    }
    const tempDatapackMetadata: DatapackMetadata = {
      title: hash,
      description: "temporary crossplot",
      originalFileName: basename(outputTextFilepath),
      storedFileName: basename(outputTextFilepath),
      date: new Date().toISOString(),
      size: "0",
      authoredBy: "auto-generated",
      references: [],
      tags: [],
      notes: "",
      type: "temp",
      isPublic: true,
      priority: 1,
      hasFiles: false
    };
    try {
      const dp = await uploadTemporaryDatapack(tempDatapackMetadata, outputTextFilepath);
      if (isOperationResult(dp)) {
        reply.code(dp.code).send({ error: dp.message });
        return;
      }
      reply.code(200).send(dp);
    } catch (e) {
      logger.error(e);
      reply.code(500).send({ error: "Error uploading temporary datapack" });
      return;
    }
  } catch (error) {
    console.error(error);
    reply.code(500).send({ error: "Error converting to crossplot" });
  }
};

export const autoPlotPoints = async function autoPlotPoints(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body;
  try {
    assertAutoPlotRequest(body);
  } catch (error) {
    reply.code(400).send({ error: "Incorrect request body for auto plotting points" });
    return;
  }
  try {
    const result = await setupAutoPlotDirectory(body);
    if (isAutoPlotMarkerArray(result)) {
      const response: AutoPlotResponse = { markers: result };
      reply.code(200).send(response);
      return;
    }
    if (isOperationResult(result)) {
      reply.code(result.code).send({ error: result.message });
      return;
    }
    const { outputTextFilepath, settingsTextFilepath } = result;
    if (
      (await autoPlotPointsWithJar(body.datapackUniqueIdentifiers, outputTextFilepath, settingsTextFilepath)) &&
      (await verifyFilepath(outputTextFilepath))
    ) {
      const result = await getMarkersFromTextFile(outputTextFilepath);
      const response: AutoPlotResponse = { markers: result };
      reply.code(200).send(response);
    } else {
      throw new Error("Error auto plotting");
    }
  } catch (e) {
    logger.error(e);
    reply.code(500).send({ error: "Error auto plotting" });
  }
};
