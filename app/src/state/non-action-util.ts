import {
  Datapack,
  DatapackUniqueIdentifier,
  DeferredDatapack,
  isOfficialDatapack,
  isUserDatapack,
  isWorkshopDatapack
} from "@tsconline/shared";
import { devSafeUrl } from "../util";
import dayjs from "dayjs";
import { Workshop } from "../Workshops";

/**
 * Check if BaseDatapackProps is available in the datapack
 * @param datapack 
 * @param datapacks 
 */
export function isFullDatapackTypeAvailable(datapack: DatapackUniqueIdentifier, datapacks: DeferredDatapack[]) {
  const existingDatapacks = getDatapackFromArray(datapack, datapacks);
  return !!existingDatapacks?.columnInfo;
}
/**
 * Fill in BaseDatapackProps in the datapack
 * @param datapack 
 * @param datapacks 
 */
export function fillInFullDatapackType(datapack: Datapack, datapacks: DeferredDatapack[]) {
  const index = datapacks.findIndex((d) => compareExistingDatapacks(d, datapack));
  if (index !== -1) {
    datapacks[index] = datapack;
  }
}
export function getDatapackFromArray(datapack: DatapackUniqueIdentifier, datapacks: DeferredDatapack[]) {
  return datapacks.find((d) => compareExistingDatapacks(d, datapack)) ?? null;
}
export function doesDatapackAlreadyExist(datapack: DatapackUniqueIdentifier, datapacks: DeferredDatapack[]) {
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
export function getCurrentUserDatapacks(uuid: string, datapacks: DeferredDatapack[]) {
  return datapacks.filter((d) => isUserDatapack(d) && d.uuid === uuid);
}
export function getPublicDatapacksWithoutCurrentUser(datapacks: DeferredDatapack[], uuid?: string) {
  return datapacks.filter((d) => isUserDatapack(d) && d.uuid !== uuid && d.isPublic);
}
export function getPublicOfficialDatapacks(datapacks: DeferredDatapack[]) {
  return datapacks.filter((d) => isOfficialDatapack(d) && d.isPublic).sort((a, b) => a.priority - b.priority);
}
export function getPrivateOfficialDatapacks(datapacks: DeferredDatapack[]) {
  return datapacks.filter((d) => isOfficialDatapack(d) && !d.isPublic);
}
export function getWorkshopDatapacks(datapacks: DeferredDatapack[]) {
  return datapacks.filter((d) => isWorkshopDatapack(d));
}
export function isOwnedByUser(datapack: DeferredDatapack, uuid: string) {
  return isUserDatapack(datapack) && datapack.uuid === uuid;
}
export function getNavigationRouteForDatapackProfile(title: string, type: string) {
  return `/datapack/${encodeURIComponent(title)}/?type=${type}`;
}
export function getDatapackProfileImageUrl(datapack: DeferredDatapack) {
  const uuid = isUserDatapack(datapack) || isWorkshopDatapack(datapack) ? datapack.uuid : datapack.type;
  if (datapack.datapackImage) {
    return devSafeUrl(`/datapack-images/${datapack.title}/${uuid}`);
  } else {
    return devSafeUrl(`/datapack-images/default/${uuid}`);
  }
}
export function getNavigationRouteForWorkshopDetails(id: number) {
  return `/workshops/${id}`;
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

export function getActiveWorkshops(workshops: Workshop[]) {
  const now = new Date();
  const activeWorkshops = workshops.filter(
    (workshop) => workshop.active && new Date(workshop.start) <= now && new Date(workshop.end) >= now
  );
  return activeWorkshops;
}
export function getUpcomingWorkshops(workshops: Workshop[]) {
  const now = new Date();
  const upcomingWorkshops = workshops.filter((workshop) => !workshop.active && new Date(workshop.start) > now);
  return upcomingWorkshops;
}
export function getPastWorkshops(workshops: Workshop[]) {
  const now = new Date();
  const pastWorkshops = workshops.filter((workshop) => new Date(workshop.end) < now);
  return pastWorkshops;
}
