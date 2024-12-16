import {
  Datapack,
  DatapackUniqueIdentifier,
  isOfficialDatapack,
  isUserDatapack,
  isWorkshopDatapack
} from "@tsconline/shared";
import { devSafeUrl } from "../util";
import dayjs from "dayjs";

export function getDatapackFromArray(datapack: DatapackUniqueIdentifier, datapacks: Datapack[]) {
  return datapacks.find((d) => compareExistingDatapacks(d, datapack)) ?? null;
}
export function doesDatapackAlreadyExist(datapack: DatapackUniqueIdentifier, datapacks: Datapack[]) {
  return !!getDatapackFromArray(datapack, datapacks);
}
export function doesDatapackExistInCurrentConfig(
  datapack: DatapackUniqueIdentifier,
  datapacks: DatapackUniqueIdentifier[]
) {
  return !!datapacks.find((d) => compareExistingDatapacks(d, datapack));
}
export function compareExistingDatapacks(a: DatapackUniqueIdentifier, b: DatapackUniqueIdentifier) {
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
export function getPublicOfficialDatapacks(datapacks: Datapack[]) {
  return datapacks.filter((d) => isOfficialDatapack(d) && d.isPublic).sort((a, b) => a.priority - b.priority);
}
export function getPrivateOfficialDatapacks(datapacks: Datapack[]) {
  return datapacks.filter((d) => isOfficialDatapack(d) && !d.isPublic);
}
export function getWorkshopDatapacks(datapacks: Datapack[]) {
  return datapacks.filter((d) => isWorkshopDatapack(d));
}
export function isOwnedByUser(datapack: Datapack, uuid: string) {
  return isUserDatapack(datapack) && datapack.uuid === uuid;
}
export function getNavigationRouteForDatapackProfile(title: string, type: string) {
  return `/datapack/${encodeURIComponent(title)}/?type=${type}`;
}
export function getDatapackProfileImageUrl(datapack: Datapack) {
  const uuid = isUserDatapack(datapack) || isWorkshopDatapack(datapack) ? datapack.uuid : datapack.type;
  if (datapack.datapackImage) {
    return devSafeUrl(`/datapack-images/${datapack.title}/${uuid}`);
  } else {
    return devSafeUrl(`/datapack-images/default/${uuid}`);
  }
}

export function formatDate(input: string | dayjs.Dayjs): string {
  let date: Date;
  if (typeof input === "string") {
    date = new Date(input);
  } else if (dayjs.isDayjs(input)) {
    date = input.toDate();
  } else {
    throw new Error("Invalid input: must be a string or a Day.js object.");
  }
  const datePart = date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  const timePart = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });

  return `${datePart} at ${timePart}`;
}

export function hasLeadingTrailingWhiteSpace(input: string) {
  return input.trim() !== input;
}
