import fs from "fs";
import path from "path";
import fsPromises from "fs/promises";
import { glob } from "glob";

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
    await fsPromises.mkdir(destination, { recursive: true });

    const entries = await fsPromises.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(destination, entry.name);

      if (entry.isDirectory()) {
        await copyDirectory(srcPath, destPath);
      } else {
        await fsPromises.copyFile(srcPath, destPath);
      }
    }
  } catch (error) {
    console.error("An error occurred:", error);
    throw error;
  }
}
/**
 * Globs files of the form <topDirectory>/<filename>/<botDirectory>
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
 * Replace one or more invisible characters (excluding spaces) with an empty string
 * @param input
 * @returns
 */
export function trimInvisibleCharacters(input: string): string {
  return input.replace(/[^\S ]+/g, "").trim();
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
