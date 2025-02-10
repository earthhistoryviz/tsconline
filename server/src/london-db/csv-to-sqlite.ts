import csv from "csv-parser";
import { createReadStream } from "fs";
import { londonDb, outputCSVDir } from "./london-database.js";
import { readdir } from "fs/promises";
import { join } from "path";
import { toCamelCase, assertLondonDatabaseKey, isLondonDatabaseType, LondonDatabaseKey } from "../types.js";
import chalk from "chalk";

const BATCH_SIZE = 1;

const surroundedByQuotes = (value: string) => value.startsWith('"') && value.endsWith('"');

async function insertLargeCSVData(tableName: string, filePath: string) {
  const key = toCamelCase(tableName);
  assertLondonDatabaseKey(key);
  return new Promise<void>((resolve, reject) => {
    let batch: Record<string, string | null | number>[] = [];
    const stream = createReadStream(filePath)
      .pipe(csv())
      .on("data", async (row: Record<string, string>) => {
        stream.pause();
        const batchRow = Object.fromEntries(
          Object.entries(row).map(([key, value]) => [
            key,
            value === "" ? null : surroundedByQuotes(value) ? value : !isNaN(Number(value)) ? Number(value) : value
          ])
        );
        batch.push(batchRow);
        if (batch.length >= BATCH_SIZE) {
          try {
            await londonDb.insertInto(key).values(batch).execute();
          } catch (error) {
            reject(error);
            return;
          } finally {
            // reset batch
            batch = [];
            stream.resume();
          }
        }
      })
      .on("end", async () => {
        if (batch.length > 0) {
          try {
            await londonDb.insertInto(key).values(batch).execute();
          } catch (error) {
            reject(error);
            return;
          }
        }
        console.log(chalk.cyan(`Imported ${filePath} into ${tableName}`));
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

export async function importAllTables() {
  const files = await getCSVFiles(outputCSVDir);
  for (const csv of files) {
    const tableName = csv.split(".csv")[0] as LondonDatabaseKey; // we checked this in getCSVFiles
    const filePath = join(outputCSVDir, csv);
    await insertLargeCSVData(tableName, filePath);
  }
}
