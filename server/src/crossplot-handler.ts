import { ConvertCrossPlotRequest } from "@tsconline/shared";
import chalk from "chalk";
import { mkdir, readFile, writeFile } from "fs/promises";
import md5 from "md5";
import path from "path";
import { assetconfigs, verifyFilepath } from "./util.js";
import { OperationResult } from "./types.js";
export const setupConversionDirectory = async function(request: ConvertCrossPlotRequest): Promise<OperationResult | string | {
    outputTextFilepath: string;
    modelsTextFilepath: string;
    settingsTextFilepath: string;
}>  {
  // create a new directory for this request
  let dir: string;
  let outputTextFilepath: string;
  let modelsTextFilepath: string;
  let settingsTextFilepath: string;
  try {
    const hashedDir = md5(JSON.stringify(request));
    console.log("Hashed dir: " + hashedDir);
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
}