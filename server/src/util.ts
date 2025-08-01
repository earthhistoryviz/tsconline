import fs, { createReadStream } from "fs";
import path from "path";
import { readFile, access, mkdir, readdir, copyFile, realpath, lstat } from "fs/promises";
import { glob } from "glob";
import { createInterface } from "readline/promises";
import { constants } from "fs";
import levenshtein from "js-levenshtein";
import { assertAssetConfig, AssetConfig } from "./types.js";
import { createHash, randomUUID } from "crypto";
import { Datapack, DatapackMetadata, assertDatapackMetadata } from "@tsconline/shared";
import "dotenv/config";

/**
 * Uploads a file to GitHub and returns a link to the uploaded file.
 * @param owner
 * @param repo
 * @param path
 * @param filename
 * @param buffer
 */
export async function uploadFileToGitHub(
  owner: string,
  repo: string,
  path: string,
  filename: string,
  buffer: Buffer
): Promise<string> {
  const uploadUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}/${filename}`;
  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${process.env.GH_UPLOAD_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: `Upload ${filename}`,
      content: buffer.toString("base64")
    })
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(`File upload failed: ${errorText}`);
  }

  const encodedFilename = encodeURIComponent(filename);
  const rawUrl = `https://github.com/${owner}/${repo}/raw/main/${path}/${encodedFilename}`;
  return rawUrl;
}

/**
 * Checks if the file type and mime type are allowed
 * @param filename
 * @param mimeType
 * @param allowedFileTypes Not including the dot, e.g. ["txt", "jpg"]
 * @param allowedMimeTypes e.g. ["text/plain", "image/jpeg"]
 */
export function isFileTypeAllowed(
  filename: string,
  mimeType: string,
  allowedFileTypes: string[],
  allowedMimeTypes: string[]
): boolean {
  const ext = path.extname(filename).toLowerCase().replace(/^\./, "");
  if (!allowedFileTypes.includes(ext)) return false;
  if (!allowedMimeTypes.includes(mimeType)) return false;
  return true;
}

/**
 * Verify that a path is a symlink and that it points to a valid target
 * @param symlink
 */
export async function verifySymlink(symlink: string): Promise<boolean> {
  try {
    const ROOT_DIRECTORY = path.resolve(process.cwd());
    const absPath = path.resolve(ROOT_DIRECTORY, symlink);
    if (!absPath.startsWith(ROOT_DIRECTORY)) return false;
    const resolvedPath = await realpath(absPath);
    if (!resolvedPath.startsWith(ROOT_DIRECTORY)) return false;
    const stats = await lstat(absPath);
    if (!stats.isSymbolicLink()) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Recursively deletes directory INCLUDING directoryPath
 *
 * @param directoryPath
 * @returns
 */
export function deleteDirectory(directoryPath: string): string {
  // Check if the directory exists
  if (fs.existsSync(directoryPath)) {
    fs.readdirSync(directoryPath).forEach((file) => {
      const currentPath = path.join(directoryPath, file);

      // Check if the current path is a directory
      if (fs.lstatSync(currentPath).isDirectory()) {
        deleteDirectory(currentPath);
      } else {
        // Delete the file
        fs.unlinkSync(currentPath);
        console.log(`Deleted file: ${currentPath}`);
      }
    });
    // Delete the now-empty directory
    fs.rmdirSync(directoryPath);
    return `Directory ${directoryPath} successfully deleted`;
  } else {
    return `Directory not found: ${directoryPath}`;
  }
}

/**
 * copy a directory from src to destination recursively
 * @param src
 * @param destination
 */
export async function copyDirectory(src: string, destination: string): Promise<void> {
  try {
    await mkdir(destination, { recursive: true });

    const entries = await readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(destination, entry.name);

      if (entry.isDirectory()) {
        await copyDirectory(srcPath, destPath);
      } else {
        await copyFile(srcPath, destPath);
      }
    }
  } catch (error) {
    console.error("An error occurred:", error);
    throw error;
  }
}
/**
 * Globs files of the form \<topDirectory\>/<filename\>/\<botDirectory\>
 * @param files
 * @param topDirectory
 * @param botDirectory
 * @returns
 */
export async function grabFilepaths(files: string[], topDirectory: string, botDirectory: string): Promise<string[]> {
  // TODO: FIX HACK
  topDirectory = topDirectory.replaceAll("\\", "/");

  // regular expression for all filenames located in <topDirectory>/<file_name>/<botDirectory>
  const pattern = new RegExp(
    files
      .map((name) => {
        const lastIndex = name.lastIndexOf(".");
        const filename = lastIndex !== -1 ? name.substring(0, lastIndex) : name;
        const escapedFilename = filename.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
        return [topDirectory, escapedFilename, botDirectory, ".*"].join("/");
      })
      .join("|")
  );
  let paths = await glob(`${topDirectory}/**/*`);
  // this needs to be included to work on certain window machines
  paths = paths.map((path) => path.replace(/\\/g, "/"));
  paths = paths.filter((path) => pattern.test(path));
  return paths;
}

/**
 * trim the first and last character (most likely quotes) (will not check if it is though)
 * @param input
 * @returns
 */
export function trimQuotes(input: string): string {
  if (input.startsWith('"') && input.endsWith('"')) {
    return input.slice(1, -1);
  }
  return input;
}
/**
 * number to base 16
 * @param c
 * @returns
 */
export function componentToHex(c: number) {
  if (c < 0 || c > 255) throw new Error("Invalid hex value");
  const hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}

/**
 * Converts rgb of three numbers to hex code
 * @param r
 * @param g
 * @param b
 * @returns
 */
export function rgbToHex(r: number, g: number, b: number) {
  if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) throw new Error("Invalid rgb value");
  return "#" + componentToHex(Math.round(r)) + componentToHex(Math.round(g)) + componentToHex(Math.round(b));
}

/**
 * Checks if the string given has visible characters
 * @param input
 * @returns
 */
export function hasVisibleCharacters(input: string): boolean {
  return !/^\s*$/.test(input);
}

/**
 * capitalize the first letter of a string
 * @param input
 * @returns
 */
export function capitalizeFirstLetter(input: string): string {
  if (!input) return input;
  return input.charAt(0).toUpperCase() + input.slice(1).toLowerCase();
}

/**
 * This is different from Object.assign because it only sets the properties that are common between the two objects
 * @param o1
 * @param o2
 * @returns
 */
export function setCommonProperties<T>(o1: T, o2: Partial<T>): T {
  for (const key in o1) {
    if (key in o2 && o2[key as keyof T] !== undefined) {
      const k = key as keyof T;
      o1[k] = o2[k]!;
    }
  }
  return o1;
}

/**
 * formats column names by trimming quotes, removing duplicate quotes, and replacing commas after digits to periods.
 * reference StringNoQuotes in loader1.java
 * @param text
 *
 * @returns formatted string
 */
export function formatColumnName(text: string): string {
  return trimQuotes(text.trim())
    .replace(/^"(.*)"$/, "$1")
    .replace(/""/g, '"')
    .replace(/(\d),/g, "$1.");
}

export async function checkHeader(filepath: string) {
  let isEncrypted;
  try {
    const fileStream = createReadStream(filepath);
    const readline = createInterface({ input: fileStream, crlfDelay: Infinity });

    for await (const line of readline) {
      isEncrypted = line.includes("TSCreator Encrypted Datafile");
      break;
    }
  } catch (e) {
    return false;
  }

  return isEncrypted;
}

// Function to check if a file exists
export async function checkFileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch (error) {
    return false;
  }
}

export let assetconfigs: AssetConfig;
export async function loadAssetConfigs() {
  try {
    const contents = JSON.parse((await readFile("assets/config.json")).toString());
    assertAssetConfig(contents);
    assetconfigs = contents;
  } catch (e) {
    console.log("ERROR: Failed to load asset configs from assets/config.json.  Error was: ", e);
    process.exit(1);
  }
}
export function getActiveJar() {
  if (!assetconfigs) {
    throw new Error("Asset configs not loaded");
  }
  return assetconfigs.activeJar;
}

/**
 * Finds the closest match to the input string from a list of options
 * @param input the input string
 * @param options the list of options
 * @param threshold the maximum levenshtein distance allowed
 * @returns
 */
export function getClosestMatch(input: string, options: string[], threshold?: number): string {
  if (options.length === 0) return "";
  let closestMatch = options[0]!;
  input = input.toLowerCase();
  options = options.map((option) => option.toLowerCase());
  let minDistance = levenshtein(input, closestMatch);
  for (const option of options) {
    const distance = levenshtein(input, option);
    if (distance < minDistance) {
      minDistance = distance;
      closestMatch = option;
    }
  }
  if (threshold !== undefined && minDistance > threshold) return "";
  return closestMatch;
}

export function getBytes(bytes: number) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export async function verifyFilepath(filepath: string) {
  const root = process.cwd();
  try {
    filepath = await realpath(path.resolve(filepath));
    if (!filepath.startsWith(root)) {
      return false;
    }
  } catch {
    return false;
  }
  return true;
}

export async function verifyNonExistentFilepath(filepath: string) {
  try {
    filepath = path.resolve(filepath);
    if (!filepath.startsWith(process.cwd())) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function countFiles(filepath: string): Promise<number> {
  try {
    if (!(await checkFileExists(filepath))) return 0;
    return (await readdir(filepath, { withFileTypes: true })).filter((dirent) => dirent.isFile()).length;
  } catch {
    return 0;
  }
}
// so similar filenames are always unique
export function makeTempFilename(filename: string) {
  const hash = createHash("sha256");
  hash.update(randomUUID());
  const uniqueHash = hash.digest("hex").substring(0, 10);
  return `temp__${uniqueHash}__${filename}`;
}

export function extractMetadataFromDatapack(datapack: Datapack) {
  const metadata: Partial<DatapackMetadata> = {
    description: datapack.description,
    title: datapack.title,
    originalFileName: datapack.originalFileName,
    storedFileName: datapack.storedFileName,
    size: datapack.size,
    authoredBy: datapack.authoredBy,
    tags: datapack.tags,
    references: datapack.references,
    isPublic: datapack.isPublic,
    priority: datapack.priority,
    hasFiles: datapack.hasFiles,
    type: datapack.type,
    ...(datapack.date ? { date: datapack.date } : {}),
    ...(datapack.contact ? { contact: datapack.contact } : {}),
    ...(datapack.notes ? { notes: datapack.notes } : {}),
    ...(datapack.datapackImage ? { datapackImage: datapack.datapackImage } : {}),
    ...(datapack.type === "user" || datapack.type === "workshop" ? { uuid: datapack.uuid } : {})
  };
  assertDatapackMetadata(metadata);
  return metadata;
}

export function convertTitleToUrlPath(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
