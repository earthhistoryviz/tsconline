import { sql, type Kysely } from "kysely";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable("users").addColumn("createdAt", "datetime").execute();
  await db.schema.alterTable("users").addColumn("lastLogin", "datetime").execute();

  // Backfill existing users with current timestamp
  await db
    .updateTable("users")
    .set({ createdAt: sql`datetime('now')` })
    .where("createdAt", "is", null)
    .execute();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable("users").dropColumn("lastLogin").execute();
  await db.schema.alterTable("users").dropColumn("createdAt").execute();
}
