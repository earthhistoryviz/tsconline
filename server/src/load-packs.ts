import {
  DatapackIndex,
  MapPackIndex,
  Patterns,
  assertDatapackParsingPack,
  assertMapPack,
  assertPatterns
} from "@tsconline/shared";
import { assetconfigs } from "./index.js";
import { parseDatapacks } from "./parse-datapacks.js";
import { parseMapPacks } from "./parse-map-packs.js";
import { getColorFromURL } from "color-thief-node";
import { glob } from "glob";
import { readFile } from "fs/promises";
import nearestColor from "nearest-color";
import path from "path";
import { assertColors } from "./types.js";
import { rgbToHex } from "./util.js";

export async function loadIndexes(datapackIndex: DatapackIndex, mapPackIndex: MapPackIndex) {
  console.log(`\nParsing datapacks: ${assetconfigs.activeDatapacks}\n`);
  for (const datapack of assetconfigs.activeDatapacks) {
    parseDatapacks(assetconfigs.decryptionDirectory, [datapack])
      .then((datapackParsingPack) => {
        assertDatapackParsingPack(datapackParsingPack);
        datapackIndex[datapack] = datapackParsingPack;
        console.log(`Successfully parsed ${datapack}`);
      })
      .catch((e) => {
        console.log(`Cannot create a datapackParsingPack with datapack ${datapack} and error: ${e}`);
      });
    parseMapPacks([datapack])
      .then((mapPack) => {
        assertMapPack(mapPack);
        mapPackIndex[datapack] = mapPack;
      })
      .catch((e) => {
        console.log(`Cannot create a mapPack with datapack ${datapack} and error: ${e}`);
      });
  }
}
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
      const dominant = await getColorFromURL(pattern);
      const color = nearest(rgbToHex(dominant[0], dominant[1], dominant[2]));
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
