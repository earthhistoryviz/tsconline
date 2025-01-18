import { type Kysely } from "kysely"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {

    await db.schema.alterTable("workshop").addColumn("creatorUUID", "integer", (col) => col.notNull())
        .addColumn("reg-restrict", "text")
        .addColumn("reg-link", "text", (col) => col.notNull())
        .execute();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.alterTable("workshop").dropColumn("creatorUUID")
        .dropColumn("reg-restrict")
        .dropColumn("reg-link")
        .execute();
}
