import {
  AutoPlotRequest,
  ConvertCrossPlotRequest,
  DatapackUniqueIdentifier,
  getUUIDOfDatapackType
} from "@tsconline/shared";
import chalk from "chalk";
import { mkdir, readFile, writeFile } from "fs/promises";
import md5 from "md5";
import path from "path";
import { assetconfigs, getActiveJar, verifyFilepath } from "./util.js";
import { OperationResult } from "./types.js";
import { getDecryptedDatapackFilePath } from "./user/fetch-user-files.js";
import { spawn } from "child_process";
export const convertCrossPlotWithModelsInJar = async function convertCrossPlotWithModelsInJar(
  datapackUniqueIdentifiers: DatapackUniqueIdentifier[],
  outputTextFilepath: string,
  modelsTextFilepath: string,
  settingsTextFilepath: string
) {
  const datapackFilepaths = await Promise.all(
    datapackUniqueIdentifiers.map((identifier) =>
      getDecryptedDatapackFilePath(getUUIDOfDatapackType(identifier), identifier.title)
    )
  );
  console.log("Datapack filepaths: " + datapackFilepaths);
  const execJavaCommand = async (timeout: number) => {
    const args = [
      "-jar",
      getActiveJar(),
      "-node",
      "-s",
      settingsTextFilepath,
      "-o",
      outputTextFilepath,
      "-convert",
      "-d",
      ...datapackFilepaths,
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
  if (!(await verifyFilepath(outputTextFilepath))) {
    return false;
  }
  return true;
};
export const setupConversionDirectory = async function (request: ConvertCrossPlotRequest): Promise<
  | OperationResult
  | string
  | {
      outputTextFilepath: string;
      modelsTextFilepath: string;
      settingsTextFilepath: string;
    }
> {
  // create a new directory for this request
  let dir: string;
  let outputTextFilepath: string;
  let modelsTextFilepath: string;
  let settingsTextFilepath: string;
  try {
    const hashedDir = md5(JSON.stringify(request));
    dir = path.join(assetconfigs.modelConversionCacheDirectory, hashedDir);
    await mkdir(dir, { recursive: true });
    outputTextFilepath = path.join(dir, "output.txt");
    if (await verifyFilepath(outputTextFilepath)) {
      const file = await readFile(outputTextFilepath, "utf-8");
      console.log(chalk.green("Conversion already exists for this request"));
      return file;
    }
  } catch (error) {
    return { message: "Error creating directory for this conversion", code: 500 };
  }
  try {
    modelsTextFilepath = path.join(dir, "models.txt");
    await writeFile(modelsTextFilepath, request.models);
    settingsTextFilepath = path.join(dir, "settings.xml");
    await writeFile(settingsTextFilepath, request.settings);
  } catch (e) {
    return { message: "Error writing files for conversion", code: 500 };
  }
  return { outputTextFilepath, modelsTextFilepath, settingsTextFilepath };
};
export const setupAutoPlotDirectory = async function (request: AutoPlotRequest): Promise<
  | OperationResult
  | string
  | {
      outputTextFilepath: string;
      settingsTextFilepath: string;
    }
> {
  // create a new directory for this request
  let dir: string;
  let outputTextFilepath: string;
  let settingsTextFilepath: string;
  try {
    const hashedDir = md5(JSON.stringify(request));
    dir = path.join(assetconfigs.modelConversionCacheDirectory, hashedDir);
    await mkdir(dir, { recursive: true });
    outputTextFilepath = path.join(dir, "output.txt");
    if (await verifyFilepath(outputTextFilepath)) {
      const file = await readFile(outputTextFilepath, "utf-8");
      console.log(chalk.green("Auto Plot already exists for this request"));
      return file;
    }
  } catch (error) {
    return { message: "Error creating directory for this conversion", code: 500 };
  }
  try {
    settingsTextFilepath = path.join(dir, "settings.xml");
    await writeFile(settingsTextFilepath, request.settings);
  } catch (e) {
    return { message: "Error writing files for conversion", code: 500 };
  }
  return { outputTextFilepath, settingsTextFilepath };
};

export const autoPlotPointsWithJar = async function autoPlotPointsWithJar(
  ageDatapack: DatapackUniqueIdentifier,
  depthDatapack: DatapackUniqueIdentifier,
  outputTextFilepath: string,
  settingsTextFilepath: string
) {
  const ageDatapackFilepath = await getDecryptedDatapackFilePath(getUUIDOfDatapackType(ageDatapack), ageDatapack.title);
  const depthDatapackFilepath = await getDecryptedDatapackFilePath(
    getUUIDOfDatapackType(depthDatapack),
    depthDatapack.title
  );
  const execJavaCommand = async (timeout: number) => {
    const args = [
      "-jar",
      getActiveJar(),
      "-node",
      "-s",
      settingsTextFilepath,
      "-o",
      outputTextFilepath,
      "-autoplot",
      "-d",
      ageDatapackFilepath,
      depthDatapackFilepath
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
  if (!(await verifyFilepath(outputTextFilepath))) {
    return false;
  }
  return true;
};
