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

const successSymbol = chalk.green("✔");
const skipSymbol = chalk.yellow("⚠");
/**
 * Adds all datapacks from the dev config that are not already in the admin config
 */
try {
  console.log("Reading asset config...");
  const adminConfig = await readAdminConfig();
  console.log(chalk.green(`${successSymbol} Admin config read successfully`));
  const devConfig = await readDevConfig();
  console.log(chalk.green(`${successSymbol} Dev config read successfully`));
  const unaddedDatapacks = [];
  for (const datapack of devConfig) {
    if (adminConfig.datapacks.find((d) => d.file === datapack.file)) {
      console.log(
        chalk.yellowBright(
          `${skipSymbol} Skipping ${chalk.bold(chalk.rgb(255, 100, 100)(datapack.file))} because it is already in the admin config`
        )
      );
    } else {
      console.log(
        chalk.green(
          `${successSymbol} ${chalk.green(`Adding`)} ${chalk.bold(chalk.rgb(214, 97, 230)(datapack.file))} ${chalk.green(`to the admin config`)}`
        )
      );
      unaddedDatapacks.push(datapack);
    }
  }
  const newAdminConfig: AdminConfig = {
    datapacks: adminConfig.datapacks.concat(unaddedDatapacks)
  };
  await writeFile(adminConfigPath, JSON.stringify(newAdminConfig, null, 2));
} catch (e) {
  console.error("Error adding dev config to admin config", e);
  console.error("Exiting...");
}
