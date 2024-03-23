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

/**
 * Display snackbar
 * @param message the message to be shown
 */
export function displaySnackbar(message: string) {
  pushSnackbar(message);
}