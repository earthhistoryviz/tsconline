import { type Kysely } from "kysely";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("verification_new")
    .addColumn("id", "integer", (col) => col.autoIncrement().primaryKey())
    .addColumn("userId", "integer", (col) => col.notNull().unique())
    .addColumn("token", "text", (col) => col.notNull().unique())
    .addColumn("expiresAt", "datetime", (col) => col.notNull())
    .addColumn("verifyOrReset", "text", (col) => col.notNull())
    .execute();
  const oldData = await db.selectFrom("verification").selectAll().execute();
  // This is actually wrong, you can't bulk insert data with Kysely
  if (oldData.length != 0) await db.insertInto("verification_new").values(oldData).execute();
  await db.schema.dropTable("verification").execute();
  await db.schema.alterTable("verification_new").renameTo("verification").execute();
  await db.schema.alterTable("verification").renameColumn("verifyOrReset", "reason").execute();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("verification_old")
    .addColumn("id", "integer", (col) => col.autoIncrement().primaryKey())
    .addColumn("userId", "integer", (col) => col.notNull().unique())
    .addColumn("token", "text", (col) => col.notNull().unique())
    .addColumn("expiresAt", "datetime", (col) => col.notNull())
    .addColumn("reason", "text", (col) => col.notNull())
    .execute();
  const oldData = await db.selectFrom("verification").selectAll().execute();
  // Also wrong
  if (oldData.length != 0) await db.insertInto("verification_old").values(oldData).execute();
  await db.schema.dropTable("verification").execute();
  await db.schema.alterTable("verification_old").renameTo("verification").execute();
  await db.schema.alterTable("verification").renameColumn("reason", "verifyOrReset").execute();
}
