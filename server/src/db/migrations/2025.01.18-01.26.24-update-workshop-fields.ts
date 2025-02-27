import { type Kysely } from "kysely";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("workshop")
    .addColumn("creatorUUID", "text", (col) => col.notNull().defaultTo("default"))
    .addColumn("regRestrict", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("regLink", "text")
    .addColumn("description", "text")
    .execute();

}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("workshop")
    .dropColumn("creatorUUID")
    .dropColumn("regRestrict")
    .dropColumn("regLink")
    .dropColumn("description")
    .execute();
}
