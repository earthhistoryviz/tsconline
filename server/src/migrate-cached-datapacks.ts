import path from "path";
import { getDirectories } from "./user/user-handler.js";
import { assetconfigs, loadAssetConfigs } from "./util.js";
import { readdir, readFile, writeFile } from "fs/promises";
import { CACHED_USER_DATAPACK_FILENAME } from "./constants.js";
import { DatapackIndex, DatapackMetadata, assertDatapackMetadata } from "@tsconline/shared";
import { loadDatapackIntoIndex } from "./load-packs.js";
import chalk from "chalk";

const allowedExtensions = [".dpk", ".mdpk", ".txt", ".map"];
try {
  await loadAssetConfigs();
  const directories = [
    path.join(assetconfigs.uploadDirectory, "public"),
    path.join(assetconfigs.uploadDirectory, "private")
  ];
  for (const directory of directories) {
    const users = await getDirectories(directory);
    for (const user of users) {
      console.log(
        chalk.cyan(
          `\n======================================================\nLoading datapacks for ${user}\n======================================================\n`
        )
      );
      const datapacks = await getDirectories(path.join(directory, user));
      for (const datapack of datapacks) {
        const datapackDir = path.join(directory, user, datapack);
        const files = (await readdir(datapackDir)).filter((f) => allowedExtensions.includes(path.extname(f)));
        for (const file of files) {
          const cachedFilepath = path.join(datapackDir, CACHED_USER_DATAPACK_FILENAME);
          const cache = await readFile(cachedFilepath, "utf-8");
          const cachedDatapack = JSON.parse(cache);
          try {
            const metadata = extraMetadataFromUnknown(cachedDatapack, {
              title: datapack,
              storedFileName: file,
              isPublic: directory.includes("public"),
              ...(!/workshop|server/.test(user) ? { uuid: user, type: "user" } : {})
            });
            const datapackIndex: DatapackIndex = {};
            const successful = await loadDatapackIntoIndex(
              datapackIndex,
              path.join(datapackDir, "decrypted"),
              metadata
            );
            if (!successful || !datapackIndex[metadata.title]) {
              console.error(`Failed to load datapack ${metadata.title}`);
              continue;
            }
            await writeFile(cachedFilepath, JSON.stringify(datapackIndex[metadata.title]!, null, 2));
          } catch (e) {
            console.log(chalk.red(`Failed to load datapack ${datapack}`));
            console.error(e);
          }
        }
      }
    }
  }
} catch (e) {
  console.error(e);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extraMetadataFromUnknown(datapack: any, partial: Partial<DatapackMetadata> = {}): DatapackMetadata {
  const metadata: DatapackMetadata = {
    title: "title" in datapack ? datapack.title : "",
    authoredBy: "authoredBy" in datapack ? datapack.authoredBy : "",
    contact: "contact" in datapack ? datapack.contact : "",
    notes: "notes" in datapack ? datapack.notes : "",
    date: "date" in datapack ? datapack.date : "",
    references: "references" in datapack ? datapack.references : [],
    tags: "tags" in datapack ? datapack.tags : [],
    isPublic: "isPublic" in datapack ? datapack.isPublic : false,
    type: "type" in datapack ? datapack.type : "server",
    description: "description" in datapack ? datapack.description : "",
    size: "size" in datapack ? datapack.size : 0,
    originalFileName: "originalFileName" in datapack ? datapack.originalFileName : "",
    storedFileName: "storedFileName" in datapack ? datapack.storedFileName : "",
    ...partial
  };
  assertDatapackMetadata(metadata);
  return metadata;
}
