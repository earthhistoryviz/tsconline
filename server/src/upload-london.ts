import {
  generateLondonDatapack,
  LONDON_DATAPACK_TITLE
} from "./db/london/json-to-txt.js";
import { addLondonConfigToAdminConfig } from "./add-dev-config.js";
import { migrateLondonCachedDatapacks } from "./migrate-cached-datapacks.js";
import { connectToDB } from "./db/london/sql-to-json.js";
import { deleteOfficialDatapack, doesDatapackFolderExistInAllUUIDDirectories } from "./user/user-handler.js";

const LONDON_LEGACY_DATAPACK_TITLES = ["UCL TSC Facies"];

async function removeStaleLondonOfficialDatapacks() {
  for (const title of [LONDON_DATAPACK_TITLE, ...LONDON_LEGACY_DATAPACK_TITLES]) {
    if (await doesDatapackFolderExistInAllUUIDDirectories("official", title)) {
      await deleteOfficialDatapack(title);
    }
  }
}

export async function processLondonDatapack() {
  try {
    await connectToDB();
    await generateLondonDatapack();
    await removeStaleLondonOfficialDatapacks();
    await addLondonConfigToAdminConfig();
    await migrateLondonCachedDatapacks();

    console.log("London datapack generated successfully.");
  } catch (error) {
    console.error("Error generating London datapack:", error);
  }
}

export async function retrieveLondonDatapack(): Promise<File> {
  try {
    await connectToDB();
    const londonDatapack = await generateLondonDatapack();
    return londonDatapack as File;
  } catch (error) {
    console.error("Error retrieving London datapack:", error);
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await processLondonDatapack();
}
