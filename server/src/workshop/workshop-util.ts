import { isWorkshopUUID } from "@tsconline/shared";
import { OperationResult } from "../types";
import { isUserInWorkshopAndWorkshopIsActive } from "../database";
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
  return folderName.startsWith("workshop-") && getWorkshopIdFromUUID(folderName) !== null;
}
/**
 * Checks to make sure the user is in the workshop and the workshop is active
 * @param workshopUUID the workshop's UUID
 * @param userId the user's userId
 * @returns
 */
export function verifyWorkshopValidity(workshopUUID: string, userId: number): OperationResult {
  const workshopId = getWorkshopIdFromUUID(workshopUUID);
  if (!workshopId) {
    return { code: 400, message: "Invalid workshop UUID" };
  }
  if (!isUserInWorkshopAndWorkshopIsActive(workshopId, userId)) {
    return { code: 401, message: "User does not have access to this workshop" };
  }
  return { code: 200, message: "Success" };
}
