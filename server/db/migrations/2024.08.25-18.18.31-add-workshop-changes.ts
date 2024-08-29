import { type Kysely } from "kysely";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("workshop")
    .addColumn("id", "integer", (col) => col.autoIncrement().primaryKey())
    .addColumn("title", "text", (col) => col.notNull().unique())
    .addColumn("start", "datetime", (col) => col.notNull())
    .addColumn("end", "datetime", (col) => col.notNull())
    .execute();
  await db.schema
    .alterTable("users")
    .addColumn("workshopId", "integer", (col) => col.notNull().defaultTo(0))
    .execute();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("workshop").execute();
  await db.schema.alterTable("users").dropColumn("workshopId").execute();
}
