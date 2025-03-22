import {
  AutoPlotMarker,
  AutoPlotRequest,
  ConvertCrossPlotRequest,
  DatapackUniqueIdentifier,
  getMarkerTypeFromNum,
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
import { createReadStream } from "fs";
import { createInterface } from "readline";
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
    const hashedDir = md5(JSON.stringify(request));
    dir = path.join(assetconfigs.autoPlotCacheDirectory, hashedDir);
    await mkdir(dir, { recursive: true });
    outputTextFilepath = path.join(dir, "output.txt");
    if (await verifyFilepath(outputTextFilepath)) {
      try {
        const markers = await getMarkersFromTextFile(outputTextFilepath);
        return markers;
      } catch (e) {
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
      ...datapacks
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

export const getMarkersFromTextFile = async function getMarkersFromTextFile(
  filepath: string
): Promise<AutoPlotMarker[]> {
  if (!(await verifyFilepath(filepath))) {
    throw new Error("File does not exist");
  }
  const fileStream = createReadStream(filepath);
  fileStream.setEncoding("utf-8");
  fileStream.on("error", (err) => {
    throw new Error("Error reading file: " + err);
  });
  const rl = createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });
  let firstLine = true;
  const markers: AutoPlotMarker[] = [];
  for await (const line of rl) {
    if (firstLine) {
      firstLine = false;
      continue;
    }
    const split = line.split("\t");
    if (split.length < 7 || split.some((item) => item === "")) {
      throw new Error("Invalid file format");
    }
    const x = parseFloat(split[0]!);
    const y = parseFloat(split[1]!);
    const age = parseFloat(split[2]!);
    const depth = parseFloat(split[3]!);
    const comment = split[4]!;
    // this tells us what type of column the marker is in, but not really needed atm
    // const colType = parseInt(split[5]!);
    const type = parseInt(split[6]!);

    markers.push({
      x,
      y,
      age,
      depth,
      comment,
      selected: false,
      type: getMarkerTypeFromNum(type),
      color: "#FF0000",
      id: `${CSS.escape(`${x}-${y}-${age}-${depth}-${comment}-${type}`)}`
    });
  }
  return markers;
};
