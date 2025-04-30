import { readFileSync, writeFileSync } from "fs";
import { assetconfigs, loadAssetConfigs } from "../util.js";
import path from "path";

createJsonTranslations();

async function createJsonTranslations() {
  try {
    // Load the current asset config:
    await loadAssetConfigs();
  } catch (e) {
    console.error("Error loading configs: ", e);
    process.exit(1);
  }
  const availLangCSV = readFileSync(path.join(assetconfigs.translationsDirectory, "available-languages.csv"), "utf-8");
  const availLang = csvToNestedJson(availLangCSV);
  for (const lang in availLang) {
    const currLang = availLang[lang];
    const staticTranslationJson = path.join("..", "shared", "translations", `${currLang}.json`);
    const translationCSV = path.join(assetconfigs.translationsDirectory, `${currLang}.csv`);
    const csvData = readFileSync(translationCSV, "utf-8");
    const csvToJson = JSON.stringify(csvToNestedJson(csvData), null, 4);
    writeFileSync(staticTranslationJson, csvToJson);
  }
}

type JSONLeaf = string;
type JSONValue = JSONLeaf | JSONObject;
interface JSONObject {
  [key: string]: JSONValue;
}

function csvToNestedJson(csv: string): JSONObject {
  const lines = csv.trim().split("\n");
  const result: JSONObject = {};

  for (const line of lines) {
    const [rawKey, ...rawValueParts] = line.split(",");
    if (!rawKey || rawValueParts.length === 0) continue;

    const keyPath = rawKey.trim().split(".");
    const value: JSONLeaf = rawValueParts.join(",").trim().replace(/^"|"$/g, "");

    let current: JSONObject = result;
    for (let i = 0; i < keyPath.length; i++) {
      const key = keyPath[i];
      if (key === undefined) continue;
      if (i === keyPath.length - 1) {
        current[key] = value;
      } else {
        if (!(key in current)) {
          current[key] = {};
        }
        const next = current[key];
        if (typeof next === "string") {
          // Conflict: can't nest into a leaf node
          throw new Error(`Conflict at key path "${keyPath.slice(0, i + 1).join(".")}"`);
        }
        if (next === undefined) {
          console.error(`Couldn't find ${key} in ${keyPath}`);
          continue;
        }
        current = next;
      }
    }
  }

  return result;
}
