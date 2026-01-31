import path from "path";
import { readFile, copyFile } from "fs/promises";
import { assetconfigs, checkFileExists, loadAssetConfigs } from "./util.js";
import { assertDatapackMetadataArray } from "@tsconline/shared";
import chalk from "chalk";
import { setupNewDatapackDirectoryInUUIDDirectory } from "./upload-handlers.js";
import { deleteOfficialDatapack, doesDatapackFolderExistInAllUUIDDirectories } from "./user/user-handler.js";
import type { DatapackMetadata } from "@tsconline/shared";

export const configPaths = {
  dev: path.resolve(process.cwd(), "assets", "dev-config.json")
};

const successSymbol = chalk.green("✔");

export async function readConfig(configPath: string): Promise<DatapackMetadata[]> {
  if (!(await checkFileExists(configPath))) {
    throw new Error(`Config file does not exist: ${configPath}`);
  }
  const config = JSON.parse(await readFile(configPath, "utf8"));
  assertDatapackMetadataArray(config);
  return config as DatapackMetadata[];
}

export async function readLondonConfig() {
  const londonConfigPath = path.resolve(process.cwd(), "db", "london", "output", "london-config.json");
  if (!(await checkFileExists(londonConfigPath))) {
    throw new Error("London config file does not exist");
  }
  const londonConfig = JSON.parse(await readFile(londonConfigPath, "utf8"));
  assertDatapackMetadataArray(londonConfig);
  return londonConfig as DatapackMetadata[];
}

async function processConfig({
  configType,
  alwaysOverwrite = false,
  copyFirstLondonPack = false
}: {
  configType: "dev" | "london";
  alwaysOverwrite?: boolean;
  copyFirstLondonPack?: boolean;
}) {
  try {
    const args = process.argv;
    console.log(`Reading ${configType} config...`);

    let config: DatapackMetadata[];
    if (configType === "london") {
      config = await readLondonConfig();
      console.log(chalk.green(`${successSymbol} london config read successfully`));

      if (copyFirstLondonPack && config[0]) {
        const src = path.resolve(process.cwd(), "db", "london", "output", config[0].storedFileName);
        const dest = path.join(assetconfigs.datapacksDirectory, config[0].originalFileName);
        await copyFile(src, dest);
        console.log(chalk.green(`Copied ${config[0].title} to assets/datapacks`));
      }
    } else {
      config = await readConfig(configPaths.dev);
      console.log(chalk.green(`${successSymbol} dev config read successfully`));
    }

    await loadAssetConfigs();

    for (const datapack of config) {
      console.log("\n======================================================================\n");
      try {
        const storedPath = path.join(assetconfigs.datapacksDirectory, datapack.storedFileName);
        if (!(await checkFileExists(storedPath))) {
          console.log(chalk.red(`Datapack ${datapack.title} does not exist in the datapacks directory`));
          continue;
        }

        const exists = await doesDatapackFolderExistInAllUUIDDirectories("official", datapack.title);
        if (exists) {
          if (alwaysOverwrite || args.includes("--overwrite")) {
            await deleteOfficialDatapack(datapack.title);
          } else {
            console.log(chalk.yellow("Datapack already exists in all UUID directories, skipping..."));
            continue;
          }
        }

        await setupNewDatapackDirectoryInUUIDDirectory("official", storedPath, datapack, true);

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
    console.error(`Error adding ${configType} config to admin config`, e);
    console.error("Exiting...");
  }
}

export async function addDevConfigToAdminConfig() {
  await processConfig({ configType: "dev" });
}

export async function addLondonConfigToAdminConfig() {
  await processConfig({ configType: "london", alwaysOverwrite: true, copyFirstLondonPack: true });
}

// Run the script if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  await addDevConfigToAdminConfig();
  if (process.argv.includes("--london")) {
    await addLondonConfigToAdminConfig();
  }
}
