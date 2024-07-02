import fs, { createReadStream } from "fs";
import path from "path";
import { rm, readFile, access, mkdir, readdir, copyFile } from "fs/promises";
import { glob } from "glob";
import { createInterface } from "readline/promises";
import { constants } from "fs";
import levenshtein from "js-levenshtein";
import { AdminConfig, assertAdminConfig, assertAssetConfig, AssetConfig } from "./types.js";

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
  // regular expression for all filenames located in <topDirectory>/<file_name>/<botDirectory>
  const pattern = new RegExp(
    files
      .map((name) => {
        const lastIndex = name.lastIndexOf(".");
        const filename = lastIndex !== -1 ? name.substring(0, lastIndex) : name;
        return `${topDirectory}/${filename}/${botDirectory}/.*`;
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
  return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
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
 * delete the uploaded file and the decrypted directory if they exist
 * @param uploadedFile
 * @param decryptedUploadedDirectory
 */
export async function resetUploadDirectory(uploadedFile: string, decryptedUploadedDirectory: string) {
  await rm(uploadedFile, { force: true });
  if (fs.existsSync(decryptedUploadedDirectory)) {
    deleteDirectory(decryptedUploadedDirectory);
  }
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
export let adminconfig: AdminConfig = { datapacks: [] };
export async function loadAssetConfigs() {
  try {
    const contents = JSON.parse((await readFile("assets/config.json")).toString());
    assertAssetConfig(contents);
    assetconfigs = contents;
  } catch (e) {
    console.log("ERROR: Failed to load asset configs from assets/config.json.  Error was: ", e);
    process.exit(1);
  }
  if (await checkFileExists(assetconfigs.adminConfigPath)) {
    try {
      const content = JSON.parse((await readFile(assetconfigs.adminConfigPath)).toString());
      assertAdminConfig(content);
      adminconfig = content;
    } catch (e) {
      console.log("ERROR: Failed to load admin configs from assets/admin-config.json.  Error was: ", e);
      process.exit(1);
    }
  }
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
