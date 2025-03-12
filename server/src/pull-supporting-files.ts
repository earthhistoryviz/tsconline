import "dotenv/config";
import { loadAssetConfigs, assetconfigs } from "./util.js";
import { access, mkdir, readdir, rm, writeFile } from "fs/promises";
import { basename, dirname, join } from "path";
import chalk from "chalk";
import AdmZip from "adm-zip";

const { DROPBOX_REFRESH_TOKEN, DROPBOX_APP_KEY, DROPBOX_APP_SECRET } = process.env;

async function verifyFile(file: string): Promise<boolean> {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

export async function pullFiles(): Promise<void> {
  try {
    await loadAssetConfigs();
  } catch (e) {
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
        Authorization: "Basic " + Buffer.from(`${DROPBOX_APP_KEY}:${DROPBOX_APP_SECRET}`).toString("base64"),
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
    if (await verifyFile(assetconfigs.activeJar)) {
      console.log(chalk.blue("Jar file already exists, skipping download"));
    } else {
      await downloadJars(data.access_token);
    }
    if (!(await areDropboxDatapacksDifferent(data.access_token))) {
      console.log(chalk.blue("Datapacks already exist, skipping download"));
    } else {
      await downloadDatapacks(data.access_token);
    }
  } catch (e) {
    console.error(e);
  }
}

export async function areDropboxDatapacksDifferent(access_token: string): Promise<boolean> {
  const response = await fetch("https://api.dropboxapi.com/2/files/list_folder", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access_token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      path: "/VIP-Fall2023 EarthHistoryVisualization/Supporting TSCOnline Files/datapacks"
    })
  });
  if (!response.ok) {
    throw new Error("Failed to list files in datapacks directory");
  }
  const data = await response.json();
  const files = data.entries.map((entry: { name: string }) => entry.name);
  if (!verifyFile(assetconfigs.datapacksDirectory)) {
    return true;
  }
  const localFiles = await readdir(assetconfigs.datapacksDirectory);
  return files.length !== localFiles.length || files.some((file: string) => !localFiles.includes(file));
}

// download the datapacks
export async function downloadDatapacks(access_token: string) {
  // download the datapack file
  const datapackResponse = await fetch("https://content.dropboxapi.com/2/files/download_zip", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access_token}`,
      "Dropbox-API-Arg": JSON.stringify({
        path: `/VIP-Fall2023 EarthHistoryVisualization/Supporting TSCOnline Files/datapacks`
      })
    }
  });
  if (!datapackResponse.ok) {
    throw new Error("Failed to download datapack file, file may not exist in dropbox => please check with team leads");
  }
  await mkdir(assetconfigs.datapacksDirectory, { recursive: true });
  const datapackZip = join(assetconfigs.datapacksDirectory, "datapacks.zip");
  await writeFile(datapackZip, Buffer.from(await datapackResponse.arrayBuffer()));
  const zip = new AdmZip(datapackZip);
  zip.getEntries().forEach((entry) => {
    // download to the datapacks directory
    zip.extractEntryTo(entry, assetconfigs.datapacksDirectory, false, true);
  });
  await rm(datapackZip);
  console.log(chalk.green("Datapacks downloaded successfully"));
}

export async function downloadJars(access_token: string) {
  // download the jar file
  const jarResponse = await fetch("https://content.dropboxapi.com/2/files/download", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access_token}`,
      "Dropbox-API-Arg": JSON.stringify({
        path: `/VIP-Fall2023 EarthHistoryVisualization/Supporting TSCOnline Files/${basename(assetconfigs.activeJar)}`
      })
    }
  });
  if (!jarResponse.ok) {
    throw new Error("Failed to download jar file, file may not exist in dropbox => please check with team leads");
  }
  await mkdir(dirname(assetconfigs.activeJar), { recursive: true });
  await writeFile(assetconfigs.activeJar, Buffer.from(await jarResponse.arrayBuffer()));
  if (await verifyFile(assetconfigs.activeJar)) {
    console.log(chalk.green("Jar file downloaded successfully"));
  } else {
    throw new Error("Failed to download jar file");
  }
}

await pullFiles();
