import { WatchListener, existsSync, readFileSync, unlinkSync, watch, writeFileSync } from "fs";
import { assetconfigs, loadAssetConfigs } from "../util.js";
import path from "path";

await modifyTranslations();

type JSONValue = string | JSONObject;
interface JSONObject {
  [key: string]: JSONValue;
}

export async function modifyTranslations() {
  try {
    // Load the current asset config:
    await loadAssetConfigs();
  } catch (e) {
    console.error("Error loading configs: ", e);
    process.exit(1);
  }

  const devTranslationJson = path.join("..", "shared", "translations", "dev-translation-en.json");
  const staticTranslationJson = path.join("..", "shared", "translations", "en.json");
  const translationCSV = path.join(assetconfigs.translationsDirectory, "en.csv");

  //missing dev translation file, so load the static JSON for initializing
  if (!existsSync(devTranslationJson)) {
    const data = readFileSync(staticTranslationJson, "utf-8");
    writeFileSync(devTranslationJson, data);
  }

  function flattenJson(obj: JSONObject, parentKey = "", result: [string, string][] = []): [string, string][] {
    for (const [key, value] of Object.entries(obj)) {
      const newKey = parentKey ? `${parentKey}.${key}` : key;
      if (typeof value === "object" && value !== null) {
        flattenJson(value, newKey, result);
      } else {
        result.push([newKey, String(value)]);
      }
    }
    return result;
  }

  //dev-translation-en.json becomes master, so on change overwrite static JSON and csv
  const listener: WatchListener<string> = (event, filename) => {
    if (filename) {
      const data = readFileSync(devTranslationJson, "utf-8");
      writeFileSync(staticTranslationJson, data);
      const flattened = flattenJson(JSON.parse(data));
      const csvContent = flattened.map(([key, value]) => `${key},${value}`).join("\n");
      writeFileSync(translationCSV, csvContent, "utf-8");
      console.log("successfully updated translations!");
    }
  };

  watch(devTranslationJson, listener);

  console.log(`Watching for changes in ${devTranslationJson}...`);

  //delete dev translation file when exiting modify mode (no longer needed)
  const cleanup = () => {
    try {
      if (existsSync(devTranslationJson)) {
        unlinkSync(devTranslationJson);
        console.log(`Deleted ${devTranslationJson}`);
      }
    } catch (err) {
      console.error(`Error deleting file: ${err}`);
    }
  };

  process.on("exit", cleanup);
  process.on("SIGINT", () => {
    cleanup();
    process.exit();
  });
  process.on("SIGTERM", () => {
    cleanup();
    process.exit();
  });
}
