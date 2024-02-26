import { pushError } from "./GeneralActions";
import { isServerResponseError } from "@tsconline/shared"

/**
 * Display error to dialog popup
 * @param error the error thrown
 * @param response the response from the server if applicable (nullable)
 * @param message the message to be shown
 */
export function displayError(error: any, response: any, message: string) {
  if (!response) {
    pushError(message);
  } else if (isServerResponseError(response)) {
    console.log(`${message} with server response: ${response.error}`);
    pushError(response.error);
  } else {
    console.log(
      `${message} with server response: ${response}\n Error: ${error}`
    );
    pushError(message);
  }
}