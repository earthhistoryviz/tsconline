import {
  Datapack,
  DatapackMetadata,
  DatapackUniqueIdentifier,
  MapInfo,
  DisplayedColumnTypes,
  SharedUser,
  SharedWorkshop,
  isOfficialDatapack,
  isUserDatapack,
  isWorkshopDatapack
} from "@tsconline/shared";
import { devSafeUrl } from "../util";
import dayjs, { Dayjs } from "dayjs";
import { State } from ".";
import DOMPurify from "dompurify";
export function purifyChartContent(
  content: string,
  options?: {
    width?: string;
    height?: string;
    preserveAspectRatio?: string;
  }
) {
  const domPurifyConfig = {
    ADD_ATTR: [
      "docbase",
      "popuptext",
      "minY",
      "maxY",
      "vertScale",
      "topAge",
      "baseAge",
      "minX",
      "maxX",
      "baseLimit",
      "topLimit",
      "x1",
      "y1"
    ],
    ADD_URI_SAFE_ATTR: ["docbase", "popuptext"]
  };
  const cleanContent = DOMPurify.sanitize(content, domPurifyConfig);
  // for setting width, height and preserveAspectRatio if needed to display an svg
  if (options) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(cleanContent, "image/svg+xml");
    const svg = doc.querySelector("svg");

    if (svg) {
      if (options.width) {
        svg.setAttribute("width", options.width);
      }
      if (options.height) {
        svg.setAttribute("height", options.height);
      }
      if (options.preserveAspectRatio) {
        svg.setAttribute("preserveAspectRatio", options.preserveAspectRatio);
      }
    }
    return doc.documentElement.outerHTML;
  }
  return cleanContent;
}
export const getDotSizeFromScale = (size: number, scale: number) => {
  return Math.min(size * Math.pow(scale, -0.8), 3 * size);
};

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

export function formatDateForSmallerDisplay(input: string | number | dayjs.Dayjs): string {
  let date: Date;
  if (typeof input === "string") {
    if (/^\d+$/.test(input)) {
      date = new Date(Number(input));
    } else {
      date = new Date(input);
    }
  } else if (typeof input === "number") {
    date = new Date(input);
  } else if (dayjs.isDayjs(input)) {
    date = input.toDate();
  } else {
    throw new Error("Invalid input: must be a string or a Day.js object.");
  }
  const datePart = date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return `${datePart}`;
}

export function formatDate(input: string | number | dayjs.Dayjs): string {
  let date: Date;
  if (typeof input === "string") {
    if (/^\d+$/.test(input)) {
      date = new Date(Number(input));
    } else {
      date = new Date(input);
    }
  } else if (typeof input === "number") {
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
export function formatDateForDatapack(day: Dayjs) {
  return day.format("YYYY-MM-DD");
}

export function hasLeadingTrailingWhiteSpace(input: string) {
  return input.trim() !== input;
}

export function getActiveWorkshops(workshops: SharedWorkshop[]) {
  const now = new Date();
  const activeWorkshops = workshops.filter(
    (workshop) => workshop.active && new Date(workshop.start) <= now && new Date(workshop.end) >= now
  );
  return activeWorkshops;
}
export function getUpcomingWorkshops(workshops: SharedWorkshop[]) {
  const now = new Date();
  const upcomingWorkshops = workshops.filter((workshop) => !workshop.active && new Date(workshop.start) > now);
  return upcomingWorkshops;
}
export function getPastWorkshops(workshops: SharedWorkshop[]) {
  const now = new Date();
  const pastWorkshops = workshops.filter((workshop) => new Date(workshop.end) < now);
  return pastWorkshops;
}
export function getMapImageUrl(mapInfo: MapInfo[string]) {
  return devSafeUrl(`/map-image/${mapInfo.datapackTitle}/${mapInfo.uuid}/${mapInfo.img}`);
}

export async function downloadFile(blob: Blob, filename: string) {
  const reader = new FileReader();
  reader.readAsDataURL(blob);
  await new Promise((resolve, reject) => {
    reader.onloadend = resolve;
    reader.onerror = reject;
  });
  if (typeof reader.result !== "string") {
    throw new Error("Invalid file");
  }
  const fileURL = reader.result;
  if (!fileURL) throw new Error("Invalid file");
  const aTag = document.createElement("a");
  aTag.href = fileURL;

  aTag.setAttribute("download", filename);

  document.body.appendChild(aTag);
  aTag.click();
  aTag.remove();
}

export function attachTscPrefixToName(name: string, displayType: DisplayedColumnTypes): string {
  switch (displayType) {
    case "RootColumn":
    case "MetaColumn":
    case "BlockSeriesMetaColumn":
      return `class datastore.${displayType}:` + name;
    default:
      return `class datastore.${displayType}Column:` + name;
  }
}

export const generatePath = (title: string, parentPath = ""): string => {
  return `${parentPath}/${title}`;
};

export function getWorkshopCoverImage(workshopId: number) {
  return devSafeUrl(`/workshop-images/${workshopId}`);
}

export function getHelpKeysFromPath(path: string) {
  path = decodeURIComponent(path);
  const keys = path.split("/help/")[1]?.split("/") || [];
  return keys;
}

export async function convertBase64ToBlob(
  b64Data: string,
  contentType = "application/octet-stream",
  sliceSize = 512
): Promise<Blob> {
  const byteCharacters = atob(b64Data);
  const byteArrays: Uint8Array[] = [];

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    byteArrays.push(new Uint8Array(byteNumbers));
  }

  return new Blob(byteArrays, { type: contentType });
}
