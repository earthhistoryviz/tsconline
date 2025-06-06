import mysql from "mysql2/promise";
import fs from "fs/promises";
import { join } from "path";
import "dotenv/config";

const londonDatabaseName = "nannodata_arkL";

const typeMap: Record<string, string> = {
  int: "number",
  bigint: "number",
  tinyint: "number",
  smallint: "number",
  mediumint: "number",
  float: "number",
  double: "number",
  decimal: "number",
  varchar: "string",
  char: "string",
  text: "string",
  tinytext: "string",
  mediumtext: "string",
  longtext: "string",
  date: "string",
  datetime: "string",
  timestamp: "string",
  time: "string",
  json: "any",
  boolean: "boolean",
  bit: "boolean"
};

async function generateInterfaces(connection: mysql.Connection) {
  const [tables]: [mysql.RowDataPacket[], mysql.FieldPacket[]] = await connection.execute(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = ?`,
    [londonDatabaseName]
  );

  const schemaFile = join("src", "db", "london", "schema.ts");

  let output = "";
  fs.writeFile(schemaFile, 'import { throwError } from "@tsconline/shared";\n\n');

  for (const row of tables) {
    const tableName = row.TABLE_NAME;
    const [columns]: [mysql.RowDataPacket[], mysql.FieldPacket[]] = await connection.execute(
      `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = ? AND table_name = ?`,
      [londonDatabaseName, tableName]
    );

    output = "";

    const interfaceName = tableName;
    output += `export interface ${interfaceName} {\n`;
    for (const col of columns) {
      const tsType = typeMap[col.DATA_TYPE] || "any";
      const nullable = col.IS_NULLABLE === "YES" ? " | null" : "";
      const colName = col.COLUMN_NAME.replace(/ /g, "_");
      output += `  ${colName}: ${tsType}${nullable};\n`;
    }
    output += `}\n\n`;

    // Generate assert function
    output += `export function assert${interfaceName}(o: any): asserts o is ${interfaceName} {\n`;
    output += `  if (typeof o !== 'object' || o === null) throw new Error('Expected object');\n`;

    for (const col of columns) {
      const tsType = typeMap[col.DATA_TYPE]!;
      const nullable = col.IS_NULLABLE === "YES";
      const colName = col.COLUMN_NAME.replace(/ /g, "_");
      output += makeAssertLine(interfaceName, colName, tsType, nullable) + "\n";
    }

    output += `}\n\n`;

    output += `export function assert${tableName}Array(o: any[]): asserts o is ${tableName}[] {\n`;
    output += `\tif (!Array.isArray(o)) throwError("${tableName}", "Array", "Array", o);\n`;
    output += `\tfor (const item of o) assert${tableName}(item);\n`;
    output += "}\n\n";

    await fs.appendFile(schemaFile, output);
  }
}

function makeAssertLine(interfaceName: string, name: string, tsType: string, nullable: boolean): string {
  const condition =
    tsType === "any"
      ? "typeof o." + name + ' === "undefined"'
      : nullable
        ? `o.${name} !== null && typeof o.${name} !== "${tsType}"`
        : `typeof o.${name} !== "${tsType}"`;

  return `    if (${condition}) throwError("${interfaceName}", "${name}", "${tsType}", o.${name});`;
}

function castValue(value: string | number, targetType: string) {
  if (value === null) return null;
  switch (targetType) {
    case "number":
      return Number(value);
    case "boolean":
      return Boolean(value);
    case "string":
      return String(value);
    default:
      return value;
  }
}

async function exportRowsToJson(connection: mysql.Connection) {
  const outputDir = join("db", "london", "output");
  const [tables]: [mysql.RowDataPacket[], mysql.FieldPacket[]] = await connection.execute(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = ?`,
    [londonDatabaseName]
  );

  await fs.mkdir(outputDir, { recursive: true });

  for (const row of tables) {
    const tableName = row.TABLE_NAME;

    // Get column metadata
    const [columns]: [mysql.RowDataPacket[], mysql.FieldPacket[]] = await connection.execute(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = ? AND table_name = ?`,
      [londonDatabaseName, tableName]
    );

    const columnTypes = Object.fromEntries(columns.map((col) => [col.COLUMN_NAME, typeMap[col.DATA_TYPE] || "any"]));

    // Query all rows
    const [rows]: [mysql.RowDataPacket[], mysql.FieldPacket[]] = await connection.execute(
      `SELECT * FROM \`${tableName}\``
    );

    const typedRows = rows.map((row) => {
      const typedRow: Record<string, number | boolean | string> = {};
      for (const key in row) {
        const targetType = columnTypes[key];
        typedRow[key] = castValue(row[key], targetType);
      }
      return typedRow;
    });

    const filePath = join(outputDir, `${tableName}.json`);
    await fs.writeFile(filePath, JSON.stringify(typedRows, null, 2), "utf-8");
    console.log(`Exported ${tableName} (${rows.length} rows)`);
  }
}

async function connectToDB() {
  try {
    const configCheck = {
      host: process.env.LONDON_DATABASE_HOST,
      port: process.env.LONDON_DATABASE_PORT,
      user: process.env.LONDON_DATABASE_USER,
      password: process.env.LONDON_DATABASE_PASSWORD
    };
    if (Object.values(configCheck).some((v) => v === undefined)) {
      throw "Cannot connect to server, missing env variable";
    }
    const config = {
      host: process.env.LONDON_DATABASE_HOST!,
      port: parseInt(process.env.LONDON_DATABASE_PORT!),
      user: process.env.LONDON_DATABASE_USER!,
      password: process.env.LONDON_DATABASE_PASSWORD!,
      database: londonDatabaseName
    };
    const connection = await mysql.createConnection(config);
    console.log("Connected to MySQL");

    await generateInterfaces(connection);
    console.log("Generated Schemas");

    await exportRowsToJson(connection);
    console.log("Generated JSON files");

    await connection.end();
  } catch (error) {
    console.error("MySQL connection error:");
    throw error;
  }
}

await connectToDB();
