import * as path from "path";
import BetterSqlite3 from "better-sqlite3";
import { promises as fs } from "fs";
import { Kysely, Migrator, SqliteDialect, FileMigrationProvider } from "kysely";
import { Database } from "../dist/types.js";

/*
!!!BE EXTREMELY CAREFUL WITH MIGRATIONS THAT DELETE DATA. ENSURE YOU HAVE A BACKUP OF THE DATABASE BEFORE RUNNING MIGRATIONS THAT DELETE DATA AS INFORMATION WILL BE LOST AND THE MIGRATION SCRIPT IS AUTOMATICALLY APPLIED ON SERVER STARTUP.!!!

Migrations are a way to manage changes to the database schema over time. Especially for the server, we don't want to manually enter the SQL commands to update the database schema every time we make a change while not losing the data in the database. 
Instead, we can write a migration file that contains the SQL commands to update the database schema. Then, we can run a script that will apply all the migrations to the database. This script will run on server startup, so the database schema will always be up to date.
Another advantage of migrations is that they allow us to roll back changes to the database schema if something goes wrong.
Steps to do this:
1. Run ./migrationTemplate.sh <migration-name> to create a new migration file in the migrations folder. It will add the current timestamp to the filename.
2. Write the SQL commands to update the database schema in the up function of the migration file. There is also a down function that contains the SQL commands to roll back the changes. There is migration file you can copy from in the migrations folder.
3. (Mostly Optional) Run the migrate.ts script to apply the migrations to the database. You can run it with the command `yarn tsx migrate.ts up`. This will apply all the migrations that haven't been applied yet. 
You don't need to run this script manually, as it will run on server startup. To roll back the migrations, you can run `yarn tsx migrate.ts down`. The up command will apply all the migrations, and the down command will roll back the last migration.
4. Make sure to update the types in the Database type in server/src/types.ts to match the new schema. This will ensure that the queries in the server code are type-safe.
*/

export async function migrateToLatest() {
  const db = new Kysely<Database>({
    dialect: new SqliteDialect({
      database: new BetterSqlite3("TSC.db")
    })
  });

  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      // This needs to be an absolute path.
      migrationFolder: path.join(process.cwd(), "migrations")
    })
  });

  const { error, results } = await migrator.migrateToLatest();

  results?.forEach((it) => {
    if (it.status === "Success") {
      console.log(`migration "${it.migrationName}" was executed successfully`);
    } else if (it.status === "Error") {
      console.error(`failed to execute migration "${it.migrationName}"`);
    }
  });

  if (error) {
    console.error("failed to migrate");
    console.error(error);
    process.exit(1);
  }

  await db.destroy();
}

async function rollback() {
  const db = new Kysely<Database>({
    dialect: new SqliteDialect({
      database: new BetterSqlite3("TSC.db")
    })
  });

  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(process.cwd(), "migrations")
    })
  });

  const { error, results } = await migrator.migrateDown();

  results?.forEach((it) => {
    if (it.status === "Success") {
      console.log(`rollback of migration "${it.migrationName}" was executed successfully`);
    } else if (it.status === "Error") {
      console.error(`failed to rollback migration "${it.migrationName}"`);
    }
  });

  if (error) {
    console.error("failed to rollback");
    console.error(error);
    process.exit(1);
  }

  await db.destroy();
}

if (new URL(import.meta.url).pathname === process.argv[1]) {
  const command = process.argv[2];

  if (command === "up") {
    migrateToLatest();
  } else if (command === "down") {
    rollback();
  } else {
    console.log('Please specify "up" for migrations or "down" for rollbacks');
  }
}
