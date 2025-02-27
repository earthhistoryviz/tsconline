import fs from "fs";
import XLSX from "xlsx";
import { assetconfigs, loadAssetConfigs } from "./util.js";
import path from "path";

export type NestedTranslations = {
  [key: string]: string | NestedTranslations;
};

syncTranslations();

function mergeData(excelFilePath: string, translationJsonDir: string): Record<string, NestedTranslations> {
  // Read the Excel file
  const workbook = XLSX.readFile(excelFilePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName!];

  // Convert sheet data to JSON array
  const data: { Key: string; [lang: string]: string }[] = XLSX.utils.sheet_to_json(sheet!);

  //get languages from header (excluding "Key")
  const workbookHeaders = XLSX.readFile(excelFilePath, { sheetRows: 1 });
  const columnsArray: string[] = XLSX.utils.sheet_to_json(workbookHeaders.Sheets[sheetName!]!, {
    header: 1
  })[0] as string[];
  const languages = columnsArray.filter((lang) => lang !== "Key");

  // Create an object to hold separate language JSON structures
  const languageJsons: Record<string, NestedTranslations> = {};

  languages.forEach((lang) => {
    languageJsons[lang] = {};
  });

  languages.forEach((lang) => {
    const jsonFilePath = path.join(translationJsonDir, `${lang}.json`);
    let existingJson: NestedTranslations = {};

    if (fs.existsSync(jsonFilePath)) {
      existingJson = JSON.parse(fs.readFileSync(jsonFilePath, "utf-8"))["translation"] || {};
    }

    languageJsons[lang] = existingJson;
    data.forEach((row) => {
      if (!row[lang]) return;

      const keyPath = row.Key.split(".");
      let current: NestedTranslations = languageJsons[lang]!;

      keyPath.forEach((key, index) => {
        if (index === keyPath.length - 1) {
          current[key] = row[lang]!;
        } else {
          if (!current[key] || typeof current[key] !== "object") {
            current[key] = {} as NestedTranslations;
          }
          current = current[key] as NestedTranslations;
        }
      });
    });
  });
  return languageJsons;
}

function writeTranslationsToExcel(data: Record<string, NestedTranslations>, outputFilePath: string): void {
  if (!data) return;
  const flattenObject = (obj: NestedTranslations, prefix = ""): Record<string, string> => {
    const flattened: Record<string, string> = {};
    for (const key in obj) {
      const value = obj[key];
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === "object" && value !== undefined) {
        // Recursively flatten nested objects
        Object.assign(flattened, flattenObject(value as NestedTranslations, fullKey));
      } else if (value !== undefined) {
        // Add non-null values to the flattened object
        flattened[fullKey] = value.toString();
      }
    }
    return flattened;
  };
  const translations: Record<string, Record<string, string>> = {};
  Object.keys(data).forEach((key) => {
    if (!data[key]) return;
    translations[key] = flattenObject(data[key]!);
  });
  const combined: Record<string, Record<string, string>> = {};
  Object.entries(translations).forEach(([lang, data]) => {
    Object.entries(data).forEach(([key, value]) => {
      const obj = combined[key];
      if (obj === undefined) {
        combined[key] = {};
        combined[key]![lang] = value;
      } else if (obj !== undefined) obj[lang] = value;
    });
  });

  // Convert combined translations to an array of rows for Excel
  const rows = Object.entries(combined).map(([key, translations]) => ({
    Key: key,
    ...translations
  }));
  // Write to Excel
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Translations");
  XLSX.writeFile(workbook, outputFilePath);
}

function writeTranslationsToJson(data: Record<string, NestedTranslations>, outputDir: string): void {
  Object.keys(data).forEach((lang) => {
    if (!data[lang]) return;
    data[lang] = { translation: data[lang]! };
    const fileName = `${lang}.json`;
    fs.writeFileSync(path.join(outputDir, fileName), JSON.stringify(data[lang], null, 4));
  });
}

export async function syncTranslations() {
  try {
    // Load the current asset config:
    await loadAssetConfigs();
  } catch (e) {
    console.error("Error loading configs: ", e);
    process.exit(1);
  }

  const translationExcel = path.join(assetconfigs.translationFilepath);
  const translationJsonDir = path.join("../shared/translations");
  const mergedData: Record<string, NestedTranslations> = mergeData(translationExcel, translationJsonDir);

  writeTranslationsToExcel(mergedData, translationExcel);
  writeTranslationsToJson(mergedData, translationJsonDir);
}
