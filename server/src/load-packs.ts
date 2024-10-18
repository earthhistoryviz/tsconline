import { DatapackIndex, Patterns, assertPatterns, DatapackMetadata } from "@tsconline/shared";
import pmap from "p-map";
import fs from "fs/promises";
import fsSync from "fs";
import { parseDatapacks } from "./parse-datapacks.js";
import { glob } from "glob";
import { readFile } from "fs/promises";
import nearestColor from "nearest-color";
import path from "path";
import { assertColors } from "./types.js";
import { grabFilepaths, rgbToHex, assetconfigs } from "./util.js";
import chalk from "chalk";
import sharp from "sharp";
import Vibrant from "node-vibrant";

/**
 * Loads all the indexes for the active datapacks and mapPacks (if they exist)
 * will stop parsing if an error is thrown
 * will keep parsed datapacks that don't have errors
 * @param datapackIndex the datapackIndex to load
 * @param decryptionDirectory the directory that has the decrypted files
 * @param datapacks the datapacks to load
 * @param type the type of datapack (and any additional properties that come with the type)
 */
export async function loadDatapackIntoIndex(
  datapackIndex: DatapackIndex,
  decryptionDirectory: string,
  datapack: DatapackMetadata
) {
  let successful = true;
  console.log(`\nParsing datapack ${datapack.title} \n`);
  await parseDatapacks(datapack, decryptionDirectory)
    .then((baseDatapackProps) => {
      if (!baseDatapackProps) {
        return;
      }
      if (datapackIndex[datapack.title]) {
        throw new Error(`Datapack ${datapack.title} already exists`);
      }
      datapackIndex[datapack.title] = baseDatapackProps;
      console.log(chalk.green(`Successfully parsed ${datapack.originalFileName}`));
    })
    .catch((e) => {
      successful = false;
      console.log(
        chalk.red(`Cannot create a baseDatapackProps with datapack ${datapack.originalFileName} and error: ${e}`)
      );
    });
  successful = (await grabMapImages([datapack.storedFileName], decryptionDirectory)).successful && successful;
  return successful;
}
/**
 * Loads all the facies patterns from the patterns directory
 * @returns Patterns
 */
export async function loadFaciesPatterns() {
  try {
    const patterns: Patterns = {};
    const patternsGlobed = await glob(`${assetconfigs.patternsDirectory}/*.PNG`);
    const colors = JSON.parse((await readFile(assetconfigs.colors)).toString());
    assertColors(colors);
    const nearest = nearestColor.from(colors);
    if (patternsGlobed.length == 0) throw new Error("No patterns found");
    for (const pattern of patternsGlobed) {
      const name = path.basename(pattern).split(".")[0];
      const palette = await getDominantRGB(pattern);
      if (!palette || !palette.Vibrant) {
        console.error(
          `Cannot get dominant color for pattern in ${assetconfigs.patternsDirectory} with path ${pattern}`
        );
        continue;
      }
      const color = nearest(rgbToHex(palette.Vibrant.r, palette.Vibrant.g, palette.Vibrant.b));
      if (!name) {
        console.error(`Unrecognized pattern file in ${assetconfigs.patternsDirectory} with path ${pattern}`);
        continue;
      }
      if (!color) {
        console.error(
          `Unrecognized color in ${assetconfigs.patternsDirectory} with path ${pattern} with color ${color}`
        );
        continue;
      }
      // format so it splits all underscores and capitalizes the first letter
      const formattedName = name
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      patterns[name] = {
        name,
        formattedName,
        filePath: `/${pattern}`,
        color: {
          name: color.name,
          hex: color.value,
          rgb: color.rgb
        }
      };
    }
    assertPatterns(patterns);
    return patterns;
  } catch (e) {
    console.error(e);
    return {};
  }
}

async function getDominantRGB(filepath: string) {
  const image = await sharp(filepath).toBuffer();
  if (!image) {
    throw new Error("Cannot read image");
  }
  const palette = await Vibrant.from(image).getPalette();
  if (!palette) {
    throw new Error("Cannot get palette from image");
  }
  return palette;
}

/**
 * Finds all map images and puts them in the public directory
 * For access from fastify server servicing
 */
export async function grabMapImages(
  datapacks: string[],
  decryptionDirectory: string = assetconfigs.decryptionDirectory
): Promise<{ images: string[]; successful: boolean }> {
  if (datapacks.length === 0) return { images: [], successful: true };
  const imagePaths = await grabFilepaths(datapacks, decryptionDirectory, "MapImages");
  const compiledImages: string[] = [];
  let successful = true;
  try {
    // recursive: true ensures if it already exists, we continue with no error
    await fs.mkdir(assetconfigs.imagesDirectory, { recursive: true });
    await pmap(
      imagePaths,
      async (image_path) => {
        const fileName = path.basename(image_path);
        const destPath = path.join(assetconfigs.imagesDirectory, fileName);
        if (fsSync.existsSync(destPath)) {
          return;
        }
        try {
          await fs.copyFile(image_path, destPath);
          compiledImages.push(`/${destPath}`);
        } catch (e) {
          console.log("Error copying image file, file could already exist. Resulting Error: ", e);
        }
      },
      { concurrency: 5 }
    ); // Adjust concurrency as needed
  } catch (e) {
    console.log("Error processing image paths for datapacks: ", datapacks, " \n", "With error: ", e);
    successful = false;
  }
  return { images: compiledImages, successful };
}
