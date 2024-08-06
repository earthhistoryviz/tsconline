import path from "path";
import { AdminConfig, assertAdminConfig } from "./types.js";
import { readFile, writeFile } from "fs/promises";
import { checkFileExists } from "./util.js";
import { assertDatapackMetadataArray } from "@tsconline/shared";
import chalk from "chalk";

const adminConfigPath = path.resolve(process.cwd(), "assets", "admin-config.json");
const devConfigPath = path.resolve(process.cwd(), "assets", "dev-config.json");
async function readAdminConfig() {
  let adminConfig: AdminConfig = { datapacks: [] };
  if (await checkFileExists(adminConfigPath)) {
    adminConfig = JSON.parse(await readFile(adminConfigPath, "utf8"));
  }
  assertAdminConfig(adminConfig);
  return adminConfig;
}

async function readDevConfig() {
  if (!(await checkFileExists(devConfigPath))) {
    throw new Error("Dev config file does not exist");
  }
  const devConfig = JSON.parse(await readFile(devConfigPath, "utf8"));
  assertDatapackMetadataArray(devConfig);
  return devConfig;
}

console.log("Reading asset config...");
const adminConfig = await readAdminConfig();
console.log("Admin config read successfully");
const devConfig = await readDevConfig();
console.log("Dev config read successfully");
const unaddedDatapacks = [];
for (const datapack of devConfig) {
  if (adminConfig.datapacks.find((d) => d.file === datapack.file)) {
    console.log(chalk.red(`Skipping ${datapack.file} because it is already in the admin config`));
  } else {
    console.log(chalk.green(`Adding ${datapack.file} to the admin config`));
    unaddedDatapacks.push(datapack);
  }
}
const newAdminConfig = adminConfig.datapacks.concat(unaddedDatapacks);
await writeFile(adminConfigPath, JSON.stringify(newAdminConfig, null, 2));
