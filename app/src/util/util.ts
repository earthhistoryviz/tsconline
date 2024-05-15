import { RGB } from "@tsconline/shared";

/**
 * Returns if the datapoint range (minDataAge, maxDataAge) is inside the user selected range of (userTopAge, userBaseAge)
 * @param minDataAge
 * @param maxDataAge
 * @param userTopAge
 * @param userBaseAge
 * @returns
 */
export function checkIfDataIsInRange(minDataAge: number, maxDataAge: number, userTopAge: number, userBaseAge: number) {
  if (userBaseAge == userTopAge) {
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
    return `rgb(${r}, ${g}, ${b})`;
  }

  return rgb;
}

export function convertRgbToString(rgb: RGB): string {
  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

export function convertTSCColorToRGB(text: string): RGB {
  const rgb = text.substring(4, text.length - 1).split(",");
  return {
    r: Number(rgb[0]),
    g: Number(rgb[1]),
    b: Number(rgb[2])
  };
}
