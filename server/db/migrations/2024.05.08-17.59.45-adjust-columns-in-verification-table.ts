import { type Kysely, sql } from "kysely";
import { Verification } from "../../dist/types";

//I need userId to not be unique, but I can't alter that since it's a primary key. So I need to create a new table and copy over all the data.
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("verification_new")
    .addColumn("id", "integer", (col) => col.autoIncrement().primaryKey())
    .addColumn("userId", "integer", (col) => col.notNull())
    .addColumn("token", "text", (col) => col.notNull().unique())
    .addColumn("expiresAt", "datetime", (col) => col.notNull())
    .addColumn("verifyOrReset", "text", (col) => col.notNull())
    .execute();
  await sql<Verification[]>`INSERT INTO verification_new (userId, token, expiresAt, verifyOrReset)
                            SELECT userId, token, expiresAt, verifyOrReset FROM verification`.execute(db);
  await db.schema.dropTable("verification").execute();
  await db.schema.alterTable("verification_new").renameTo("verification").execute();
  await db.schema.alterTable("verification").renameColumn("verifyOrReset", "reason").execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("verification_old")
    .addColumn("id", "integer", (col) => col.autoIncrement().primaryKey())
    .addColumn("userId", "integer", (col) => col.notNull())
    .addColumn("token", "text", (col) => col.notNull().unique())
    .addColumn("expiresAt", "datetime", (col) => col.notNull())
    .addColumn("reason", "text", (col) => col.notNull())
    .execute();
  await sql`INSERT INTO verification_old (userId, token, expiresAt, reason)
            SELECT userId, token, expiresAt, reason FROM verification`.execute(db);
  await db.schema.dropTable("verification").execute();
  await db.schema.alterTable("verification_old").renameTo("verification").execute();
  await db.schema.alterTable("verification").renameColumn("reason", "verifyOrReset").execute();
}
