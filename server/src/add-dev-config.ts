import path from "path";
import { AdminConfigType, assertAdminConfig } from "./types.js";
import { readFile, rm, writeFile } from "fs/promises";
import { assetconfigs, checkFileExists, loadAssetConfigs } from "./util.js";
import { assertDatapackMetadataArray } from "@tsconline/shared";
import chalk from "chalk";
import { setupNewDatapackDirectoryInUUIDDirectory } from "./upload-handlers.js";
import { deleteServerDatapack, doesDatapackFolderExistInAllUUIDDirectories } from "./user/user-handler.js";

export const adminConfigPath = path.resolve(process.cwd(), "assets", "admin-config.json");
const devConfigPath = path.resolve(process.cwd(), "assets", "dev-config.json");
export async function readAdminConfig() {
  let adminConfig: AdminConfigType = { datapacks: [] };
  if (await checkFileExists(adminConfigPath)) {
    adminConfig = JSON.parse(await readFile(adminConfigPath, "utf8"));
  }
  assertAdminConfig(adminConfig);
  return adminConfig;
}

export async function readDevConfig() {
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
  const args = process.argv;
  if (args.includes("--overwrite")) {
    await rm(adminConfigPath, { force: true });
  }
  console.log("Reading asset config...");
  const adminConfig = await readAdminConfig();
  console.log(chalk.green(`${successSymbol} Admin config read successfully`));
  const devConfig = await readDevConfig();
  console.log(chalk.green(`${successSymbol} Dev config read successfully`));
  const unaddedDatapacks = [];
  for (const datapack of devConfig) {
    if (adminConfig.datapacks.find((d) => d.title === datapack.title || d.storedFileName === datapack.storedFileName)) {
      console.log(
        chalk.yellowBright(
          `${skipSymbol} Skipping ${chalk.bold(chalk.rgb(255, 100, 100)(datapack.originalFileName))} because it is already in the admin config`
        )
      );
    } else {
      console.log(
        chalk.green(
          `${successSymbol} ${chalk.green(`Adding`)} ${chalk.bold(chalk.rgb(214, 97, 230)(datapack.originalFileName))} ${chalk.green(`to the admin config`)}`
        )
      );
      unaddedDatapacks.push(datapack);
    }
  }
  const newAdminConfig: AdminConfigType = {
    datapacks: adminConfig.datapacks.concat(unaddedDatapacks)
  };
  await writeFile(adminConfigPath, JSON.stringify(newAdminConfig, null, 2));
  await loadAssetConfigs();
  for (const datapack of newAdminConfig.datapacks) {
    console.log("\n======================================================================\n");
    try {
      if (!(await checkFileExists(path.join(assetconfigs.datapacksDirectory, datapack.storedFileName)))) {
        console.log(chalk.red(`Datapack ${datapack.title} does not exist in the datapacks directory`));
        continue;
      }
      // Check if the datapack already exists in all UUID directories, only overwrite if the --overwrite flag is present
      if (await doesDatapackFolderExistInAllUUIDDirectories("server", datapack.title)) {
        if (args.includes("--overwrite")) {
          await deleteServerDatapack(datapack.title);
        } else {
          console.log(chalk.yellow("Datapack already exists in all UUID directories, skipping..."));
          continue;
        }
      }
      await setupNewDatapackDirectoryInUUIDDirectory(
        "server",
        path.join(assetconfigs.datapacksDirectory, datapack.storedFileName),
        datapack,
        true
      );
      console.log(
        chalk.blueBright(
          `Added ${datapack.title} to the server's ${datapack.isPublic ? "public" : "private "} directory`
        )
      );
    } catch (e) {
      console.error(e);
      console.log(
        chalk.red(
          `Error adding ${datapack.title} to the server's ${datapack.isPublic ? "public" : "private "} directory`
        )
      );
    }
  }
} catch (e) {
  console.error("Error adding dev config to admin config", e);
  console.error("Exiting...");
}
