import fs from "fs";
import XLSX from "xlsx";
import { assetconfigs, loadAssetConfigs } from "../util.js";
import path from "path";

type NestedTranslations = {
  [name: string]: string | NestedTranslations;
};

function excelToJson(filePath: string): void {
  // Read the Excel file
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName!];

  // Convert sheet data to JSON array
  const data: { Key: string; [lang: string]: string }[] = XLSX.utils.sheet_to_json(sheet!);

  //get languages from header (excluding "Key")
  const workbookHeaders = XLSX.readFile(filePath, { sheetRows: 1 });
  const columnsArray: string[] = XLSX.utils.sheet_to_json(workbookHeaders.Sheets[sheetName!]!, {
    header: 1
  })[0] as string[];
  const languages = columnsArray.filter((lang) => lang !== "Key");

  // Create an object to hold separate language JSON structures
  const languageJsons: Record<string, NestedTranslations> = {};

  languages.forEach((lang) => {
    languageJsons[lang] = {};
  });

  data.forEach((row) => {
    const keyPath = row.Key.split(".");

    languages.forEach((lang) => {
      let current: NestedTranslations = languageJsons[lang] !== undefined ? languageJsons[lang]! : {};
      //skip if no translation for this key language pair
      if (!row[lang]) {
        return;
      }
      keyPath.forEach((key, index) => {
        if (index === keyPath.length - 1) {
          // Assign translation for this language
          // already checked if row[lang] exists
          current[key] = row[lang]!;
        } else {
          // Ensure the path exists
          if (!current[key]) {
            current[key] = {};
          }
          current = current[key] as NestedTranslations;
        }
      });
    });
  });

  // Temporary, Save each language JSON to a file
  languages.forEach((lang) => {
    const fileName = `${lang}.json`;
    fs.writeFileSync("./src/translations/" + fileName, JSON.stringify(languageJsons[lang], null, 2));
  });
}

try {
  // Load the current asset config:
  await loadAssetConfigs();
} catch (e) {
  console.error("Error loading configs: ", e);
  process.exit(1);
}

const inputExcel = path.join(assetconfigs.translationFilepath);
excelToJson(inputExcel);
