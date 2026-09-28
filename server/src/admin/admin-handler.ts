import { DatapackPriorityChangeRequest } from "@tsconline/shared";
import { fetchUserDatapack, writeUserDatapack } from "../user/user-handler.js";
export async function editAdminDatapackPriorities(datapackRequest: DatapackPriorityChangeRequest) {
  const datapack = await fetchUserDatapack(datapackRequest.uuid, datapackRequest.id);
  datapack.priority = datapackRequest.priority;
  await writeUserDatapack(datapackRequest.uuid, datapack);
}

export async function editAdminDatapackHeaders(
  datapackRequest: DatapackPriorityChangeRequest & { officialHeader?: string; officialHeaderOrder?: number }
) {
  const datapack = await fetchUserDatapack(datapackRequest.uuid, datapackRequest.id);
  datapack.officialHeader = datapackRequest.officialHeader;
  datapack.officialHeaderOrder = datapackRequest.officialHeaderOrder;
  await writeUserDatapack(datapackRequest.uuid, datapack);
}
