import { type Kysely } from "kysely";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("comments")
    .addColumn("id", "integer", (col) => col.autoIncrement().primaryKey())
    .addColumn("uuid", "text", (col) => col.notNull())
    .addColumn("datapackTitle", "text", (col) => col.notNull())
    .addColumn("commentText", "text", (col) => col.notNull())
    .addColumn("username", "text", (col) => col.notNull())
    .addColumn("dateCreated", "datetime", (col) => col.notNull())
    .addColumn("flagged", "boolean", (col) => col.notNull().defaultTo(false))
    .execute();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("comments").execute();
}
