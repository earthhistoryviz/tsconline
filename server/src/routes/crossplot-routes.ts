import { assertConvertCrossPlotRequest } from "@tsconline/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import { assetconfigs, verifyFilepath } from "../util.js";
import { mkdir, readFile, writeFile } from "fs/promises";
import md5 from "md5";
import path from "path";
import { spawn } from "child_process";
import { getDecryptedDatapackFilePath } from "../user/fetch-user-files.js";
import chalk from "chalk";
import { setupConversionDirectory } from "../crossplot-handler.js";
import { isOperationResult } from "../types.js";

export const convertCrossplot = async function convertCrossplot(request: FastifyRequest, reply: FastifyReply) {
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
    const datapackFilepath = await getDecryptedDatapackFilePath(body.uuid, body.datapackTitle);
    const execJavaCommand = async (timeout: number) => {
      const args = [
        "-jar",
        assetconfigs.activeJar,
        "-node",
        "-s",
        settingsTextFilepath,
        "-o",
        outputTextFilepath,
        "-convert",
        "-d",
        datapackFilepath,
        "-models",
        modelsTextFilepath
      ];
      return new Promise<void>((resolve, reject) => {
        const cmd = "java";
        const javaProcess = spawn(cmd, args, { timeout, killSignal: "SIGKILL" });
        let stdout = "";
        let stderr = "";
        let error = "";
        javaProcess.stdout.on("data", (data) => {
          stdout += data;
        });

        javaProcess.stderr.on("data", (data) => {
          stderr += data;
        });

        javaProcess.on("error", (err) => {
          error = err.message;
        });

        javaProcess.on("close", (code, signal) => {
          if (signal == "SIGKILL") {
            reject(new Error("Java process timed out"));
            return;
          }
          console.log("Java finished, sending reply to browser");
          console.log("Java error param: " + error);
          console.log("Java stdout: " + stdout);
          console.log("Java stderr: " + stderr);
          resolve();
        });
      });
    };
    await execJavaCommand(20000);
    if (await verifyFilepath(outputTextFilepath)) {
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
