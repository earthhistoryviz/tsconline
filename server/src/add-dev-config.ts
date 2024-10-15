import path from "path";
import { readFile } from "fs/promises";
import { assetconfigs, checkFileExists, loadAssetConfigs } from "./util.js";
import { assertDatapackMetadataArray } from "@tsconline/shared";
import chalk from "chalk";
import { setupNewDatapackDirectoryInUUIDDirectory } from "./upload-handlers.js";
import { deleteServerDatapack, doesDatapackFolderExistInAllUUIDDirectories } from "./user/user-handler.js";

const devConfigPath = path.resolve(process.cwd(), "assets", "dev-config.json");

export async function readDevConfig() {
  if (!(await checkFileExists(devConfigPath))) {
    throw new Error("Dev config file does not exist");
  }
  const devConfig = JSON.parse(await readFile(devConfigPath, "utf8"));
  assertDatapackMetadataArray(devConfig);
  return devConfig;
}

const successSymbol = chalk.green("✔");
/**
 * Adds all datapacks from the dev config that are not already in the admin config
 */
try {
  const args = process.argv;
  console.log("Reading dev config...");
  const devConfig = await readDevConfig();
  console.log(chalk.green(`${successSymbol} Dev config read successfully`));
  await loadAssetConfigs();
  for (const datapack of devConfig) {
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
