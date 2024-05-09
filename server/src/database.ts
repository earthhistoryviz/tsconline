import { Database, User, NewUser, UpdatedUser, Verification, NewVerification } from "./types.js";
import BetterSqlite3 from "better-sqlite3";
import { Kysely, SqliteDialect } from "kysely";
import { exec } from "child_process";

export const db = new Kysely<Database>({
  dialect: new SqliteDialect({
    database: new BetterSqlite3("db/TSC.db")
  })
});

/*
These schemas should not be changed. The problem with changing them is that on the dev server the database will have to be either deleted or the schema will have to be manually updated.
Manually updating the server every single time will become a problem because we have to make sure that data is not lost. This is why we have migrations. If you need to change the schema, read the instructions in migrate.ts.
Because of this we will document the schema after migrations here:
users:
  userId: integer, primary key, auto increment
  username: text, unique
  email: text, unique
  hashedPassword: text, unique
  uuid: text, not null, unique
  pictureUrl: text, unique
  emailVerified: integer, not null, default 0
  invalidateSession: integer, not null, default 0

verification:
  id: integer, primary key, auto increment
  userId: integer, not null
  token: text, not null, unique
  expiresAt: datetime, not null
  reason: text, not null
*/

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

exec("cd db && yarn tsx migrate.ts up", (error, stdout, stderr) => {
  if (error) {
    console.error(`exec error: ${error}`);
    return;
  }
  stdout && console.log(stdout);
  stderr && console.error(stderr);
});

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
  if (criteria.userId) query = query.where("userId", "=", criteria.userId);
  if (criteria.token) query = query.where("token", "=", criteria.token);
  if (criteria.expiresAt) query = query.where("expiresAt", "=", criteria.expiresAt);
  return await query.execute();
}
