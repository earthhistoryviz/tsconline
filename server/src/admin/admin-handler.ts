import { DatapackPriorityChangeRequest } from "@tsconline/shared";
import { fetchUserDatapack, writeUserDatapack } from "../user/user-handler.js";
export async function editAdminDatapackPriorities(datapackRequest: DatapackPriorityChangeRequest) {
  const datapack = await fetchUserDatapack(datapackRequest.uuid, datapackRequest.id);
  datapack.priority = datapackRequest.priority;
  await writeUserDatapack(datapackRequest.uuid, datapack);
}
