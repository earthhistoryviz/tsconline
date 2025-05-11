import { ColumnInfo, RGB, assertEventSettings, assertPointSettings } from "@tsconline/shared";
import Color from "color";
import { dualColCompPrefix } from "./constant";
import { RenderColumnInfo } from "../types";
import { observable } from "mobx";

/**
 * removes the prefix of a column id in the tsc format
 * ex. "class datastore.EventColumn:Miocene-Paleocene Oxy-18 events" -> "Miocene-Paleocene Oxy-18 events"
 * @param name
 * @returns
 */

export function discardTscPrefix(name: string | null) {
  if (!name) {
    return "";
  }
  //doesn't have colon delimiter
  if (name.split(":").length < 2) {
    return name;
  }
  return name.split(":")[1];
}

export function prependDualColCompColumnName(text: string): string {
  return dualColCompPrefix + text;
}

/**
 * Returns if the datapoint range (minDataAge, maxDataAge) is inside the user selected range of (userTopAge, userBaseAge)
 * @param minDataAge
 * @param maxDataAge
 * @param userTopAge
 * @param userBaseAge
 * @returns
 */
export function checkIfDataIsInRange(minDataAge: number, maxDataAge: number, userTopAge: number, userBaseAge: number) {
  if (userBaseAge <= userTopAge) {
    return false;
  }

  // once we finish datapack parsing we should not have any at 99999 and -99999
  if ((minDataAge == 99999 && maxDataAge == -99999) || (minDataAge == 0 && maxDataAge == 0)) {
    return true;
  }

  if (minDataAge <= userTopAge && maxDataAge >= userBaseAge) {
    return true;
  }
  return (minDataAge > userTopAge && minDataAge < userBaseAge) || (maxDataAge < userBaseAge && maxDataAge > userTopAge);
}

export function checkIfDccColumn(column: RenderColumnInfo) {
  if (column.columnDisplayType === "Event") {
    assertEventSettings(column.columnSpecificSettings);
  } else if (column.columnDisplayType === "Point") {
    assertPointSettings(column.columnSpecificSettings);
  } else {
    return false;
  }
  if (column.columnSpecificSettings.dualColCompColumnRef) {
    return true;
  }
}

export const willColumnBeVisibleOnChart = (
  column: RenderColumnInfo,
  columnHashMap: Map<string, RenderColumnInfo>
): boolean => {
  if (!column.on) return false;
  // reached the top, so it will be visible
  if (!column.parent) return true;
  const parent = columnHashMap.get(column.parent);
  if (!parent) {
    console.log("WARNING: tried to get", column.parent, "in columnHashMap, but is undefined");
    return false;
  }
  return willColumnBeVisibleOnChart(parent, columnHashMap);
};

/**
 * Compare viewport height and px height
 * returns 1 if vh greater than px, -1 if less, 0 if equal
 * @param vh
 * @param px
 * @returns
 */
export function compareVhAndPx(vh: number | string, px: number | string): number {
  if (typeof vh === "string") {
    if (vh.length <= 2 || vh.slice(-2) !== "vh") throw Error(`vh param in wrong format ${vh}`);
    vh = Number(vh.slice(0, -2));
    if (isNaN(vh)) throw Error(`vh param in wrong format ${vh}`);
  }
  if (typeof px === "string") {
    if (px.length <= 2 || px.slice(-2) !== "px") throw Error(`px param in wrong format ${px}`);
    px = Number(px.slice(0, -2));
    if (isNaN(px)) throw Error(`px param in wrong format ${px}`);
  }
  const viewportHeight = window.innerHeight;
  const vhToPx = viewportHeight * (vh / 100);

  if (vhToPx > px) {
    return 1;
  } else if (vhToPx < px) {
    return -1;
  } else {
    return 0;
  }
}

/**
 * Returns -1 if a < b, 1 if a > b, 0 if a = b (alphabetically sort a-z)
 * @param a
 * @param b
 */
export function compareStrings(a: string, b: string) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * trim the first and last character (most likely quotes) (will not check if it is though)
 * @param input
 * @returns
 */
export function trimQuotes(input: string): string {
  if (input.startsWith('"') && input.endsWith('"')) {
    return input.slice(1, -1);
  }
  return input;
}

export function convertHexToRGB(hex: string, returnAsString: false): RGB;
export function convertHexToRGB(hex: string, returnAsString: true): string;

export function convertHexToRGB(hex: string, returnAsString: boolean = false): RGB | string {
  if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex)) {
    throw new Error("Invalid hexadecimal color code");
  }
  hex = hex.slice(1);

  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((char) => char + char)
      .join("");
  }

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const rgb: RGB = { r, g, b };

  if (returnAsString) {
    return `rgb(${r},${g},${b})`;
  }

  return rgb;
}

export function convertRgbToString(rgb: RGB): string {
  return `rgb(${rgb.r},${rgb.g},${rgb.b})`;
}

export function convertTSCColorToRGB(text: string): RGB {
  const rgb = text.substring(4, text.length - 1).split(",");
  return {
    r: Number(rgb[0]),
    g: Number(rgb[1]),
    b: Number(rgb[2])
  };
}

/**
 * needed for display purposes since -0 == 0 but we want to display -0 as 0 and not -0
 * @param value
 * @returns
 */
export function normalizeZero(value: number): number {
  return value === 0 ? 0 : value;
}

export function createGradient(color1: string, color2: string) {
  try {
    const colorObj1 = Color(color1);
    const colorObj2 = Color(color2);
    const gradient = `linear-gradient(90deg, ${color1} 0%, ${color2} 100%)`;

    return {
      main: gradient,
      light: `linear-gradient(90deg, ${colorObj1.lighten(0.2).hex()} 0%, ${colorObj2.lighten(0.2).hex()} 100%)`,
      dark: `linear-gradient(90deg, ${colorObj1.darken(0.2).hex()} 0%, ${colorObj2.darken(0.2).hex()} 100%)`,
      contrastText: getContrastText(color1)
    };
  } catch (e) {
    console.error(e);
    return {
      main: color1,
      light: color1,
      dark: color1,
      contrastText: getContrastText(color1)
    };
  }
}

function getContrastText(color1: string) {
  try {
    const color = Color(color1);
    const luminance = color.luminosity();
    return luminance > 0.5 ? "#000000" : "#ffffff";
  } catch (e) {
    console.error(e);
    return "#000000";
  }
}

export function findSerialNum(name: string) {
  const firstBlankspaceIndex = name.indexOf(" ");
  const secondBlankspaceIndex = name.indexOf(" for");
  if (firstBlankspaceIndex === -1 || secondBlankspaceIndex === -1) {
    return 0;
  }
  const serialNumber = Number(name.substring(firstBlankspaceIndex + 1, secondBlankspaceIndex));
  if (isNaN(serialNumber)) {
    console.error("Failed to find the correct largest existing serial number");
    return 0;
  }
  return serialNumber;
}

export function convertColumnInfoToRenderColumnInfo(column: ColumnInfo): RenderColumnInfo {
  const renderColumn: RenderColumnInfo = observable(
    {
      ...column,
      columnRef: column,
      children: column.children.map((child) => child.name)
    },
    { columnRef: false }
  );
  return renderColumn;
}

export function getChildRenderColumns(
  parent: RenderColumnInfo,
  columnHashMap: Map<string, RenderColumnInfo>
): RenderColumnInfo[] {
  return parent.children
    .map((child) => {
      const childColumn = columnHashMap.get(child);
      if (!childColumn) {
        console.error("Failed to find child column", child, "in columnHashMap");
        return null;
      }
      return childColumn;
    })
    .filter((child): child is RenderColumnInfo => child !== null);
}
