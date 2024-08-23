import { DatapackConfigForChartRequest } from "@tsconline/shared";
import { State } from "./state";

export function getDatapackFromIndex(datapack: DatapackConfigForChartRequest, state: State) {
  switch (datapack.type) {
    case "server":
      return state.datapackCollection.serverDatapackIndex[datapack.title];
    case "private_user":
      return state.datapackCollection.privateUserDatapackIndex[datapack.title];
    case "public_user":
      return state.datapackCollection.publicUserDatapackIndex[datapack.title];
    case "workshop":
      return state.datapackCollection.workshopDatapackIndex[datapack.title];
    default:
      return null;
  }
}