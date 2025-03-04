import * as readline from "readline";
import { createReadStream } from "fs";
import chalk from "chalk";
import { join } from "path";
import { mkdir, writeFile } from "fs/promises";
import { verifyFilepath } from "../../util.js";

const outputDir = join("db", "london", "output");
const schemaFile = join("src", "db", "london", "schema.ts");

const tableRegex = /CREATE TABLE `?(\w+)`? \(/;
const insertRegex = /^INSERT INTO `?(\w+)`? \(([^)]+)\)/i;

const cleanValue = (value: string) => {
  if (value === "NULL") return null;
  return value.trim().replace(/^'|'$/g, '"').replace(/\\'/g, "'");
};

export async function convertSQLDumpToJSON(dumpFile: string) {
  if (!(await verifyFilepath(dumpFile))) {
    console.log(chalk.red("SQL dump file not found please check the path"));
    return;
  }
  const fileStream = createReadStream(dumpFile);
  fileStream.on("error", (e) => {
    console.error(e);
  });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
  await mkdir(outputDir, { recursive: true });

  const tables: Record<string, { columns: string[]; rows: (string | null)[][] }> = {};
  const schemas: string[] = [];
  const assertFunctions: string[] = [];

  // parsing create table variables
  let interfaceLines: string[] = [];
  let uniqueConstraints: string[] = [];
  let schemaTableName = "";
  let parsingCreateTable = false;

  // parsing insert into variables
  let currentInsertTableName = "";
  let parsingInsertInto = false;

  try {
    // we have to process line by line because the file is too big to read at once
    for await (let line of rl) {
      line = line.trim();
      const tableHeaderMatch = line.match(tableRegex);
      const insertIntoMatch = line.match(insertRegex);
      // end parsing
      if (line.endsWith(";")) {
        if (parsingCreateTable) {
          const { kyselySchema, assertFunction } = processSchemaAndAssert(
            interfaceLines,
            uniqueConstraints,
            schemaTableName
          );
          schemas.push(kyselySchema);
          assertFunctions.push(assertFunction);
          interfaceLines = [];
          uniqueConstraints = [];
          parsingCreateTable = false;
        } else if (parsingInsertInto) {
          currentInsertTableName = "";
          parsingInsertInto = false;
        }
        parsingInsertInto = false;
        parsingCreateTable = false;
      } else if (tableHeaderMatch && tableHeaderMatch[1]) {
        // start parsing a create table
        parsingCreateTable = true;
        schemaTableName = tableHeaderMatch[1];
        uniqueConstraints = [];
        interfaceLines = [];
        parsingInsertInto = false;
      } else if (parsingCreateTable) {
        processSchemaLine(line, interfaceLines, uniqueConstraints);
      } else if (insertIntoMatch && insertIntoMatch[1] && insertIntoMatch[2]) {
        parsingInsertInto = true;
        parsingCreateTable = false;
        currentInsertTableName = insertIntoMatch[1];
        const columns = insertIntoMatch[2].split(",").map((col) => col.trim().replace(/`/g, ""));
        if (!tables[currentInsertTableName]) {
          tables[currentInsertTableName] = { columns, rows: [] };
        }
      } else if (parsingInsertInto && tables[currentInsertTableName]) {
        processInsertLine(tables[currentInsertTableName]!, line);
      }
    }
  } catch (e) {
    console.error(e);
    console.log(chalk.red("Error parsing SQL dump"));
    return;
  }
  console.log(chalk.green("SQL dump parsed successfully!"));

  // write the json
  for (const [table, { columns, rows }] of Object.entries(tables)) {
    try {
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
      await writeFile(join(outputDir, `${table}.json`), JSON.stringify(records, null, 2));
      console.log(chalk.cyan(`Exported: ${table}.json to ${outputDir}`));
    } catch (e) {
      console.error(e);
      console.log(chalk.yellow(`Error exporting ${table} to JSON`));
    }
  }

  try {
    // write the schemas
    await writeFile(
      schemaFile,
      'import { throwError } from "@tsconline/shared";\n\n'.concat(
        schemas.join("\n\n").concat("\n\n").concat(assertFunctions.join("\n\n"))
      )
    );
    console.log(chalk.cyan("Exported schemas to schema.ts"));
  } catch (e) {
    console.error(e);
    console.log(chalk.yellow(`Error exporting schemas to schema.ts`));
  }

  console.log(chalk.green("All tables exported successfully to JSON!"));
}

function processInsertLine(tables: { columns: string[]; rows: (string | null)[][] }, row: string) {
  if (!row.startsWith("(") || !/\)(;|,)?$/.test(row)) return;
  const trimmedRow = row
    .trim()
    .replace(/^\(/, "")
    .replace(/\)(;|,)?$/, "");
  const valueRegex = /'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|`((?:[^`\\]|\\.)*)`|([^,]+)/g;
  const arr: string[] = [];
  let match;
  while ((match = valueRegex.exec(trimmedRow)) !== null) {
    if (match[1] !== undefined) {
      arr.push(cleanValue(match[1])!);
    } else if (match[2] !== undefined) {
      arr.push(cleanValue(match[2])!);
    } else if (match[3] !== undefined) {
      arr.push(cleanValue(match[3])!);
    } else if (match[4] !== undefined) {
      arr.push(cleanValue(match[4])!);
    }
  }
  tables.rows.push(arr);
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

function processSchemaAndAssert(interfaceLines: string[], uniqueConstraints: string[], tableName: string) {
  const unique =
    uniqueConstraints.length > 0 ? uniqueConstraints.map((constraint) => `// ${constraint}`).join("\n") : "";
  const kyselySchema = `${unique}\nexport interface ${tableName} {\n${interfaceLines.join("\n")}\n}`;
  let assertFunction = `export function assert${tableName}(o: any): asserts o is ${tableName} {\n`;
  for (const line of interfaceLines) {
    const [key, type] = line.split(":").map((s) => s.trim());
    const typeWithoutComment = type?.split(";")[0];
    if (!key || !typeWithoutComment) continue;
    if (typeWithoutComment.includes("|")) {
      const types = typeWithoutComment.split("|").map((t) => t.trim());
      assertFunction += `\tif (!(${types.map((t) => `typeof o.${key} === "${t}"`).join(" || ")})) throwError("${tableName}", "${key}", "${types.join(" | ")}", o.${key});\n`;
    } else {
      assertFunction += `\tif (typeof o.${key} !== "${typeWithoutComment}") throwError("${tableName}", "${key}", "${typeWithoutComment}", o.${key});\n`;
    }
    assertFunction = assertFunction.replace(/=== "null"/g, "=== null");
  }
  assertFunction += "}";
  return { kyselySchema, assertFunction };
}

function processSchemaLine(statement: string, interfaceLines: string[], uniqueConstraints: string[]) {
  const cleanLine = statement.trim();
  const columnRegex = /`([\w-]+)` (\w+)(\([\d,]+\))?( unsigned)?( NOT NULL)?( DEFAULT ([^,]+))?/g;
  const columnMatch = columnRegex.exec(cleanLine);
  if (columnMatch) {
    const [, columnName, type, size, unsigned, notNull, , defaultValue] = columnMatch;
    if (columnName && type) {
      const tsColumnName = /^\d|\w+-\w+/.test(columnName) ? `"${columnName}"` : columnName;
      let tsType = "string";
      const mappedType = typeMapping[type.toLowerCase()];
      if (mappedType) {
        tsType = mappedType;
      }
      if (!notNull) {
        tsType += " | null";
      }
      interfaceLines.push(
        `  ${tsColumnName}: ${tsType}; // ${type}${size || ""}${unsigned || ""}${notNull || ""}${defaultValue ? " DEFAULT " + defaultValue : ""}`
      );
    }
  }
  const uniqueKeyRegex = /UNIQUE KEY `?(\w+)`? \(([^)]+)\)/g;
  const uniqueMatch = uniqueKeyRegex.exec(cleanLine);
  if (uniqueMatch && uniqueMatch[2]) {
    const uniqueColumns = uniqueMatch[2].split(",").map((col) => col.trim().replace(/`/g, ""));
    uniqueConstraints.push(`  UNIQUE: [${uniqueColumns.map((col) => `"${col}"`).join(", ")}],`);
  }
  const primaryKeyRegex = /PRIMARY KEY \(([^)]+)\)/;
  if (primaryKeyRegex.test(cleanLine)) {
    const primaryKeyColumns = cleanLine.match(primaryKeyRegex);
    if (primaryKeyColumns && primaryKeyColumns[1]) {
      const primaryColumns = primaryKeyColumns[1].split(",").map((col) => col.trim().replace(/`/g, ""));
      uniqueConstraints.push(`  PRIMARY KEY: [${primaryColumns.map((col) => `"${col}"`).join(", ")}],`);
    }
  }
}

try {
  await convertSQLDumpToJSON(join("db", "london", "london.sql"));
} catch (e) {
  console.error(e);
  console.log(chalk.red("Error converting SQL dump to JSON"));
}
