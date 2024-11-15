import { type Kysely } from "kysely";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("workshop_temp")
    .addColumn("workshopId", "integer", (col) => col.autoIncrement().primaryKey())
    .addColumn("title", "text", (col) => col.notNull())
    .addColumn("start", "datetime", (col) => col.notNull())
    .addColumn("end", "datetime", (col) => col.notNull())
    .execute();

  const workshops = await db.selectFrom("workshop").select(["workshopId", "title", "start", "end"]).execute();
  const backupExists = await db
    .selectFrom("sqlite_master")
    .select("name")
    .where("type", "=", "table")
    .where("name", "=", "workshopBackup")
    .execute();
  if (backupExists.length > 0) {
    const backupWorkshops = await db
      .selectFrom("workshopBackup")
      .select(["workshopId", "title", "start", "end"])
      .execute();
    workshops.push(...backupWorkshops);
    await db.schema.dropTable("workshopBackup").execute();
  }
  for (const workshop of workshops) {
    await db.insertInto("workshop_temp").values(workshop).execute();
  }

  await db.schema.dropTable("workshop").execute();
  await db.schema.alterTable("workshop_temp").renameTo("workshop").execute();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("workshop_temp")
    .addColumn("workshopId", "integer", (col) => col.autoIncrement().primaryKey())
    .addColumn("title", "text", (col) => col.notNull().unique())
    .addColumn("start", "datetime", (col) => col.notNull())
    .addColumn("end", "datetime", (col) => col.notNull())
    .execute();

  const workshops = await db.selectFrom("workshop").select(["workshopId", "title", "start", "end"]).execute();

  const uniqueTitles = new Set<string>();
  const nonUniqueWorkshops: typeof workshops = [];
  for (const workshop of workshops) {
    if (uniqueTitles.has(workshop.title)) {
      nonUniqueWorkshops.push(workshop);
      continue;
    } else {
      uniqueTitles.add(workshop.title);
    }
    await db.insertInto("workshop_temp").values(workshop).execute();
  }
  if (nonUniqueWorkshops.length > 0) {
    await db.schema
      .createTable("workshopBackup")
      .addColumn("workshopId", "integer", (col) => col.autoIncrement().primaryKey())
      .addColumn("title", "text", (col) => col.notNull())
      .addColumn("start", "datetime", (col) => col.notNull())
      .addColumn("end", "datetime", (col) => col.notNull())
      .execute();
    for (const workshop of nonUniqueWorkshops) {
      await db.insertInto("workshopBackup").values(workshop).execute();
    }
  }

  await db.schema.dropTable("workshop").execute();
  await db.schema.alterTable("workshop_temp").renameTo("workshop").execute();
}
