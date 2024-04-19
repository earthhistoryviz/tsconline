import { ErrorCodes } from "../../util/error-codes";
import { pushError, pushSnackbar } from "./general-actions";
import { isServerResponseError } from "@tsconline/shared";

/**
 * Display error to dialog popup, same as pushError but with a message logged to console (Use this for server response errors)
 * @param error the error thrown
 * @param response the response from the server if applicable (nullable)
 * @param message the message to be shown
 */
export function displayServerError<T>(response: T | null, context: ErrorCodes, message: string) {
  if (!response) {
    pushError(context);
  } else if (isServerResponseError(response)) {
    console.log(`${message} with server response: ${response.error}`);
    pushError(context);
  } else {
    console.log(`${message} with server response: ${response}\n`);
    pushError(context);
  }
}

export function convertHexToRGB(hex: string, returnAsString: boolean = false): RGB | string {
  if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex)) {
    throw new Error("Invalid hexadecimal color code");
  }
  hex = hex.slice(1);

  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
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
