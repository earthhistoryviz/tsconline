import {
  Datapack,
  DatapackMetadata,
  DatapackUniqueIdentifier,
  SharedUser,
  isOfficialDatapack,
  isUserDatapack,
  isWorkshopDatapack
} from "@tsconline/shared";
import { devSafeUrl } from "../util";
import dayjs from "dayjs";
import { Workshop } from "../Workshops";
import { State } from "./state";

export function isMetadataLoading(skeletonStates: State["skeletonStates"]) {
  const {
    publicOfficialDatapacksLoading,
    privateOfficialDatapacksLoading,
    publicUserDatapacksLoading,
    privateUserDatapacksLoading
  } = skeletonStates;
  return (
    publicOfficialDatapacksLoading ||
    privateOfficialDatapacksLoading ||
    publicUserDatapacksLoading ||
    privateUserDatapacksLoading
  );
}
export function canEditDatapack(datapack: DatapackUniqueIdentifier, user: SharedUser) {
  return (
    isOwnedByUser(datapack, user.uuid) ||
    (user.isAdmin && (isOfficialDatapack(datapack) || isWorkshopDatapack(datapack)))
  );
}
export function compareExistingDatapacks(a: DatapackUniqueIdentifier, b: DatapackUniqueIdentifier) {
  return (
    a.title === b.title &&
    a.type === b.type &&
    ((isUserDatapack(a) && isUserDatapack(b)) || (isWorkshopDatapack(a) && isWorkshopDatapack(b))
      ? a.uuid === b.uuid
      : true)
  );
}
export function getMetadataFromArray(datapack: DatapackUniqueIdentifier, datapacks: DatapackMetadata[]) {
  return datapacks.find((d) => compareExistingDatapacks(d, datapack)) ?? null;
}
export function getDatapackFromArray(datapack: DatapackUniqueIdentifier, datapacks: Datapack[]) {
  return datapacks.find((d) => compareExistingDatapacks(d, datapack)) ?? null;
}
export function doesDatapackAlreadyExist(datapack: DatapackUniqueIdentifier, datapacks: Datapack[]) {
  return !!getDatapackFromArray(datapack, datapacks);
}
export function doesMetadataAlreadyExist(datapack: DatapackUniqueIdentifier, datapacks: DatapackMetadata[]) {
  return !!getMetadataFromArray(datapack, datapacks);
}
export function doesDatapackExistInCurrentConfig(
  datapack: DatapackUniqueIdentifier,
  datapacks: DatapackUniqueIdentifier[]
) {
  return !!datapacks.find((d) => compareExistingDatapacks(d, datapack));
}
export function getCurrentUserDatapacksMetadata(uuid: string, datapacks: DatapackMetadata[]) {
  return datapacks.filter((d) => isUserDatapack(d) && d.uuid === uuid);
}
export function getPublicDatapacksMetadataWithoutCurrentUser(datapacks: DatapackMetadata[], uuid?: string) {
  return datapacks.filter((d) => isUserDatapack(d) && d.uuid !== uuid && d.isPublic);
}
export function getPublicOfficialDatapacksMetadata(datapacks: DatapackMetadata[]) {
  return datapacks.filter((d) => isOfficialDatapack(d) && d.isPublic).sort((a, b) => a.priority - b.priority);
}
export function getPrivateOfficialDatapackMetadatas(datapacks: DatapackMetadata[]) {
  return datapacks.filter((d) => isOfficialDatapack(d) && !d.isPublic);
}
export function getWorkshopDatapacksMetadata(datapacks: DatapackMetadata[]) {
  return datapacks.filter((d) => isWorkshopDatapack(d));
}
export function isOwnedByUser(datapack: DatapackUniqueIdentifier, uuid: string) {
  return isUserDatapack(datapack) && datapack.uuid === uuid;
}
export function getNavigationRouteForDatapackProfile(uuid: string, title: string, type: string) {
  return `/datapack/${encodeURIComponent(title)}/?uuid=${uuid}&type=${type}`;
}
export function getDatapackUUID(datapack: DatapackUniqueIdentifier) {
  return isUserDatapack(datapack) || isWorkshopDatapack(datapack) ? datapack.uuid : datapack.type;
}
export function getDatapackProfileImageUrl(datapack: DatapackMetadata) {
  const uuid = isUserDatapack(datapack) || isWorkshopDatapack(datapack) ? datapack.uuid : datapack.type;
  if (datapack.datapackImage) {
    return devSafeUrl(`/datapack-images/${datapack.title}/${uuid}`);
  } else {
    return devSafeUrl(`/datapack-images//${uuid}`);
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
