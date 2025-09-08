import {generateLondonDatapack} from "./db/london/json-to-txt.js";
import {addLondonConfigToAdminConfig} from "./add-dev-config.js";
import { migrateLondonCachedDatapacks } from "./migrate-cached-datapacks.js";
import { connectToDB } from "./db/london/sql-to-json.js";

export async function processLondonDatapack() {
    try {
        await connectToDB();
        await generateLondonDatapack();
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
        console.log("London datapack retrieved successfully.");
        return londonDatapack as File;
    } catch (error) {
        console.error("Error retrieving London datapack:", error);
        throw error;
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    await processLondonDatapack();
}