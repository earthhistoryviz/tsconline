import csv from 'csv-parser';
import { OUTPUT_DIR } from './dump-to-csv.js';
import { createReadStream } from 'fs';
import { LondonDatabaseKey, isLondonDatabaseType, londonDb } from './london-database.js';
import { readdir } from 'fs/promises';
import { join } from 'path';

const BATCH_SIZE = 1000;

async function insertLargeCSVData(tableName: LondonDatabaseKey, filePath: string) {
  const batch: string[] = [];

  return new Promise<void>((resolve, reject) => {
    createReadStream(filePath)
      .pipe(csv())
      .on('data', async (row: string) => {
        batch.push(row);
        if (batch.length >= BATCH_SIZE) {
          await londonDb.insertInto(tableName).values(batch).execute();
          batch.length = 0;
        }
      })
      .on('end', async () => {
        if (batch.length > 0) {
          await londonDb.insertInto(tableName).values(batch).execute();
        }
        console.log(`Imported ${filePath} into ${tableName}`);
        resolve();
      })
      .on('error', reject);
  });
}
async function getCSVFiles(directory: string): Promise<string[]> {
    try {
      const files = await readdir(directory);
      return files.filter(file => file.endsWith('.csv') && isLondonDatabaseType(file.split(".csv")[0] || ""));
    } catch (error) {
      console.error('Error reading directory:', error);
      return [];
    }
  }

// Import all tables
async function importAllTables() {
    const files = await getCSVFiles(OUTPUT_DIR);
    for (const csv of files) {
        const tableName = csv.split(".csv")[0] as LondonDatabaseKey; // we checked this in getCSVFiles
        const filePath = join(OUTPUT_DIR, csv);
        await insertLargeCSVData(tableName, filePath);
    }
}

await importAllTables();
