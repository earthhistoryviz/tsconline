import { Database, User, NewUser, UpdatedUser, Verification, NewVerification } from "./types.js";
import BetterSqlite3 from "better-sqlite3";
import {
  Kysely,
  SqliteDialect,
  ReferenceExpression,
  OperandValueExpressionOrList,
  ComparisonOperatorExpression
} from "kysely";
import fs from "fs";

export const db = new Kysely<Database>({
  dialect: new SqliteDialect({
    database: new BetterSqlite3("../server/db/TSC.db")
  })
});

export async function setupDb() {
  try {
    await fs.promises.mkdir("../server/db", { recursive: true });
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    if (error.code !== "EEXIST") throw err;
  }
  await db.schema
    .createTable("users")
    .ifNotExists()
    .addColumn("userId", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("username", "text")
    .addColumn("email", "text", (col) => col.unique())
    .addColumn("hashedPassword", "text", (col) => col.unique())
    .addColumn("uuid", "text", (col) => col.notNull().unique())
    .addColumn("pictureUrl", "text")
    .addColumn("emailVerified", "integer", (col) => col.notNull().defaultTo(0))
    .execute();

  await db.schema
    .createTable("verification")
    .ifNotExists()
    .addColumn("userId", "integer", (col) => col.notNull())
    .addColumn("token", "text", (col) => col.notNull())
    .addColumn("expiresAt", "datetime", (col) => col.notNull())
    .addColumn("verifyOrReset", "text", (col) => col.notNull())
    .execute();
}

interface QueryBuilder {
  where<
    RE extends ReferenceExpression<Database, keyof Database>,
    VE extends OperandValueExpressionOrList<Database, keyof Database, RE>
  >(
    lhs: RE,
    op: ComparisonOperatorExpression,
    rhs: VE
  ): QueryBuilder;
}

function buildUserQuery(query: QueryBuilder, criteria: Partial<User>) {
  if (criteria.userId) query = query.where("userId", "=", criteria.userId);
  if (criteria.username) query = query.where("username", "=", criteria.username);
  if (criteria.email) query = query.where("email", "=", criteria.email);
  if (criteria.uuid) query = query.where("uuid", "=", criteria.uuid);
}

function buildVerificationQuery(query: QueryBuilder, criteria: Partial<Verification>) {
  if (criteria.userId) query = query.where("userId", "=", criteria.userId);
  if (criteria.token) query = query.where("token", "=", criteria.token);
  if (criteria.expiresAt) query = query.where("expiresAt", "=", criteria.expiresAt);
  if (criteria.verifyOrReset) query = query.where("verifyOrReset", "=", criteria.verifyOrReset);
}

export async function createUser(newUser: NewUser) {
  return await db.insertInto("users").values(newUser).execute();
}

export async function findUser(criteria: Partial<User>) {
  const query = db.selectFrom("users");
  buildUserQuery(query, criteria);
  return await query.selectAll().execute();
}

export async function updateUser(criteria: Partial<User>, updatedUser: UpdatedUser) {
  const query = db.updateTable("users").set(updatedUser);
  buildUserQuery(query, criteria);
  return await query.execute();
}

export async function deleteUser(criteria: Partial<User>) {
  const query = db.deleteFrom("users");
  buildUserQuery(query, criteria);
  return await query.execute();
}

export async function createVerification(newVerification: NewVerification) {
  return await db.insertInto("verification").values(newVerification).execute();
}

export async function findVerification(criteria: Partial<Verification>) {
  const query = db.selectFrom("verification");
  buildVerificationQuery(query, criteria);
  return await query.selectAll().execute();
}

export async function updateVerification(criteria: Partial<Verification>, updatedVerification: NewVerification) {
  const query = db.updateTable("verification");
  buildVerificationQuery(query, criteria);
  return await query.set(updatedVerification).execute();
}

export async function deleteVerification(criteria: Partial<Verification>) {
  const query = db.deleteFrom("verification");
  buildVerificationQuery(query, criteria);
  return await query.execute();
}
