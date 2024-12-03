/**
 * Extracts the workshop ID from a workshop UUID
 * @param uuid
 * @returns
 */
export function getWorkshopIdFromUUID(uuid: string): number | null {
  const workshopId = parseInt(uuid.split("-")[1] ?? "");
  if (isNaN(workshopId)) {
    return null;
  }
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
