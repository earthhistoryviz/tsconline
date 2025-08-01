import { DatapackMetadata } from "./index";

export function roundToDecimalPlace(value: number, decimalPlace: number) {
  const factor = Math.pow(10, decimalPlace);
  return Math.round(value * factor) / factor;
}

export function calculateAutoScale(min: number, max: number) {
  const margin = 0.1;
  const outerMargin = ((max - min) * margin) / 2;
  const lowerRange = roundToDecimalPlace(min - outerMargin, 3);
  const upperRange = roundToDecimalPlace(max + outerMargin, 3);
  const scaleStep = roundToDecimalPlace((upperRange - lowerRange) * 0.2, 3);
  const scaleStart = 0;
  return { lowerRange, upperRange, scaleStep, scaleStart };
}

/**
 * Gets the workshop UUID from a workshop ID
 * @param workshopId
 * @returns
 */
export function getWorkshopUUIDFromWorkshopId(workshopId: number): string {
  return `workshop-${workshopId}`;
}

export function checkUserAllowedDownloadDatapack(user: { isAdmin: boolean; uuid: string }, datapack: DatapackMetadata) {
  if (user.isAdmin || datapack.isPublic || (datapack.type === "user" && datapack.uuid === user.uuid)) {
    return true;
  }
  return false;
}
