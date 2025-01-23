import Database, { Database as DatabaseType } from "better-sqlite3";
import path, { join } from "path";
import { readFile } from "fs/promises";
import { CompiledQuery, Kysely, SqliteDialect, sql } from "kysely";
import BetterSqlite3 from "better-sqlite3";


let londonDb: Kysely<DatabaseType>;

async function setupDatabaseWithSQLFile() {
    // Open or create the SQLite database
    const db = new Database('my_database.db');

    // Path to your SQL file
    const sqlFilePath = path.join("db", "london.sql");

    try {
        // Read the SQL file
        const sql = await readFile(sqlFilePath, 'utf8');
        let sqliteSchema = sql;
        sqliteSchema = sqliteSchema.replace(/^SET .*?;/gm, '');

        // Remove ENGINE and CHARSET options
        sqliteSchema = sqliteSchema.replace(/ENGINE=\w+\s?/, '');
        sqliteSchema = sqliteSchema.replace(/CHARSET=\w+/g, '');

        // Replace AUTO_INCREMENT with AUTOINCREMENT
        sqliteSchema = sqliteSchema.replace(/\bAUTO_INCREMENT\b/g, 'AUTOINCREMENT');

        // Replace UNSIGNED integers
        sqliteSchema = sqliteSchema.replace(/\bINT UNSIGNED\b/g, 'INTEGER');
        sqliteSchema = sqliteSchema.replace(/\bTINYINT\b/g, 'INTEGER');

        // Replace VARCHAR with TEXT (SQLite does not differentiate size)
        sqliteSchema = sqliteSchema.replace(/\bVARCHAR\(\d+\)/g, 'TEXT');

        // Replace MySQL comments (#) with SQLite comments (--)
        sqliteSchema = sqliteSchema.replace(/^#.*$/gm, '--');
        // Execute the SQL schema
        db.exec(sqliteSchema);

        console.log('Database schema executed successfully!');
    } catch (error) {
        console.error('Error executing database schema:', error);
    } finally {
        db.close(); // Close the database connection
    }
}

export async function initializeLondonDatabase() {
    await setupDatabaseWithSQLFile();
    londonDb = new Kysely<DatabaseType>({
        dialect: new SqliteDialect({
        database: new BetterSqlite3(path.join("db", "london.db"))
        })
    });
    // await executeSqlFile();
    // await printAllRows();
    // await seeAllTables();
    londonDb.destroy();
}

async function printAllRows() {
    const rows = await londonDb.executeQuery(sql`SELECT * FROM CPdinos` as unknown as CompiledQuery);
    console.log(rows);
}
async function seeAllTables() {
    const tables = await londonDb.introspection.getTables();
    console.log(tables.map((table) => table.name));
}

async function executeSqlFile() {
    const fileContents = await readFile(join("db", "london.sql"), "utf-8");
    if (fileContents.length === 0) {
        return;
    }
    const queries = fileContents
      .split(';')
      .map((query) => query.trim())
      .filter((query) => query.length > 0);
    for (const query of queries) {
    console.log(`Executing query: ${query}`);
    await londonDb.executeQuery(sql.raw(query) as unknown as CompiledQuery);
    }
}

await initializeLondonDatabase();