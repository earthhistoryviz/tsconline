import * as readline from "readline";
import { createObjectCsvWriter } from "csv-writer";
import { createReadStream } from "fs";
import chalk from "chalk";
import { join } from "path";
import { access, mkdir, writeFile } from "fs/promises";
import { outputCSVDir } from "./london-database.js";

const tableRegex = /CREATE TABLE `?(\w+)`? \(/;
const breakWord = "break";
const insertRegex = new RegExp(`^INSERT INTO \`?(\\w+)\`? \\(([^)]+)\\)${breakWord}VALUES`, "i");

const cleanValue = (value: string) => {
  if (value === "NULL") return null;
  return value.trim().replace(/^'|'$/g, '"').replace(/\\'/g, "'");
};

export async function convertSQLDumpToCSV(dumpFile: string) {
  const fileStream = createReadStream(dumpFile);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  const tables: Record<string, { columns: string[]; rows: (string | null)[][] }> = {};
  const schemas: string[] = [];
  let currentLine = "";
  let columns: string[] = [];

  try {
    for await (const line of rl) {
      // statements shouln't have empty lines
      if (line.trim() === "") {
        currentLine = "";
        continue;
      }
      currentLine += line.trim() + breakWord;
      if (!line.trim().endsWith(";")) continue; // keep going until a statement is completed

      if (tableRegex.test(currentLine)) {
        const schema = processSchema(currentLine);
        currentLine = "";
        if (schema) schemas.push(schema);
        continue;
      }
      const insertMatch = currentLine.match(insertRegex);
      if (insertMatch) {
        processInsert(tables, insertMatch, currentLine);
        currentLine = "";
      }
    }
  } catch (e) {
    console.error(e);
    console.log(chalk.red("Error parsing SQL dump"));
    return;
  }
  console.log(chalk.green("SQL dump parsed successfully!"));

  // write the csv
  for (const [table, { columns, rows }] of Object.entries(tables)) {
    try {
      const csvWriter = createObjectCsvWriter({
        path: join(outputCSVDir, `${table}.csv`),
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

  try {
    // write the schemas
    await writeFile(join(outputCSVDir, "kysely_schema.ts"), schemas.join("\n\n"));
    console.log(`Exported: ` + chalk.green(`kysely_schema.ts`));
  } catch (e) {
    console.error(e);
    console.log(chalk.yellow(`Error exporting schemas to kysely_schema.ts`));
  }

  console.log(chalk.green("✅ All tables exported successfully!"));
}

function processInsert(
  tables: Record<string, { columns: string[]; rows: (string | null)[][] }>,
  insertMatch: RegExpMatchArray,
  currentLine: string
) {
  if (!insertMatch[1] || !insertMatch[2]) return;
  const tableName = insertMatch[1];
  const columns = insertMatch[2].split(",").map((col) => col.trim().replace(/`/g, ""));

  if (!tables[tableName]) {
    tables[tableName] = { columns, rows: [] };
  }

  let valuesPart = currentLine.split("VALUES")[1];
  if (valuesPart) {
    valuesPart = valuesPart.replace(new RegExp(`^${breakWord}\\(`), "");
    const regex = new RegExp("\\)," + breakWord + "\\(");
    let valueGroups = valuesPart
      .split(regex)
      .map((row) => row.trim().replace(/^\(/, "").replace(/\);?$/, "").split(",").map(cleanValue));
    tables[tableName]!.rows.push(...valueGroups);
  }
}

const typeMapping: Record<string, string> = {
  int: "number",
  "int unsigned": "number",
  varchar: "string",
  mediumtext: "string",
  text: "string",
  longtext: "string",
  datetime: "Date",
  timestamp: "Date",
  float: "number",
  double: "number",
  decimal: "number",
  boolean: "boolean"
};

function processSchema(statement: string) {
  const cleanLine = statement.trim();
  let tableName = "";
  const columns: string[] = [];
  const interfaceLines: string[] = [];
  const uniqueConstraints: string[] = [];
  const tableMatch = cleanLine.match(tableRegex);
  if (tableMatch && tableMatch[1]) {
    tableName = tableMatch[1];
  } else {
    return;
  }
  const columnRegex = /`(\w+)` (\w+)(\([\d,]+\))?( unsigned)?( NOT NULL)?( DEFAULT ([^,]+))?/g;
  let columnMatch;
  while ((columnMatch = columnRegex.exec(cleanLine)) !== null) {
    if (columnMatch) {
      let [, columnName, type, size, unsigned, notNull, , defaultValue] = columnMatch;
      if (columnName && type) {
        const tsColumnName = /^\d/.test(columnName) ? `"${columnName}"` : columnName;
        let tsType = "string";
        let mappedType = typeMapping[type.toLowerCase()];
        if (mappedType) {
          tsType = mappedType;
        }
        if (!notNull) {
          tsType += " | null";
        }
        columns.push(tsColumnName);
        interfaceLines.push(
          `  ${tsColumnName}: ${tsType}; // ${type}${size || ""}${unsigned || ""}${notNull || ""}${defaultValue ? " DEFAULT " + defaultValue : ""}`
        );
      }
    }
  }
  const uniqueKeyRegex = /UNIQUE KEY `?(\w+)`? \(([^)]+)\)/g;
  let uniqueMatch;
  while ((uniqueMatch = uniqueKeyRegex.exec(cleanLine)) !== null) {
    if (uniqueMatch[2]) {
      const uniqueColumns = uniqueMatch[2].split(",").map((col) => col.trim().replace(/`/g, ""));
      uniqueConstraints.push(`  UNIQUE: [${uniqueColumns.map((col) => `"${col}"`).join(", ")}],`);
    }
  }
  const primaryKeyRegex = /PRIMARY KEY \(([^)]+)\)/;
  if (primaryKeyRegex.test(cleanLine)) {
    const primaryKeyColumns = cleanLine.match(primaryKeyRegex);
    if (primaryKeyColumns && primaryKeyColumns[1]) {
      const primaryColumns = primaryKeyColumns[1].split(",").map((col) => col.trim().replace(/`/g, ""));
      uniqueConstraints.push(`  PRIMARY KEY: [${primaryColumns.map((col) => `"${col}"`).join(", ")}],`);
    }
  }

  if (tableName && columns.length > 0) {
    const unique =
      uniqueConstraints.length > 0 ? uniqueConstraints.map((constraint) => `// ${constraint}`).join("\n") : "";
    const kyselySchema = `${unique}\nexport interface ${tableName} {\n${interfaceLines.join("\n")}\n}`;
    return kyselySchema;
  }
  return "";
}
