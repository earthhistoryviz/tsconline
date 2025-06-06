import { isWorkshopUUID } from "@tsconline/shared";
import { OperationResult } from "../types.js";
import { isUserInWorkshopAndWorkshopIsActive } from "../database.js";
import { verifyFilepath, verifyNonExistentFilepath } from "../util.js";
import path from "path";
import { mkdir } from "fs/promises";
import { getUserUUIDDirectory } from "../user/fetch-user-files.js";

/**
 * Extracts the workshop ID from a workshop UUID
 * @param uuid
 * @returns
 */
export function getWorkshopIdFromUUID(uuid: string): number | null {
  if (!isWorkshopUUID(uuid)) {
    return null;
  }
  const workshopId = parseInt(uuid.split("-")[1] ?? "");
  return workshopId;
}

/**
 * Extracts the workshop ID from a folder name
 * @param folderName
 * @returns The workshop ID or null if the workshop ID could not be extracted
 */
export function extractWorkshopIdFromFolderName(folderName: string): number | null {
  return getWorkshopIdFromUUID(folderName);
}

/**
 * Gets the workshop UUID from a workshop ID
 * @param workshopId
 * @returns
 */
export function getWorkshopUUIDFromWorkshopId(workshopId: number): string {
  return `workshop-${workshopId}`;
}

/**
 * Checks if a folder name is a workshop folder
 * @param folderName
 * @returns
 */
export function isUUIDFolderAWorkshopFolder(folderName: string): boolean {
  return getWorkshopIdFromUUID(folderName) !== null;
}

/**
 * Checks to make sure the user is in the workshop and the workshop is active
 * @param workshopUUID the workshop's UUID
 * @param userId the user's userId
 * @returns
 */
export async function verifyWorkshopValidity(workshopUUID: string, userId: number): Promise<OperationResult> {
  const workshopId = getWorkshopIdFromUUID(workshopUUID);
  if (!workshopId) {
    return { code: 400, message: "Invalid workshop UUID" };
  }
  if (!(await isUserInWorkshopAndWorkshopIsActive(userId, workshopId))) {
    return { code: 403, message: "User does not have access to this workshop" };
  }
  return { code: 200, message: "Success" };
}

export async function getWorkshopFilesPath(workshopUUID: string): Promise<string> {
  const directory = await getUserUUIDDirectory(workshopUUID, true);
  const filesDir = path.join(directory, "files");

  if (!(await verifyFilepath(filesDir))) {
    if (await verifyNonExistentFilepath(filesDir)) {
      await mkdir(filesDir, { recursive: true });
    } else {
      throw new Error("Invalid Workshop Files Directory.");
    }
  }
  return filesDir;
}

export async function getWorkshopCoverPath(workshopUUID: string): Promise<string> {
  const directory = await getUserUUIDDirectory(workshopUUID, true);
  const coverDir = path.join(directory, "cover");

  if (!(await verifyFilepath(coverDir))) {
    if (await verifyNonExistentFilepath(coverDir)) {
      await mkdir(coverDir, { recursive: true });
    } else {
      throw new Error("Invalid Workshop Cover Picture Directory.");
    }
  }
  return coverDir;
}
