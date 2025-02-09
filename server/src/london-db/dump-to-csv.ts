import * as readline from "readline";
import { createObjectCsvWriter } from "csv-writer";
import { createReadStream, existsSync, mkdirSync } from "fs";
import chalk from "chalk";
import { join } from "path";

const DUMP_FILE = join("db", "london", "london.sql");
const OUTPUT_DIR = join("db", "london", "output_csvs");

if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR);
}

// Function to clean up MySQL values (handles quotes, NULLs, etc.)
const cleanValue = (value: string) => {
  if (value === "NULL") return null;
  return value.trim().replace(/^'|'$/g, "").replace(/\\'/g, "'");
};

async function convertSQLDumpToCSV(dumpFile: string) {
  const fileStream = createReadStream(dumpFile);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let tables: Record<string, { columns: string[]; rows: (string | null)[][] }> = {};
  let currentInsert = "";
  let tableName = "";
  let columns: string[] = [];

  try {
    for await (const line of rl) {
      // statements shouln't have empty lines
      if (line.trim() === "") {
        currentInsert = "";
        continue;
      }
      currentInsert += line.trim() + " ";
      if (!line.trim().endsWith(";")) continue; // keep going until a statement is completed

      const insertMatch = currentInsert.match(/^INSERT INTO `?(\w+)`? \(([^)]+)\) VALUES/i);
      if (insertMatch && insertMatch[1] && insertMatch[2]) {
        tableName = insertMatch[1];
        columns = insertMatch[2].split(",").map((col) => col.trim().replace(/`/g, ""));

        if (!tables[tableName]) {
          tables[tableName] = { columns, rows: [] };
        }

        let valuesPart = currentInsert.split("VALUES")[1];
        if (valuesPart) {
          let valueGroups = valuesPart
            .split(/\),\s?\(/)
            .map((row) => row.trim().replace(/^\(/, "").replace(/\);?$/, "").split(",").map(cleanValue));
          tables[tableName]!.rows.push(...valueGroups);
        }

        currentInsert = "";
      }
    }
  } catch (e) {
    console.error(e);
    console.log(chalk.red("Error parsing SQL dump"));
    return;
  }
  console.log(chalk.green("SQL dump parsed successfully!"));
  for (const [table, { columns, rows }] of Object.entries(tables)) {
    try {
      const csvWriter = createObjectCsvWriter({
        path: join(OUTPUT_DIR, `${table}.csv`),
        header: columns.map((col) => ({ id: col, title: col }))
      });

      const records = rows.map((row) =>
        // create a hash of column name to value for each row
        row.reduce(
          (acc, val, i) => {
            if (!columns[i]) return acc;
            acc[columns[i]!] = val;
            return acc;
          },
          {} as Record<string, string | null>
        )
      );

      await csvWriter.writeRecords(records);
      console.log(`Exported: ` + chalk.green(`${table}.csv`));
    } catch (e) {
      console.error(e);
      console.log(chalk.yellow(`Error exporting ${table} to CSV`));
    }
  }

  console.log(chalk.green("✅ All tables exported successfully!"));
}

convertSQLDumpToCSV(DUMP_FILE);
