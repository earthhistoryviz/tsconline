import * as path from "path";
import BetterSqlite3 from "better-sqlite3";
import { promises as fs } from "fs";
import { Kysely, Migrator, SqliteDialect, FileMigrationProvider } from "kysely";
import { Database } from "../dist/types.js";
import { fileURLToPath, pathToFileURL } from "url";

/*
IMPORTANT: Exercise extreme caution when performing migrations that delete data. Always ensure a backup of the database exists before running such migrations, as the data deletion is irreversible. 
The migration script is executed automatically upon server startup. If you need an example on alterations that can delete data, see 2024.05.08-17.59.45-adjust-columns-in-verification-table.ts.

Database migrations are essential for managing schema changes over time without the need for manually entering SQL commands on the server. Without this you would need to run ALTER TABLE commands manually.
Locally, it is easy to just delete your db file and start fresh, but in production, this is not an option.
This is particularly important for the dev server where dropping or recreating the database is impractical due to the loss of existing data.
Instead, we can write a migration file that contains the SQL commands to update the database schema. Then, we can run a script that will apply all the migrations to the database. 
This script will run on server startup, so the database schema will always be up to date.
Another advantage of migrations is that they allow us to roll back changes to the database schema if something goes wrong.

Note: Migrations in the migrations folder are executed in the order of their filenames (sorted by timestamp) and should be considered immutable once they are applied. 
Once pushed to main, they should not be modified. Each migration depends on the previous migrations being applied in order to work correctly. Changing one means potentially breaking all subsequent migrations.

Steps to do this:
1. Run ./migrationTemplate.sh <migration-name> to create a new migration file in the migrations folder. It will add the current timestamp to the filename.
2. Write the SQL commands to update the database schema in the up function of the migration file. There is also a down function that contains the SQL commands to roll back the changes. 
Look at examples in the migrations folder to understand what your commands should look like.
3. (Mostly Optional) Run the migrate.ts script to apply the migrations to the database. You can run it with the command `yarn tsx migrate.ts up`. 
This will apply all the migrations that haven't been applied yet.  You don't need to run this script manually, as it will run on server startup. 
To roll back the migrations, you can run `yarn tsx migrate.ts down`. The up command will apply all the migrations, and the down command will roll back the last migration.
4. Make sure to update the Database types in server/src/types.ts to match the new schema as well as documenting the change in database.ts. This will ensure that the queries in the server code are type-safe.
*/

async function migrateToLatest() {
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
      migrationFolder: new URL("migrations", import.meta.url).pathname
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
      migrationFolder: new URL("migrations", import.meta.url).pathname
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

const command = process.argv[2];

if (command === "up") {
  migrateToLatest();
} else if (command === "down") {
  rollback();
} else {
  console.log('Please specify "up" for migrations or "down" for rollbacks');
}
