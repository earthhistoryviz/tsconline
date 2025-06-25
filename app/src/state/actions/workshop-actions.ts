import { action, runInAction } from "mobx";
import { fetcher } from "../../util";
import { SharedWorkshop, assertSharedWorkshopArray } from "@tsconline/shared";
import { state } from "../state";
import { displayServerError } from "./util-actions";
import { ErrorCodes, ErrorMessages } from "../../util/error-codes";
import { getRecaptchaToken, pushError } from "./general-actions";
import { downloadFile } from "../non-action-util";

export const fetchAllWorkshops = action(async () => {
  try {
    const response = await fetcher("/workshop");
    if (response.ok) {
      const workshops = await response.json();
      assertSharedWorkshopArray(workshops);
      runInAction(() => {
        state.workshops = workshops;
      });
    } else {
      displayServerError(response, ErrorCodes.FETCH_WORKSHOPS_FAILED, ErrorMessages[ErrorCodes.FETCH_WORKSHOPS_FAILED]);
    }
  } catch (error) {
    console.error("Error fetching workshops:", error);
    displayServerError(null, ErrorCodes.FETCH_WORKSHOPS_FAILED, ErrorMessages[ErrorCodes.FETCH_WORKSHOPS_FAILED]);
  }
});

export const fetchWorkshopFilesForDownload = action(async (workshop: SharedWorkshop) => {
  const route = `/workshop/download/${workshop.workshopId}`;
  const recaptchaToken = await getRecaptchaToken("fetchWorkshopFilesForDownload");
  if (!recaptchaToken) return null;
  if (!state.isLoggedIn) {
    pushError(ErrorCodes.NOT_LOGGED_IN);
    return null;
  }
  const response = await fetcher(route, {
    method: "GET",
    credentials: "include",
    headers: {
      "recaptcha-token": recaptchaToken
    }
  });
  if (!response.ok) {
    let errorCode = ErrorCodes.SERVER_RESPONSE_ERROR;
    switch (response.status) {
      case 404:
        errorCode = ErrorCodes.WORKSHOP_FILE_NOT_FOUND_FOR_DOWNLOAD;
        break;
      case 401:
        errorCode = ErrorCodes.NOT_LOGGED_IN;
        break;
      case 403:
        errorCode = ErrorCodes.WORKSHOP_FILE_DOWNLOAD_NOT_AUTHORIZED;
        break;
    }
    displayServerError(response, errorCode, ErrorMessages[errorCode]);
    return;
  }
  const file = await response.blob();
  if (file) {
    try {
      await downloadFile(file, `FilesFor${workshop.title}.zip`);
    } catch (error) {
      pushError(ErrorCodes.UNABLE_TO_READ_FILE_OR_EMPTY_FILE);
    }
  }
});

export const fetchWorkshopFile = action(async (fileName: string, workshop: SharedWorkshop) => {
  const fileURL = `/workshop/workshop-files/${workshop.workshopId}/${encodeURIComponent(fileName)}`;
  const recaptchaToken = await getRecaptchaToken("fetchWorkshopFileForDownload");
  if (!recaptchaToken) return null;

  const response = await fetcher(fileURL, {
    method: "GET",
    credentials: "include",
    headers: {
      "recaptcha-token": recaptchaToken
    }
  });

  if (!response.ok) {
    let errorCode = ErrorCodes.SERVER_RESPONSE_ERROR;
    switch (response.status) {
      case 404:
        errorCode = ErrorCodes.WORKSHOP_FILE_NOT_FOUND_FOR_DOWNLOAD;
        break;
      case 401:
        errorCode = ErrorCodes.NOT_LOGGED_IN;
        break;
      case 500:
        errorCode = ErrorCodes.SERVER_RESPONSE_ERROR;
        break;
    }
    displayServerError(response, errorCode, ErrorMessages[errorCode]);
    return;
  }

  const file = await response.blob();
  console.log(response);
  if (file) {
    try {
      await downloadFile(file, fileName);
    } catch (error) {
      pushError(ErrorCodes.UNABLE_TO_READ_FILE_OR_EMPTY_FILE);
    }
  }
});

export const fetchWorkshopDetailsDatapack = action(async (datapackTitle: string, workshop: SharedWorkshop) => {
  const requestURL = `/workshop/workshop-datapack/${workshop.workshopId}/${datapackTitle}`;

  const recaptchaToken = await getRecaptchaToken("fetchWorkshopDataPackForDownload");
  if (!recaptchaToken) return null;

  const response = await fetcher(requestURL, {
    method: "GET",
    credentials: "include",
    headers: {
      "recaptcha-token": recaptchaToken
    }
  });

  if (!response.ok) {
    console.log(response);
    let errorCode = ErrorCodes.SERVER_RESPONSE_ERROR;
    switch (response.status) {
      case 404:
        errorCode = ErrorCodes.WORKSHOP_FILE_NOT_FOUND_FOR_DOWNLOAD;
        break;
      case 401:
        errorCode = ErrorCodes.NOT_LOGGED_IN;
        break;
      case 500:
        errorCode = ErrorCodes.SERVER_RESPONSE_ERROR;
        break;
    }
    displayServerError(response, errorCode, ErrorMessages[errorCode]);
    return;
  }

  const file = await response.blob();
  if (file) {
    try {
      await downloadFile(file, "Unknown");
    } catch (error) {
      pushError(ErrorCodes.UNABLE_TO_READ_FILE_OR_EMPTY_FILE);
    }
  }
});
