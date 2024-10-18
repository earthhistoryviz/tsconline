import { Datapack, DatapackConfigForChartRequest, isServerDatapack, isUserDatapack } from "@tsconline/shared";
import { devSafeUrl } from "../util";

export function getDatapackFromArray(datapack: DatapackConfigForChartRequest, datapacks: Datapack[]) {
  return datapacks.find((d) => compareExistingDatapacks(d, datapack)) ?? null;
}
export function doesDatapackAlreadyExist(datapack: DatapackConfigForChartRequest, datapacks: Datapack[]) {
  return !!getDatapackFromArray(datapack, datapacks);
}
export function compareExistingDatapacks(a: DatapackConfigForChartRequest, b: DatapackConfigForChartRequest) {
  return (
    a.title === b.title && a.type === b.type && (isUserDatapack(a) && isUserDatapack(b) ? a.uuid === b.uuid : true)
  );
}
export function getCurrentUserDatapacks(uuid: string, datapacks: Datapack[]) {
  return datapacks.filter((d) => isUserDatapack(d) && d.uuid === uuid);
}
export function getPublicDatapacksWithoutCurrentUser(datapacks: Datapack[], uuid?: string) {
  return datapacks.filter((d) => isUserDatapack(d) && d.uuid !== uuid && d.isPublic);
}
export function getServerDatapacks(datapacks: Datapack[]) {
  return datapacks.filter((d) => isServerDatapack(d));
}
export function isOwnedByUser(datapack: Datapack, uuid: string) {
  return isUserDatapack(datapack) && datapack.uuid === uuid;
}
export function getNavigationRouteForDatapackProfile(title: string, type: string) {
  return `/datapack/${encodeURIComponent(title)}/?type=${type}`;
}
export function getDatapackProfileImageUrl(datapack: Datapack) {
  const uuid = isUserDatapack(datapack) ? datapack.uuid : datapack.type;
  if (datapack.datapackImage) {
    return devSafeUrl(`/datapack-images/${datapack.title}/${uuid}`);
  } else {
    return devSafeUrl(`/datapack-images/default/${uuid}`);
  }
}
