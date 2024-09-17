import { type Kysely } from "kysely";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("workshop")
    .addColumn("status", "text", (col) => col.notNull().defaultTo("inactive"))
    .execute();

  const now = new Date().toISOString();
  await db.updateTable("workshop").set({ status: "active" }).where("start", "<=", now).where("end", ">", now).execute();
  await db.updateTable("workshop").set({ status: "expired" }).where("end", "<", now).execute();
  await db.updateTable("workshop").set({ status: "inactive" }).where("start", ">", now).execute();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable("workshop").dropColumn("status").execute();
}
