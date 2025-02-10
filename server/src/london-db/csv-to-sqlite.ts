import csv from "csv-parser";
import { createReadStream } from "fs";
import { LondonDatabaseKey, isLondonDatabaseType, londonDb, outputCSVDir } from "./london-database.js";
import { readdir } from "fs/promises";
import { join } from "path";

const BATCH_SIZE = 1;

async function insertLargeCSVData(tableName: LondonDatabaseKey, filePath: string) {
  const batch: Record<string, unknown>[] = [];
  return new Promise<void>((resolve, reject) => {
    createReadStream(filePath)
      .pipe(csv())
      .on("data", async (row: Record<string, unknown>) => {
        row = Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value === "" ? null : value]));
        batch.push(row);
        if (batch.length >= BATCH_SIZE) {
          try {
            await londonDb.insertInto(tableName).values(batch).execute();
          } catch (error) {
            console.log(row);
            reject(error);
          }
          batch.length = 0;
        }
      })
      .on("end", async () => {
        if (batch.length > 0) {
          try {
            await londonDb.insertInto(tableName).values(batch).execute();
          } catch (error) {
            reject(error);
          }
        }
        console.log(`Imported ${filePath} into ${tableName}`);
        resolve();
      })
      .on("error", reject);
  });
}
async function getCSVFiles(directory: string): Promise<string[]> {
  try {
    const files = await readdir(directory);
    return files.filter((file) => file.endsWith(".csv") && isLondonDatabaseType(file.split(".csv")[0] || ""));
  } catch (error) {
    console.error("Error reading directory:", error);
    return [];
  }
}

// Import all tables
export async function importAllTables() {
  const files = await getCSVFiles(outputCSVDir);
  for (const csv of files) {
    const tableName = csv.split(".csv")[0] as LondonDatabaseKey; // we checked this in getCSVFiles
    const filePath = join(outputCSVDir, csv);
    await insertLargeCSVData(tableName, filePath);
  }
}
