import {
  AutoPlotMarker,
  AutoPlotRequest,
  ConvertCrossPlotRequest,
  DatapackUniqueIdentifier,
  getUUIDOfDatapackType
} from "@tsconline/shared";
import chalk from "chalk";
import { mkdir, readFile, rm, writeFile } from "fs/promises";
import md5 from "md5";
import path from "path";
import { assetconfigs, getActiveJar, verifyFilepath } from "../util.js";
import { OperationResult } from "../types.js";
import { getDecryptedDatapackFilePath } from "../user/fetch-user-files.js";
import { spawn } from "child_process";
import { getMarkersFromTextFile } from "./extract-markers.js";
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
  await execJavaCommand(20000, args);
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
      hash: string;
    }
> {
  // create a new directory for this request
  let dir: string;
  let outputTextFilepath: string;
  let modelsTextFilepath: string;
  let settingsTextFilepath: string;
  let hashedDir: string;
  try {
    hashedDir = md5(request.models + request.settings + JSON.stringify(request.datapackUniqueIdentifiers));
    dir = path.join(assetconfigs.modelConversionCacheDirectory, hashedDir);
    await mkdir(dir, { recursive: true });
    outputTextFilepath = path.join(dir, "output.txt");
    if (await verifyFilepath(outputTextFilepath)) {
      if (request.action === "file") {
        const file = await readFile(outputTextFilepath, "utf-8");
        console.log(chalk.green("Conversion already exists for this request"));
        return file;
      } else {
        return {
          outputTextFilepath,
          modelsTextFilepath: path.join(dir, "models.txt"),
          settingsTextFilepath: path.join(dir, "settings.xml"),
          hash: hashedDir
        };
      }
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
  return { outputTextFilepath, modelsTextFilepath, settingsTextFilepath, hash: hashedDir };
};
export const setupAutoPlotDirectory = async function (request: AutoPlotRequest): Promise<
  | OperationResult
  | AutoPlotMarker[]
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
    const hashedDir = md5(request.settings + JSON.stringify(request.datapackUniqueIdentifiers));
    dir = path.join(assetconfigs.autoPlotCacheDirectory, hashedDir);
    await mkdir(dir, { recursive: true });
    outputTextFilepath = path.join(dir, "output.txt");
    if (await verifyFilepath(outputTextFilepath)) {
      try {
        const markers = await getMarkersFromTextFile(outputTextFilepath);
        return markers;
      } catch (e) {
        await rm(dir, { recursive: true });
        return { message: "Error reading file for this conversion", code: 500 };
      }
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
  datapackUniqueIdentifiers: DatapackUniqueIdentifier[],
  outputTextFilepath: string,
  settingsTextFilepath: string
) {
  const datapacks = await Promise.all(
    datapackUniqueIdentifiers.map((identifier) =>
      getDecryptedDatapackFilePath(getUUIDOfDatapackType(identifier), identifier.title)
    )
  );
  if (datapacks.length < 2) {
    return false;
  }
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
    ...datapacks
  ];
  await execJavaCommand(20000, args);
  if (!(await verifyFilepath(outputTextFilepath))) {
    return false;
  }
  return true;
};
const execJavaCommand = async (timeout: number, args: string[]) => {
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
