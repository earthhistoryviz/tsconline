import { readFileSync } from "fs";
import path from "path";

checkKeysExistInEnglish();

// Check that all keys have an English translation
// i.e. throw an error if there are keys in other languages that are not in the English translation
export async function checkKeysExistInEnglish() {
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
