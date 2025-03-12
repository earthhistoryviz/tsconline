import "dotenv/config";
import { loadAssetConfigs, assetconfigs } from "./util.js";
import { writeFile } from "fs/promises";
import { basename } from "path";

const { DROPBOX_REFRESH_TOKEN, DROPBOX_APP_KEY, DROPBOX_APP_SECRET } = process.env;

export async function pullJar(): Promise<void> {
    try {
        await loadAssetConfigs();
    } catch(e) {
        console.error(e);
        return;
    }
    try {
        if (!DROPBOX_REFRESH_TOKEN || !DROPBOX_APP_KEY || !DROPBOX_APP_SECRET) {
            throw new Error("Dropbox environment variables not set");
        }
        // get the access token
        const response = await fetch("https://api.dropboxapi.com/oauth2/token", {
            method: "POST",
            headers: {
                "Authorization": "Basic " + Buffer.from(`${DROPBOX_APP_KEY}:${DROPBOX_APP_SECRET}`).toString("base64"),
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({
                grant_type: "refresh_token",
                refresh_token: DROPBOX_REFRESH_TOKEN
            }).toString()
        });
        const data = await response.json();
        if (!data.access_token) {
            throw new Error("Failed to get access token");
        }
        // download the jar file
        const jarResponse = await fetch("https://content.dropboxapi.com/2/files/download", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${data.access_token}`,
                "Dropbox-API-Arg": JSON.stringify({
                    path: `/VIP-Fall2023 EarthHistoryVisualization/Supporting\ TSCOnline\ Files/${basename(assetconfigs.activeJar)}`
                })
            }
        });
        console.log(jarResponse);
        if (!jarResponse.ok) {
            throw new Error("Failed to download jar file");
        }
        await writeFile(assetconfigs.activeJar, Buffer.from(await jarResponse.arrayBuffer()));
        console.log(jarResponse);
    } catch (e) {
        console.error(e);
    }
}

await pullJar();