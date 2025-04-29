import { WatchListener, existsSync, readFileSync, readdir, watch, writeFileSync } from 'fs';
import { assetconfigs, loadAssetConfigs } from "./util.js";
import path from "path";



modifyTranslations();

// const translationExcel = path.join(assetconfigs.translationFilepath);
const devTranslationJson = path.join("..", "app", "dev-translation-en.json");
const staticTranslationJson = path.join("..", "shared", "translations", "en.json");
const translationCSV = 

export async function modifyTranslations() {
    try {
      // Load the current asset config:
      await loadAssetConfigs();
    } catch (e) {
      console.error("Error loading configs: ", e);
      process.exit(1);
    }

    if (!existsSync(devTranslationJson)) {
        const data =  JSON.parse(readFileSync(staticTranslationJson, 'utf-8'));
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

    const listener: WatchListener<string> = (event, filename) => {
        if (filename) {
            
            const jsonData = JSON.parse(readFileSync(devTranslationJson, 'utf-8'));
            writeFileSync(staticTranslationJson, jsonData);
            const flattened = flattenJson(jsonData);
            const csvContent = flattened.map(([key, value]) => `${key},${value}`).join('\n');
            writeFileSync(translationCSV, csvContent, 'utf-8');
        }
      };

    const watcher = watch(devTranslationJson, listener)
    

    //create en dev json
    
    //copy en static json to en dev json
    //create listener for dev json
    //change static and csv on change


    console.log(`Watching for changes in ${path}...`);
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
