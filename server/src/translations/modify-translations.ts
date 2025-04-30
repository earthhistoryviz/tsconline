import { WatchListener, existsSync, readFileSync, watch, writeFileSync } from 'fs';
import { assetconfigs, loadAssetConfigs } from "../util.js";
import path from "path";

modifyTranslations();

const devTranslationJson = path.join("..", "shared", "translations", "dev-translation-en.json");
const staticTranslationJson = path.join("..", "shared", "translations", "en.json");
const translationCSV = path.join("assets", "translations", "en.csv");

export async function modifyTranslations() {
    try {
      // Load the current asset config:
      await loadAssetConfigs();
    } catch (e) {
      console.error("Error loading configs: ", e);
      process.exit(1);
    }

    //missing dev translation file, so load the static JSON for initializing
    if (!existsSync(devTranslationJson)) {
        const data = readFileSync(staticTranslationJson, 'utf-8');
        writeFileSync(devTranslationJson, data);
    }

    function flattenJson(obj: Record<string, any>, parentKey = '', result: [string, string][] = []): [string, string][] {
          for (const [key, value] of Object.entries(obj)) {
              const newKey = parentKey ? `${parentKey}.${key}` : key;
              if (typeof value === 'object' && value !== null) {
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
            const data = readFileSync(devTranslationJson, 'utf-8');
            writeFileSync(staticTranslationJson, data);
            const flattened = flattenJson(JSON.parse(data));
            const csvContent = flattened.map(([key, value]) => `${key},${value}`).join('\n');
            writeFileSync(translationCSV, csvContent, 'utf-8');
            console.log("successfully updated translations!");
        }
      };

    const watcher = watch(devTranslationJson, listener)

    console.log(`Watching for changes in ${devTranslationJson}...`);
  }

















//   writeCSV();

  export async function writeCSV() {
      try {
      // Load the current asset config:
          await loadAssetConfigs();
      } catch (e) {
          console.error("Error loading configs: ", e);
          process.exit(1);
      }
      // function flattenJson(obj: Record<string, any>, parentKey = '', result: [string, string][] = []): [string, string][] {
      //     for (const [key, value] of Object.entries(obj)) {
      //         const newKey = parentKey ? `${parentKey}.${key}` : key;
      //         if (typeof value === 'object' && value !== null) {
      //         flattenJson(value, newKey, result);
      //         } else {
      //         result.push([newKey, String(value)]);
      //         }
      //     }
      //     return result;
      // }
      // // Paths
      // const inputJsonDir = path.join("..", "shared", "translations");
  
      // const langJson = path.join("..", "shared", "translations", "available-languages.json");
      // const jsonData = JSON.parse(readFileSync(langJson, 'utf-8'));
      
      // for (const lang in jsonData) {
      //     const currLanguage = jsonData[lang];
      //     const currLanguagePath = path.join("..", "shared", "translations", `${currLanguage}.json`);
      //     const currData = JSON.parse(readFileSync(currLanguagePath, 'utf-8'));
      //     const flattened = flattenJson(currData);
      //     const csvContent = flattened.map(([key, value]) => `${key},${value}`).join('\n');
  
      //     const outputCsvPath = path.join(assetconfigs.translationsDirectory, `${currLanguage}.csv`);
      //     writeFileSync(outputCsvPath, csvContent, 'utf-8');
      // }
  
      // readdir(inputJsonDir, (err, filenames) => {
      //     console.log(filenames);
      // })
  
      // Read and parse JSON
      // const jsonData = JSON.parse(readFileSync(inputJsonPath, 'utf-8'));
      
      // // Flatten and convert to CSV
      // const flattened = flattenJson(jsonData);
      // const csvContent = flattened.map(([key, value]) => `"${key}","${value}"`).join('\n');
      
      // // Write to CSV file
      // writeFileSync(outputCsvPath, csvContent, 'utf-8');
      
      // console.log(`CSV written to ${outputCsvPath}`);
  }
