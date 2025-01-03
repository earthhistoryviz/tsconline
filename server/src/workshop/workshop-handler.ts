import { DatapackMetadata, assertWorkshopDatapack } from "@tsconline/shared";
import { getWorkshopIfNotEnded } from "../database.js";
import { OperationResult } from "../types.js";
import { getWorkshopIdFromUUID } from "./workshop-util.js";

export const grabAndVerifyWorkshopUUID = async (datapackMetadata: DatapackMetadata): Promise<OperationResult> => {
  assertWorkshopDatapack(datapackMetadata);
  const workshopId = getWorkshopIdFromUUID(datapackMetadata.uuid);
  if (!workshopId) {
    return { code: 400, message: "Invalid workshopId" };
  }
  const workshop = await getWorkshopIfNotEnded(workshopId);
  if (!workshop) {
    return { code: 404, message: "Workshop not found or has ended" };
  }
  if (!datapackMetadata.isPublic) {
    return { code: 400, message: "Workshop datapack must be public" };
  }
  return { code: 200, message: "Success" };
};
