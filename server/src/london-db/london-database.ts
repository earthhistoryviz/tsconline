import { access, mkdir, rm } from "fs/promises";
import { Kysely, SqliteDialect } from "kysely";
import BetterSqlite3 from "better-sqlite3";
import { join } from "path";
import chalk from "chalk";
import { convertSQLDumpToCSV } from "./dump-to-csv.js";
import { importAllTables } from "./csv-to-sqlite.js";
import { LondonDatabase } from "../types";

const londonDBFilePath = join("db", "london", "london.db");
const londonDBDir = join("db", "london");
export const outputCSVDir = join("db", "london", "output_csvs");
export const sqlDump = join("db", "london", "london.sql");

export let londonDb: Kysely<LondonDatabase>;

export async function initializeLondonDatabase() {
  try {
    await access(outputCSVDir);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      mkdir(outputCSVDir, { recursive: true });
    } else {
      throw e;
    }
  }
  try {
    await access(londonDBDir);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      console.log("London database directory does not exist. Creating it now...");
      await mkdir(londonDBDir, { recursive: true });
    }
  }
  londonDb = new Kysely<LondonDatabase>({
    dialect: new SqliteDialect({
      database: new BetterSqlite3(londonDBFilePath)
    })
  });
  await londonDb.schema
    .createTable("cpdinos")
    .ifNotExists()
    .addColumn("id", "integer", (col) => col.primaryKey().notNull())
    .addColumn("Taxon", "text", (col) => col.unique())
    .addColumn("citation", "text", (col) => col.defaultTo(null))
    .addColumn("basionym", "text", (col) => col.defaultTo(""))
    .addColumn("synonyms", "text", (col) => col.defaultTo(null))
    .addColumn("type_species", "text", (col) => col.defaultTo(null))
    .addColumn("tax_rank", "text", (col) => col.defaultTo(null))
    .addColumn("tax_rank_sorter", "integer", (col) => col.defaultTo(null))
    .addColumn("weight", "integer", (col) => col.defaultTo(0))
    .addColumn("EURA_number", "text", (col) => col.defaultTo(null))
    .addColumn("diagnosis", "text", (col) => col.defaultTo(null))
    .addColumn("FCPD_weblink", "text", (col) => col.defaultTo(null))
    .addColumn("3D_scanning", "text", (col) => col.defaultTo(null))
    .addColumn("strat_notes", "text", (col) => col.defaultTo(null))
    .addColumn("lad_text", "text", (col) => col.defaultTo(null))
    .addColumn("fad_text", "text", (col) => col.defaultTo(null))
    .addColumn("Age_Ma", "integer", (col) => col.defaultTo(null))
    .addColumn("Subject", "text", (col) => col.defaultTo(null))
    .addColumn("Construction", "text", (col) => col.defaultTo(null))
    .addColumn("Conservation", "text", (col) => col.defaultTo(null))
    .addColumn("Cons_summary", "text", (col) => col.defaultTo(null))
    .addColumn("review2022", "text", (col) => col.defaultTo(null))
    .addColumn("review2023", "text", (col) => col.defaultTo(null))
    .addColumn("refs", "text", (col) => col.defaultTo(null))
    .addColumn("refs_linked", "text", (col) => col.defaultTo(null))
    .addColumn("Parent", "text", (col) => col.defaultTo(null))
    .addColumn("detached_from", "text", (col) => col.defaultTo(null))
    .addColumn("detached_from_id", "text", (col) => col.defaultTo(null))
    .addColumn("table_header", "text", (col) => col.defaultTo(null))
    .addColumn("table_caption", "text", (col) => col.defaultTo(null))
    .addColumn("path", "text", (col) => col.defaultTo(null))
    .addColumn("path_flag", "text", (col) => col.defaultTo(null))
    .addColumn("last_edit", "text", (col) => col.defaultTo(null))
    .execute();

  await londonDb.schema
    .createTable("cpdinosIcons")
    .ifNotExists()
    .addColumn("file_name", "text", (col) => col.defaultTo("").notNull())
    .addColumn("file_module", "text", (col) => col.defaultTo(null))
    .addColumn("taxon", "text", (col) => col.defaultTo("").notNull())
    .addColumn("module", "text", (col) => col.defaultTo("").notNull())
    .addColumn("rating", "integer", (col) => col.defaultTo(null))
    .addPrimaryKeyConstraint("cpdinosIconsPrimaryKey", ["file_name", "taxon", "module"])
    .execute();

  await londonDb.schema
    .createTable("cpdinosImages")
    .ifNotExists()
    .addColumn("file_name", "text", (col) => col.defaultTo("").notNull().primaryKey())
    .addColumn("image_type", "text", (col) => col.defaultTo(null))
    .addColumn("species_f", "text", (col) => col.defaultTo(null))
    .addColumn("taxon_id", "integer", (col) => col.defaultTo(null))
    .addColumn("caption", "text", (col) => col.defaultTo(null))
    .addColumn("type_status", "text", (col) => col.defaultTo(null))
    .addColumn("location", "text", (col) => col.defaultTo(null))
    .addColumn("sample", "text", (col) => col.defaultTo(null))
    .addColumn("geol_age", "text", (col) => col.defaultTo(null))
    .addColumn("search_age", "text", (col) => col.defaultTo(null))
    .addColumn("rating", "real", (col) => col.defaultTo(null))
    .addColumn("source", "text", (col) => col.defaultTo(null))
    .addColumn("source-old", "text", (col) => col.defaultTo(null))
    .addColumn("source_refno", "integer", (col) => col.defaultTo(null))
    .addColumn("notes", "text", (col) => col.defaultTo(null))
    .addColumn("lat_long", "text", (col) => col.defaultTo(null))
    .addColumn("latitude", "real", (col) => col.defaultTo(null))
    .addColumn("longitude", "real", (col) => col.defaultTo(null))
    .addColumn("water_depth", "text", (col) => col.defaultTo(null))
    .addColumn("collection_details", "text", (col) => col.defaultTo(null))
    .addColumn("path", "text", (col) => col.defaultTo(null))
    .addColumn("path_flag", "text", (col) => col.defaultTo(null))
    .addColumn("width", "integer", (col) => col.defaultTo(null))
    .addColumn("height", "text", (col) => col.defaultTo(null))
    .addColumn("capture_date", "text", (col) => col.defaultTo(null))
    .addColumn("display_field", "text", (col) => col.defaultTo(null))
    .addColumn("uploaded", "text", (col) => col.defaultTo(null))
    .execute();

  await londonDb.schema
    .createTable("cpdinosReflinks")
    .ifNotExists()
    .addColumn("id", "integer", (col) => col.primaryKey().notNull())
    .addColumn("refno", "integer", (col) => col.defaultTo(null))
    .addColumn("taxon_id", "integer", (col) => col.defaultTo(null))
    .addColumn("category", "text", (col) => col.defaultTo(""))
    .execute();

  await londonDb.schema
    .createTable("cpdinosRefs")
    .ifNotExists()
    .addColumn("refno", "integer", (col) => col.primaryKey().notNull())
    .addColumn("abv_ref", "text", (col) => col.defaultTo(null))
    .addColumn("authors", "text", (col) => col.defaultTo(null))
    .addColumn("year", "integer", (col) => col.defaultTo(null))
    .addColumn("disambig", "text", (col) => col.defaultTo(null))
    .addColumn("title", "text", (col) => col.defaultTo(null))
    .addColumn("journal", "text", (col) => col.defaultTo(null))
    .addColumn("journalid", "integer", (col) => col.defaultTo(null))
    .addColumn("series", "text", (col) => col.defaultTo(null))
    .addColumn("vol", "text", (col) => col.defaultTo(null))
    .addColumn("part", "text", (col) => col.defaultTo(null))
    .addColumn("firstP", "text", (col) => col.defaultTo(null))
    .addColumn("lastP", "text", (col) => col.defaultTo(null))
    .addColumn("publisher", "text", (col) => col.defaultTo(""))
    .addColumn("notes", "text", (col) => col.defaultTo(null))
    .addColumn("language", "text", (col) => col.defaultTo(null))
    .addColumn("editors", "text", (col) => col.defaultTo(null))
    .addColumn("vol_title", "text", (col) => col.defaultTo(null))
    .addColumn("ref_type", "text", (col) => col.defaultTo(null))
    .addColumn("DOI", "text", (col) => col.defaultTo(null))
    .addColumn("pdf_name", "text", (col) => col.defaultTo(null))
    .addColumn("pdf_path", "text", (col) => col.defaultTo(null))
    .addColumn("pdf_size", "integer", (col) => col.defaultTo(null))
    .addColumn("pdf_shareable", "text", (col) => col.defaultTo(null))
    .addColumn("pdf_quality", "text", (col) => col.defaultTo(null))
    .addColumn("pdf_upload_date", "text", (col) => col.defaultTo(null))
    .addColumn("full_ref", "text", (col) => col.defaultTo(null))
    .execute();

  console.log(chalk.cyan("London database initialized successfully!"));
  try {
    await access(sqlDump);
  } catch (e) {
    console.log(chalk.red("SQL dump file not found"));
    process.exit(1);
  }
  await convertSQLDumpToCSV(sqlDump);
  console.log(chalk.green("London database CSVs exported successfully!"));
  await importAllTables();
  console.log(chalk.green("✅London database imported successfully!"));
}

await rm(londonDBFilePath).catch(() => {});
try {
  await initializeLondonDatabase();
} catch (e) {
  console.error(e);
  console.log(chalk.red("Error initializing London database"));
  process.exit(1);
}
