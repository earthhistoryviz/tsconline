import { type Kysely } from "kysely";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
    await db.schema.alterTable("workshop")
        .addColumn("creatorUUID", "text", (col) => col.notNull().defaultTo("default"))
        .execute();

    await db.schema.alterTable("workshop")
        .addColumn("regRestrict", "integer", (col) => col.notNull().defaultTo(0))
        .execute();

    await db.schema.alterTable("workshop")
        .addColumn("regLink", "text")
        .execute();

    await db.schema.alterTable("workshop")
        .addColumn("description", "text")
        .execute();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.alterTable("workshop")
        .dropColumn("creatorUUID")
        .execute();

    await db.schema.alterTable("workshop")
        .dropColumn("regRestrict")
        .execute();

    await db.schema.alterTable("workshop")
        .dropColumn("regLink")
        .execute();
    await db.schema.alterTable("workshop")
        .dropColumn("description")
        .execute();
}
