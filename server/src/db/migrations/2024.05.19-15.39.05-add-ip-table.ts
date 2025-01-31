import { type Kysely } from "kysely";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("ip")
    .addColumn("id", "integer", (col) => col.autoIncrement().primaryKey())
    .addColumn("ip", "text", (col) => col.notNull().unique())
    .addColumn("count", "integer", (col) => col.notNull().defaultTo(1))
    .execute();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("ip").execute();
}
