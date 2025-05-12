import { readFileSync, existsSync } from "fs";
import { assetconfigs, loadAssetConfigs } from "../util.js";
import { printUnifiedDiff } from "print-diff";
import path from "path";
try {
  let verify = true;
  if (!checkKeysExistInEnglish()) {
    console.error("Some keys are missing English translations.");
    verify = false;
  }
  if (!(await checkTranslationSync())) {
    console.error("Translation JSON and CSV are not equivalent.");
    verify = false;
  }
  if (!checkDevFileRemoved()) {
    console.error("Dev Translation JSON not removed, please delete it");
    verify = false;
  }
  if (!verify) {
    process.exit(1);
  }
  console.log("verified translations.");
  process.exit(0);
} catch (e) {
  console.error("failed to verify translations");
}

function checkDevFileRemoved() {
  const devTranslationJson = path.join("..", "shared", "translations", "dev-translation-en.json");
  if (existsSync(devTranslationJson)) {
    return false;
  }
  return true;
}

//check that static JSON and translation CSV are equivalent
//i.e. have same keys and same translations
async function checkTranslationSync() {
  try {
    // Load the current asset config:
    await loadAssetConfigs();
  } catch (e) {
    console.error("Error loading configs: ", e);
    process.exit(1);
  }

  const availLangJSON = path.join("..", "shared", "translations", "available-languages.json");
  const availLang = JSON.parse(readFileSync(availLangJSON, "utf-8"));
  for (const lang in availLang) {
    const currLang = availLang[lang];
    const staticTranslationJson = path.join("..", "shared", "translations", `${currLang}.json`);
    const translationCSV = path.join(assetconfigs.translationsDirectory, `${currLang}.csv`);

    const data = readFileSync(staticTranslationJson, "utf-8");
    const flattened = flattenJson(JSON.parse(data));
    const jsonData = flattened.map(([key, value]) => `${key},${value}`).join("\n");

    const csvData = readFileSync(translationCSV, "utf-8");
    if (jsonData !== csvData) {
      printUnifiedDiff(jsonData, csvData);
      return false;
    }
  }
  return true;
}

function flattenJson(obj: Record<string, string>, parentKey = "", result: [string, string][] = []): [string, string][] {
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

// Check that all keys have an English translation
// i.e. throw an error if there are keys in other languages that are not in the English translation
function checkKeysExistInEnglish() {
  const staticTranslationJson = path.join("..", "shared", "translations", "en.json");
  const engData = JSON.parse(readFileSync(staticTranslationJson, "utf-8"));
  const availLang = JSON.parse(
    readFileSync(path.join("..", "shared", "translations", "available-languages.json"), "utf-8")
  );
  let keysExist = true;
  for (const lang in availLang) {
    const currLang = availLang[lang];
    if (currLang == "en") continue;
    const currTranslation = JSON.parse(
      readFileSync(path.join("..", "shared", "translations", `${currLang}.json`), "utf-8")
    );
    const result = compareKeys(engData, currTranslation);
    if (result.length > 0) {
      console.log(`translations keys exist in ${currLang} that doesn't exist in english`);
      console.log(result);
      keysExist = false;
    }
  }
  return keysExist;
}

type JSONValue = string | JSONObject;
interface JSONObject {
  [key: string]: JSONValue;
}

/**
 * Recursively collect all key paths from a JSON object
 * e.g., { a: { b: 1 } } -> ['a', 'a.b']
 */
function getKeyPaths(obj: JSONValue, prefix = ""): string[] {
  if (obj === null || typeof obj !== "object") return [];

  const paths: string[] = [];
  for (const key in obj as JSONObject) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    paths.push(fullPath);
    const value = (obj as JSONObject)[key];
    if (value !== undefined) {
      paths.push(...getKeyPaths(value, fullPath));
    }
  }
  return paths;
}

/**
 * Compare two JSON objects and return key paths that are:
 * - only in the first
 * - only in the second
 */
function compareKeys(engJSON: JSONValue, otherJSON: JSONValue) {
  const engKeys = new Set(getKeyPaths(engJSON));
  const otherKeys = new Set(getKeyPaths(otherJSON));

  const keysNotEng = [...otherKeys].filter((k) => !engKeys.has(k));

  return keysNotEng;
}
