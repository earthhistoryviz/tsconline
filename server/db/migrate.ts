import * as path from "path";
import BetterSqlite3 from "better-sqlite3";
import { promises as fs } from "fs";
import { Kysely, Migrator, SqliteDialect, FileMigrationProvider } from "kysely";
import { Database } from "../dist/types.js";
import semver from "semver";

/*
IMPORTANT: Exercise extreme caution when performing migrations that delete data. Always ensure a backup of the database exists before running such migrations, as the data deletion is irreversible. 
The migration script is executed automatically upon server startup. If you need an example on alterations that can delete data, see 2024.09.17-10.58.43-drop-unique-constraint-for-workshop-title.ts.

Database migrations are essential for managing schema changes over time without the need for manually entering SQL commands on the server. Without this you would need to run ALTER TABLE commands manually.
Locally, it is easy to just delete your db file and start fresh, but in production, this is not an option.
This is particularly important for the dev server where dropping or recreating the database is impractical due to the loss of existing data.
Instead, we can write a migration file that contains the SQL commands to update the database schema. Then, we can run a script that will apply all the migrations to the database. 
This script will run on server startup, so the database schema will always be up to date.
Another advantage of migrations is that they allow us to roll back changes to the database schema if something goes wrong.

Note: Migrations in the migrations folder are executed in the order of their filenames (sorted by timestamp) and should be considered immutable once they are applied. 
Once pushed to main, they should not be modified. Each migration depends on the previous migrations being applied in order to work correctly. Changing one means potentially breaking all subsequent migrations.

Steps to do this:
1. Run ./migrationTemplate.sh <migration-name> to create a new migration file in the migrations folder. It will add a SemVer prefix to the name. Patch version is incremented by default. To increment the minor version, add minor to the command. To increment the major version, add major to the command.
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

  const migrationFolder = new URL("migrations", import.meta.url).pathname;

  // Fetch and sort migrations, handling both old (timestamp-based) and new (semver-based) filenames
  const files = await fs.readdir(migrationFolder);

  const migrations = files
    .filter(
      (file) => /^\d{4}\.\d{2}\.\d{2}-\d{2}\.\d{2}\.\d{2}-.*\.ts$/.test(file) || /^\d+\.\d+\.\d+-.*\.ts$/.test(file)
    ) // Match both patterns
    .sort((a, b) => {
      const isOldA = /^\d{4}\.\d{2}\.\d{2}-/.test(a);
      const isOldB = /^\d{4}\.\d{2}\.\d{2}-/.test(b);

      // Handle sorting for old (timestamp-based) and new (semver-based) formats
      if (isOldA && isOldB) {
        return a.localeCompare(b); // Sort old files lexicographically
      } else if (!isOldA && !isOldB) {
        return semver.compare(a.split("-")[0], b.split("-")[0]); // Sort semver files
      } else {
        return isOldA ? -1 : 1; // Old files come before new files
      }
    });

  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder
    })
  });

  // Get the applied migrations
  const appliedMigrations = await migrator.getMigrations();

  // Get the latest applied migration (if any)
  const lastAppliedMigration = appliedMigrations?.[appliedMigrations.length - 1]?.name || null;

  let lastMajorVersion = 0;

  if (lastAppliedMigration) {
    const match = lastAppliedMigration.match(/^(\d+)\.\d+\.\d+-/);
    if (match) {
      lastMajorVersion = parseInt(match[1], 10); // Extract the major version
    }
  }

  const nextMigration = migrations.find((migration) => !appliedMigrations.some((applied) => applied.name === migration));

  if (nextMigration) {
    const match = nextMigration.match(/^(\d+)\.\d+\.\d+-/);
    if (match) {
      const nextMajorVersion = parseInt(match[1], 10); // Extract the major version of the next migration

      if (nextMajorVersion > lastMajorVersion) {
        console.error(`Major version change detected: ${lastMajorVersion} -> ${nextMajorVersion}`);
        console.error("Please review the migration and apply it manually.");
        process.exit(1); // Exit the process to enforce manual migration
      }
    }
  }

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

  const migrationFolder = new URL("migrations", import.meta.url).pathname;

  // Fetch and sort migrations, handling both old (timestamp-based) and new (semver-based) filenames
  const files = await fs.readdir(migrationFolder);

  const migrations = files
    .filter(
      (file) => /^\d{4}\.\d{2}\.\d{2}-\d{2}\.\d{2}\.\d{2}-.*\.ts$/.test(file) || /^\d+\.\d+\.\d+-.*\.ts$/.test(file)
    ) // Match both patterns
    .sort((a, b) => {
      const isOldA = /^\d{4}\.\d{2}\.\d{2}-/.test(a);
      const isOldB = /^\d{4}\.\d{2}\.\d{2}-/.test(b);

      // Handle sorting for old (timestamp-based) and new (semver-based) formats
      if (isOldA && isOldB) {
        return b.localeCompare(a); // Reverse lexicographical order for rollback
      } else if (!isOldA && !isOldB) {
        return semver.compare(b.split("-")[0], a.split("-")[0]); // Reverse semver order
      } else {
        return isOldA ? 1 : -1; // Old files come after new files for rollback
      }
    });

  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder
    })
  });

  // Get applied migrations
  const appliedMigrations = await migrator.getMigrations();

  // Get the latest applied migration
  const lastAppliedMigration = appliedMigrations[appliedMigrations.length - 1]?.name;

  if (lastAppliedMigration) {
    const match = lastAppliedMigration.match(/^(\d+)\.\d+\.\d+-/);
    const lastMajorVersion = match ? parseInt(match[1], 10) : 0;

    // Get the migration to be rolled back
    const nextRollbackMigration = migrations.find((migration) =>
      appliedMigrations.some((applied) => applied.name === migration)
    );

    if (nextRollbackMigration) {
      const nextMatch = nextRollbackMigration.match(/^(\d+)\.\d+\.\d+-/);
      const nextMajorVersion = nextMatch ? parseInt(nextMatch[1], 10) : 0;

      // Check if rollback involves a major version downgrade
      if (nextMajorVersion < lastMajorVersion) {
        console.error(
          `Rollback would involve a major version downgrade: ${lastMajorVersion} -> ${nextMajorVersion}.`
        );
        console.error("Please review and perform this rollback manually.");
        process.exit(1); // Exit the process to enforce manual rollback
      }
    }
  }

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
