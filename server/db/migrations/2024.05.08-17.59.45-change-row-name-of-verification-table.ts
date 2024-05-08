import { type Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable("verification").renameColumn("verifyOrReset", "reason").execute();
  await db
    .updateTable("verification")
    .set({
      reason: "verify"
    })
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable("verification").renameColumn("reason", "verifyOrReset").execute();
}
