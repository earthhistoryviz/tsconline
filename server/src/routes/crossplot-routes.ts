import { assertConvertCrossPlotRequest } from "@tsconline/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import { verifyFilepath } from "../util.js";
import { readFile } from "fs/promises";
import { convertCrossPlotWithModelsInJar, setupConversionDirectory } from "../crossplot-handler.js";
import { isOperationResult } from "../types.js";

export const convertCrossPlot = async function convertCrossPlot(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body;
  try {
    assertConvertCrossPlotRequest(body);
  } catch (error) {
    reply.code(400).send({ message: "Incorrect request body for converting to crossplot" });
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
      reply.code(result.code).send(result);
      return;
    }
    const { outputTextFilepath, modelsTextFilepath, settingsTextFilepath } = result;

    if (
      (await convertCrossPlotWithModelsInJar(
        body.uuid,
        body.datapackTitle,
        outputTextFilepath,
        modelsTextFilepath,
        settingsTextFilepath
      )) &&
      (await verifyFilepath(outputTextFilepath))
    ) {
      const file = await readFile(outputTextFilepath, "utf-8");
      reply.code(200).send(file);
    } else {
      throw new Error("Conversion failed");
    }
  } catch (error) {
    console.error(error);
    reply.code(500).send({ message: "Error converting to crossplot" });
  }
};
