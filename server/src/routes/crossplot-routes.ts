import { assertConvertCrossPlotRequest } from "@tsconline/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import { assetconfigs, verifyFilepath } from "../util.js";
import { mkdir, readFile, writeFile } from "fs/promises";
import md5 from "md5";
import path from "path";
import { spawn } from "child_process";
import { getDecryptedDatapackFilePath } from "../user/fetch-user-files.js";
import chalk from "chalk";

export const convertCrossplot = async function convertCrossplot(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body;
  try {
    assertConvertCrossPlotRequest(body);
  } catch (error) {
    reply.code(400).send({ message: "Incorrect request body for converting to crossplot" });
    return;
  }
  // create a new directory for this request
  let dir: string;
  let outputTextFilepath: string;
  let modelsTextFilepath: string;
  let settingsTextFilepath: string;
  try {
    const hashedDir = md5(JSON.stringify(body));
    console.log("Hashed dir: " + hashedDir);
    dir = path.join(assetconfigs.modelConversionCacheDirectory, hashedDir);
    await mkdir(dir, { recursive: true });
    outputTextFilepath = path.join(dir, "output.txt");
    if (await verifyFilepath(outputTextFilepath)) {
      const file = await readFile(outputTextFilepath, "utf-8");
      reply.code(200).send(file);
      console.log(chalk.green("Conversion already exists for this request"));
      return;
    }
  } catch (error) {
    reply.code(500).send({ message: "Error creating directory for this conversion" });
    return;
  }
  try {
    modelsTextFilepath = path.join(dir, "models.txt");
    await writeFile(modelsTextFilepath, body.models);
    settingsTextFilepath = path.join(dir, "settings.xml");
    await writeFile(settingsTextFilepath, body.settings);
  } catch (e) {
    reply.code(500).send({ message: "Error writing files for conversion" });
    return;
  }
  try {
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
