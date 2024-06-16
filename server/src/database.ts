import { Database, User, NewUser, UpdatedUser, Verification, NewVerification } from "./types.js";
import BetterSqlite3 from "better-sqlite3";
import { Kysely, SqliteDialect } from "kysely";
import { exec } from "child_process";
import path from "path";

/*
If updating the database schema please update the schema details below.
Database Schema Details (Post-Migration):

- users Table:
  - userId (integer): Primary key, auto-increment.
  - username (text): Must be unique.
  - email (text): Must be unique.
  - hashedPassword (text): Must be unique, stores encrypted user passwords.
  - uuid (text): Non-nullable, must be unique, used for identifying a user's datapack folder.
  - pictureUrl (text): Must be unique, URL to the user's profile picture.
  - emailVerified (integer): Non-nullable, default is 0, indicates if the user's email has been verified.
  - invalidateSession (integer): Non-nullable, default is 0, flag for invalidating user sessions.

- verification Table:
  - id (integer): Primary key, auto-increment.
  - userId (integer): Non-nullable, links to the users table.
  - token (text): Non-nullable, must be unique, used for email verification or password reset.
  - expiresAt (datetime): Non-nullable, the expiration date/time of the token. Make sure to always use ISO 8601 format. Easy way to get this is by using new Date().toISOString().
  - reason (text): Non-nullable, describes the purpose of the token (e.g., 'email verification', 'password reset').

- ip Table:
  - id (integer): Primary key, auto-increment.
  - ip (text): Non-nullable, must be unique, stores the user's IP address.
  - count (integer): Non-nullable, default is 1, stores the number of times the IP has caused a rate limit violation.

Important Note on Schema Changes:
To ensure data consistency and minimize manual interventions on the development server, you should not modify the schema commands below.
For instance, if you need to add a new column like 'invalidateSession' to the 'users' table, you would typically modify the schema directly by adding this column. 
However, these schema creation commands are designed to execute only if the tables do not yet exist, which prevents unnecessary overwriting of existing tables.
Without migrations there would be two ways to update the schema on the server:
1. Simply delete the database and allow the commands to run (losing all data). 
2. Log into the server, export data, execute ALTER TABLE commands, and reinsert data. 
This manual approach is prone to errors and time-consuming.
Instead, we leverage a migration system through the 'migrate.ts' script, allowing for controlled and automated schema updates. 
Another point is that altering these schema commands could break the migration system, as it depends on the schema commands to be immutable.
*/

let db: Kysely<Database>;

export async function initializeDatabase() {
  db = new Kysely<Database>({
    dialect: new SqliteDialect({
      database: new BetterSqlite3(path.join("db", "TSC.db"))
    })
  });

  await db.schema
    .createTable("users")
    .ifNotExists()
    .addColumn("userId", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("username", "text", (col) => col.unique())
    .addColumn("email", "text", (col) => col.unique())
    .addColumn("hashedPassword", "text", (col) => col.unique())
    .addColumn("uuid", "text", (col) => col.notNull().unique())
    .addColumn("pictureUrl", "text", (col) => col.unique())
    .addColumn("emailVerified", "integer", (col) => col.notNull().defaultTo(0))
    .execute();

  await db.schema
    .createTable("verification")
    .ifNotExists()
    .addColumn("userId", "integer", (col) => col.notNull().unique())
    .addColumn("token", "text", (col) => col.notNull().unique())
    .addColumn("expiresAt", "datetime", (col) => col.notNull())
    .addColumn("verifyOrReset", "text", (col) => col.notNull())
    .execute();

  await new Promise<void>((resolve, reject) => {
    exec("cd db && yarn tsx migrate.ts up", (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        reject(error);
        throw new Error(`Migration failed: ${error}`);
      }
      if (stdout) console.log(stdout);
      if (stderr) console.error(stderr);
      resolve();
    });
  });
}

export { db };

export async function createUser(newUser: NewUser) {
  return await db.insertInto("users").values(newUser).execute();
}

export async function findUser(criteria: Partial<User>) {
  let query = db.selectFrom("users");
  if (criteria.userId) query = query.where("userId", "=", criteria.userId);
  if (criteria.username) query = query.where("username", "=", criteria.username);
  if (criteria.email) query = query.where("email", "=", criteria.email);
  if (criteria.uuid) query = query.where("uuid", "=", criteria.uuid);
  return await query.selectAll().execute();
}

export async function updateUser(criteria: Partial<User>, updatedUser: UpdatedUser) {
  let query = db.updateTable("users").set(updatedUser);
  if (criteria.userId) query = query.where("userId", "=", criteria.userId);
  if (criteria.username) query = query.where("username", "=", criteria.username);
  if (criteria.email) query = query.where("email", "=", criteria.email);
  if (criteria.uuid) query = query.where("uuid", "=", criteria.uuid);
  return await query.execute();
}

export async function deleteUser(criteria: Partial<User>) {
  let query = db.deleteFrom("users");
  if (criteria.userId) query = query.where("userId", "=", criteria.userId);
  if (criteria.username) query = query.where("username", "=", criteria.username);
  if (criteria.email) query = query.where("email", "=", criteria.email);
  if (criteria.uuid) query = query.where("uuid", "=", criteria.uuid);
  return await query.execute();
}

export async function createVerification(newVerification: NewVerification) {
  return await db.insertInto("verification").values(newVerification).execute();
}

export async function findVerification(criteria: Partial<Verification>) {
  let query = db.selectFrom("verification");
  if (criteria.userId) query = query.where("userId", "=", criteria.userId);
  if (criteria.token) query = query.where("token", "=", criteria.token);
  if (criteria.expiresAt) query = query.where("expiresAt", "=", criteria.expiresAt);
  if (criteria.reason) query = query.where("reason", "=", criteria.reason);
  return await query.selectAll().execute();
}

export async function updateVerification(criteria: Partial<Verification>, updatedVerification: NewVerification) {
  let query = db.updateTable("verification");
  if (criteria.userId) query = query.where("userId", "=", criteria.userId);
  if (criteria.token) query = query.where("token", "=", criteria.token);
  if (criteria.expiresAt) query = query.where("expiresAt", "=", criteria.expiresAt);
  if (criteria.reason) query = query.where("reason", "=", criteria.reason);
  return await query.set(updatedVerification).execute();
}

export async function deleteVerification(criteria: Partial<Verification>) {
  let query = db.deleteFrom("verification");
  if (!criteria.reason) throw new Error("Must provide reason assigned to verification token");
  query = query.where("reason", "=", criteria.reason);
  if (criteria.userId) query = query.where("userId", "=", criteria.userId);
  if (criteria.token) query = query.where("token", "=", criteria.token);
  if (criteria.expiresAt) query = query.where("expiresAt", "=", criteria.expiresAt);
  return await query.execute();
}

export async function createIp(ip: string) {
  return await db.insertInto("ip").values({ ip, count: 1 }).execute();
}

export async function findIp(ip: string) {
  return await db.selectFrom("ip").where("ip", "=", ip).selectAll().execute();
}

export async function updateIp(ip: string, count: number) {
  return await db.updateTable("ip").set({ count }).where("ip", "=", ip).execute();
}

export async function deleteIp(ip: string) {
  return await db.deleteFrom("ip").where("ip", "=", ip).execute();
}
