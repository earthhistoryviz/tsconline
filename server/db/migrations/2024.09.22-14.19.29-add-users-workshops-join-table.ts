import { type Kysely } from "kysely";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("usersWorkshops")
    .addColumn("workshopId", "integer", (col) => col.notNull())
    .addColumn("userId", "integer", (col) => col.notNull())
    .addColumn("workshopHasEnded", "integer", (col) => col.notNull().defaultTo(0))
    .execute();
  await db.schema.alterTable("users").dropColumn("workshopId").execute();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("usersWorkshops").execute();
  await db.schema
    .alterTable("users")
    .addColumn("workshopId", "integer", (col) => col.notNull().defaultTo(0))
    .execute();
}
