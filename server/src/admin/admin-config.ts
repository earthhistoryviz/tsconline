import { readFile, writeFile } from "fs/promises";
import { AdminConfigType, assertAdminConfig } from "../types.js";
import { Mutex } from "async-mutex";
import { DatapackMetadata } from "@tsconline/shared";

const ADMIN_DEFAULT_CONFIG: AdminConfigType = {
  datapacks: []
};
let adminConfig: AdminConfigType;
let filepath: string;
const mutex = new Mutex();

/**
 * Load the admin config file
 * @param filepath the file path to the admin config file if not provided it will use the default file path
 */
export async function loadAdminConfig(newFilepath?: string) {
  const release = await mutex.acquire();
  const tempPath = newFilepath || filepath;
  try {
    if (!tempPath) throw new Error("No file path provided/loaded initially");
    const raw = await readFile(tempPath, "utf8");
    const adminconfig = JSON.parse(raw);
    assertAdminConfig(adminconfig);
    setAdminConfig(adminconfig);
  } catch (e) {
    if (e instanceof Error && (e as NodeJS.ErrnoException).code === "ENOENT") {
      console.error("Admin config file not found. Loading default admin config.");
      setAdminConfig(ADMIN_DEFAULT_CONFIG);
    } else {
      handleError(e);
      throw e;
    }
  } finally {
    filepath = tempPath;
    release();
  }
}
/**
 * Save the admin config to the file
 */
export async function saveAdminConfig() {
  const release = await mutex.acquire();
  try {
    await writeFile(filepath, JSON.stringify(adminConfig, null, 2));
  } catch (e) {
    handleError(e);
  } finally {
    release();
  }
}
/**
 * set the admin config NOTE: this does not save the file
 * @param adminConfig the admin config
 */
function setAdminConfig(newAdminConfig: AdminConfigType) {
  adminConfig = newAdminConfig;
}
/**
 * remove a datapack from the admin config
 * @param datapack the datapack to remove
 */
export async function removeAdminConfigDatapack(datapack: DatapackMetadata | { title: string }) {
  if (!adminConfig.datapacks) {
    throw new Error("adminConfig has not been loaded/set");
  }
  if (adminConfig.datapacks.find((d) => d.title === datapack.title)) {
    adminConfig.datapacks = adminConfig.datapacks.filter((d) => d.title !== datapack.title);
    await saveAdminConfig();
  } else {
    handleError(`Datapack ${datapack.title} not found in admin config`);
  }
}
/**
 * add a datapack to the admin config
 * @param datapack the datapack to add
 */
export async function addAdminConfigDatapack(datapack: DatapackMetadata) {
  if (!adminConfig.datapacks) {
    throw new Error("adminConfig has not been loaded/set");
  }
  if (!adminConfig.datapacks.find((d) => d.title === datapack.title)) {
    adminConfig.datapacks.push(datapack);
    await saveAdminConfig();
  } else {
    handleError(`Datapack ${datapack.title} already in admin config`);
  }
}
export function getAdminConfigDatapacks() {
  if (!adminConfig.datapacks) {
    throw new Error("adminConfig has not been loaded/set");
  }
  return adminConfig.datapacks;
}
/**
 * reset the admin config to the default config
 */
export async function resetAdminConfig() {
  adminConfig = ADMIN_DEFAULT_CONFIG;
  await saveAdminConfig();
}
/**
 * error handler
 * @param e the error to handle
 */
function handleError(e: unknown) {
  if (e instanceof Error) {
    console.error(e.message);
  } else {
    console.error(e);
  }
}
