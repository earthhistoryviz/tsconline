//removes translations in other languages that does not exist the english translation
import { readFileSync, writeFileSync } from "fs";
import { assetconfigs, loadAssetConfigs } from "../util.js";
import path from "path";
import chalk from "chalk";

const availLanguages = path.join("..", "shared", "translations", "available-languages.json");
const engTranslation = path.join("..", "shared", "translations", "en.json");

await removeExtraTranslations();

export async function removeExtraTranslations() {
  try {
    await loadAssetConfigs();
    const engData = JSON.parse(readFileSync(engTranslation, "utf-8"));
    const languages = JSON.parse(readFileSync(availLanguages, "utf-8"));
    for (const [, value] of Object.entries(languages)) {
      if (value === "en") continue;
      const langTranslationJSON = path.join("..", "shared", "translations", `${value}.json`);
      const langData = JSON.parse(readFileSync(langTranslationJSON, "utf-8"));
      const [prunedData, didRemove] = removeExtraKeys(langData, engData);
      writeFileSync(langTranslationJSON, JSON.stringify(prunedData, null, 4), "utf-8");
      const langCSV = path.join(assetconfigs.translationsDirectory, `${value}.csv`);
      const flattened = flattenJson(prunedData);
      const csvContent = flattened.map(([key, value]) => `${key},${value}`).join("\n");
      writeFileSync(langCSV, csvContent, "utf-8");
      if (didRemove) {
        console.log(chalk.green(`removed extra translations for ${value}`));
      }
    }
  } catch (e) {
    console.log("failed to remove translations: ", e);
  }
}

type JSONValue = string | JSONObject;
interface JSONObject {
  [key: string]: JSONValue;
}
//other and eng are on the same level
function removeExtraKeys(lang: JSONObject, eng: JSONObject): [JSONObject, boolean] {
  let didRemove = false;
  for (const key of Object.keys(lang)) {
    const langValue = lang[key];
    const engValue = eng[key];
    if (engValue === undefined) {
      delete lang[key];
      didRemove = true;
    } else if (isObject(langValue!) && isObject(engValue)) {
      const [, remove] = removeExtraKeys(langValue, engValue);
      didRemove = didRemove || remove;
    }
  }
  return [lang, didRemove];
}
function isObject(value: JSONValue): value is JSONObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
