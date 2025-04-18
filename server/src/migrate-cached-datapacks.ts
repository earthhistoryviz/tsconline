import path from "path";
import {
  getCachedDatapackFilePath,
  getUsersDatapacksDirectoryFromUUIDDirectory,
  getDirectories
} from "./user/fetch-user-files.js";
import { assetconfigs, loadAssetConfigs } from "./util.js";
import { mkdir, readdir, readFile, writeFile } from "fs/promises";
import { DatapackIndex, DatapackMetadata, assertDatapackMetadata } from "@tsconline/shared";
import { loadDatapackIntoIndex } from "./load-packs.js";
import chalk from "chalk";

const allowedExtensions = [".dpk", ".mdpk", ".txt", ".map"];
try {
  await loadAssetConfigs();
  const publicDir = path.join(assetconfigs.uploadDirectory, "public");
  const privateDir = path.join(assetconfigs.uploadDirectory, "private");
  await mkdir(publicDir, { recursive: true });
  await mkdir(privateDir, { recursive: true });
  const directories = [publicDir, privateDir];
  for (const directory of directories) {
    const users = await getDirectories(directory);
    for (const user of users) {
      console.log(
        chalk.cyan(
          `\n======================================================\nLoading datapacks for ${user}\n======================================================\n`
        )
      );
      const datapacksDir = await getUsersDatapacksDirectoryFromUUIDDirectory(path.join(directory, user));
      const datapacks = await getDirectories(datapacksDir);
      for (const datapack of datapacks) {
        const datapackDir = path.join(datapacksDir, datapack);
        const files = (await readdir(datapackDir)).filter((f) => allowedExtensions.includes(path.extname(f)));
        for (const file of files) {
          const cachedFilepath = await getCachedDatapackFilePath(datapackDir);
          const cache = await readFile(cachedFilepath, "utf-8");
          const cachedDatapack = JSON.parse(cache);
          try {
            const metadata = extraMetadataFromUnknown(cachedDatapack, {
              title: datapack,
              storedFileName: file,
              isPublic: directory.includes("public"),
              ...(/workshop/.test(user) ? { uuid: user, type: "workshop" } : {}),
              ...(/treatise/.test(user) ? { uuid: "treatise", type: "treatise" } : {}),
              ...(/temp/.test(user) ? { type: "temp" } : {}),
              ...(!/workshop|official|treatise|temp/.test(user) ? { uuid: user, type: "user" } : {})
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
  migrateImageToDatapackImage(datapack);
  const metadata: DatapackMetadata = {
    title: "title" in datapack ? datapack.title : "",
    authoredBy: "authoredBy" in datapack ? datapack.authoredBy : "Unknown",
    contact: "contact" in datapack ? datapack.contact : "",
    notes: "notes" in datapack ? datapack.notes : "",
    date: "date" in datapack ? datapack.date : "",
    references: "references" in datapack ? datapack.references : [],
    tags: "tags" in datapack ? datapack.tags : [],
    isPublic: "isPublic" in datapack ? datapack.isPublic : false,
    type: "type" in datapack ? datapack.type : "official",
    description: "description" in datapack ? datapack.description : "",
    size: "size" in datapack ? datapack.size : 0,
    originalFileName: "originalFileName" in datapack ? datapack.originalFileName : "",
    storedFileName: "storedFileName" in datapack ? datapack.storedFileName : "",
    datapackImage: "datapackImage" in datapack ? datapack.datapackImage : "",
    priority: "priority" in datapack ? datapack.priority : 0,
    hasFiles: "hasFiles" in datapack ? datapack.hasFiles : false,
    ...partial
  };
  assertDatapackMetadata(metadata);
  return metadata;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function migrateImageToDatapackImage(datapack: any) {
  if ("image" in datapack) {
    datapack.datapackImage = datapack.image;
    delete datapack.image;
  }
  return datapack;
}
