import * as path from "path";
import BetterSqlite3 from "better-sqlite3";
import { promises as fs } from "fs";
import { Kysely, Migrator, SqliteDialect, FileMigrationProvider } from "kysely";
import { Database } from "../types.js";
import logger from "../error-logger.js";

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
This will apply all the migrations that haven't been applied yet.  You don't need to run this script manually, as it will run on server startup. To upgrade a major version, you need to run `yarn tsx migrate.ts up --force`.
To roll back the migrations, you can run `yarn tsx migrate.ts down`. The up command will apply all the migrations, and the down command will roll back the last migration.
4. Make sure to update the Database types in server/src/types.ts to match the new schema as well as documenting the change in database.ts. This will ensure that the queries in the server code are type-safe.
*/

function getMajorVersion(migrationName: string | null): number {
  if (!migrationName) {
    return 0;
  }
  const match = migrationName.match(/^v?(\d+)\.\d+\.\d+$/); // Account for 'v' prefix
  return match && match[1] ? parseInt(match[1], 10) : 0;
}

async function migrateToLatest(force: boolean = false) {
  const db = new Kysely<Database>({
    dialect: new SqliteDialect({
      database: new BetterSqlite3(path.join("src", "db", "TSC.db"))
    })
  });

  try {
    const migrationFolder = new URL("migrations", import.meta.url).pathname;

    const migrations = (await fs.readdir(migrationFolder))
      .filter((file) => file.endsWith(".js"))
      .sort((a, b) => a.localeCompare(b)); // Sort by filename alphabetically

    const migrator = new Migrator({
      db,
      provider: new FileMigrationProvider({
        fs,
        path,
        migrationFolder
      })
    });

    // Get the applied migrations
    const appliedMigrations = (await migrator.getMigrations())
      .filter((migration) => migration.executedAt !== undefined)
      .map((migration) => migration.name);

    // Get the latest applied migration (if any)
    const lastAppliedMigration = appliedMigrations?.[appliedMigrations.length - 1] || null;

    const lastMajorVersion = getMajorVersion(lastAppliedMigration);

    // Find unapplied migrations grouped by major version
    const unappliedMigrations = migrations
      .map((migration) => migration.replace(/\.js$/, "")) // Remove .js extension
      .filter((migration) => !appliedMigrations.includes(migration));

    const migrationsToApply: string[] = [];
    for (const migration of unappliedMigrations) {
      const nextMajorVersion = getMajorVersion(migration);

      if (nextMajorVersion > lastMajorVersion) {
        if (!force) {
          logger.error(`Major version change detected: ${lastMajorVersion} -> ${nextMajorVersion}`);
          logger.error(
            `Skipping migration "${migration}". Please review the migration and apply it manually with flag --force.`
          );
          break;
        }
      }

      // Collect migrations within the same major version or with force
      if (nextMajorVersion === lastMajorVersion || force) {
        migrationsToApply.push(migration);
      }
    }

    if (migrationsToApply.length === 0) {
      console.log("No compatible migrations to apply.");
      await db.destroy();
      return;
    }

    for (const migration of migrationsToApply) {
      const { error } = await migrator.migrateUp(); // Migrate one step up
      if (error) {
        console.error(`failed to execute migration "${migration}"`);
        console.error(error);
        process.exit(1);
      } else {
        console.log(`migration "${migration}" was executed successfully`);
      }
    }
  } finally {
    await db.destroy();
  }
}

async function rollback() {
  const db = new Kysely<Database>({
    dialect: new SqliteDialect({
      database: new BetterSqlite3("TSC.db")
    })
  });
  try {
    const migrationFolder = new URL("migrations", import.meta.url).pathname;

    const migrator = new Migrator({
      db,
      provider: new FileMigrationProvider({
        fs,
        path,
        migrationFolder
      })
    });

    // Get applied migrations
    const appliedMigrations = (await migrator.getMigrations())
      .filter((migration) => migration.executedAt !== undefined)
      .map((migration) => migration.name);

    // Get the latest applied migration
    const lastAppliedMigration = appliedMigrations[appliedMigrations.length - 1] || null;
    const lastMajorVersion = getMajorVersion(lastAppliedMigration);

    const previousMigration = appliedMigrations[appliedMigrations.length - 2] || null;

    if (previousMigration) {
      const previousMajorVersion = getMajorVersion(previousMigration);

      if (previousMajorVersion < lastMajorVersion) {
        logger.error(
          `Rollback involves a major version downgrade: ${lastMajorVersion} -> ${previousMajorVersion}. Operation aborted.`
        );
        process.exit(1); // Prevent rollback
      }
    }

    // Proceed with rollback
    const { results, error } = await migrator.migrateDown();

    if (error) {
      logger.error("Failed to rollback:");
      logger.error(error);
      process.exit(1);
    }

    results?.forEach((it) => {
      if (it.status === "Success") {
        console.log(`Rollback of migration "${it.migrationName}" was executed successfully.`);
      } else if (it.status === "Error") {
        logger.error(`Failed to rollback migration "${it.migrationName}".`);
      }
    });
  } finally {
    await db.destroy();
  }
}

const command = process.argv[2];
const flag = process.argv[3];

if (command === "up") {
  migrateToLatest(flag == "--force");
} else if (command === "down") {
  rollback();
} else {
  console.log('Please specify "up" for migrations or "down" for rollbacks');
}
