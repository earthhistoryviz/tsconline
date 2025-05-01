// If en is changed without a dev JSON existing, throw a warning (i.e. check if en JSON is different from CSV)
// this is for the case where the developer changes the static translation file (before using modify-translations).
// This will cause any added translations to disappear.

import { readFileSync } from "fs";
import { assetconfigs, loadAssetConfigs } from "../util.js";
import path from "path";

checkPrematureChange();

async function checkPrematureChange() {
  try {
    // Load the current asset config:
    await loadAssetConfigs();
  } catch (e) {
    console.error("Error loading configs: ", e);
    process.exit(1);
  }
  const staticTranslationJson = path.join("..", "shared", "translations", "en.json");
  const translationCSV = path.join(assetconfigs.translationsDirectory, "en.csv");
  function flattenJson(
    obj: Record<string, string>,
    parentKey = "",
    result: [string, string][] = []
  ): [string, string][] {
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

  const data = readFileSync(staticTranslationJson, "utf-8");
  const flattened = flattenJson(JSON.parse(data));
  const JSONtoCSV = flattened.map(([key, value]) => `${key},${value}`).join("\n");
  const csvData = readFileSync(translationCSV, "utf-8");
  if (JSONtoCSV !== csvData) {
    console.log("For translations, JSON not equal to CSV, any changes made to JSON will be discarded!!!");
    console.log("To make changes to translations, run yarn modify-translations in server directory");
  }
}
