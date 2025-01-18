import { action } from "mobx";
import { fetcher } from "../../util";
import {
  addDatapack,
  getRecaptchaToken,
  pushError,
  pushSnackbar,
  removeDatapack,
  fetchDatapack
} from "./general-actions";
import { displayServerError } from "./util-actions";
import { ErrorCodes, ErrorMessages } from "../../util/error-codes";
import { DatapackFetchParams } from "../../types";
import {
  Datapack,
  DatapackUniqueIdentifier,
  assertDatapack,
  assertUserDatapack,
  assertWorkshopDatapack
} from "@tsconline/shared";
import { state } from "../state";

export const setEditRequestInProgress = action((inProgress: boolean) => {
  state.datapackProfilePage.editRequestInProgress = inProgress;
});

/**
 * Refetches the datapack from the server and replaces the original datapack with the new one. If used to refetch private user datapacks or workshop datapacks, you must make sure recaptcha is loaded before calling this function.
 */
export const refetchDatapack = action(
  async (editedMetadata: DatapackFetchParams, originalDatapack: DatapackUniqueIdentifier) => {
    const datapack = await fetchDatapack(editedMetadata);
    if (datapack) {
      removeDatapack(originalDatapack);
      addDatapack(datapack);
      return datapack;
    } else {
      return null;
    }
  }
);

export const fetchPublicUserDatapack = action(
  async (datapack: string, uuid: string, options?: { signal?: AbortSignal }) => {
    try {
      const response = await fetcher(`/user/uuid/${uuid}/datapack/${datapack}`, options);
      if (response.ok) {
        const data = await response.json();
        assertUserDatapack(data);
        assertDatapack(data);
        return data;
      } else {
        displayServerError(
          response.statusText,
          ErrorCodes.USER_FETCH_DATAPACK_FAILED,
          ErrorMessages[ErrorCodes.USER_FETCH_DATAPACK_FAILED]
        );
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      pushError(ErrorCodes.SERVER_RESPONSE_ERROR);
    }
  }
);

export const fetchUserDatapack = action(async (datapack: string, options?: { signal?: AbortSignal }) => {
  try {
    const recaptcha = await getRecaptchaToken("fetchUserDatapack");
    if (!recaptcha) return;
    const response = await fetcher(`/user/datapack/${datapack}`, {
      credentials: "include",
      headers: {
        "recaptcha-token": recaptcha
      },
      ...options
    });
    if (response.ok) {
      const data = await response.json();
      assertUserDatapack(data);
      assertDatapack(data);
      return data;
    } else {
      displayServerError(
        response.statusText,
        ErrorCodes.USER_FETCH_DATAPACK_FAILED,
        ErrorMessages[ErrorCodes.USER_FETCH_DATAPACK_FAILED]
      );
    }
  } catch (e) {
    if ((e as Error).name === "AbortError") return;
    pushError(ErrorCodes.SERVER_RESPONSE_ERROR);
  }
});

export const fetchWorkshopDatapack = action(
  async (workshopUUID: string, datapack: string, options?: { signal?: AbortSignal }) => {
    try {
      const recaptcha = await getRecaptchaToken("fetchWorkshopDatapack");
      if (!recaptcha) return;
      const response = await fetcher(`/user/workshop/${workshopUUID}/datapack/${datapack}`, {
        credentials: "include",
        headers: {
          "recaptcha-token": recaptcha
        },
        ...options
      });
      if (response.ok) {
        const data = await response.json();
        assertWorkshopDatapack(data);
        assertDatapack(data);
        return data;
      } else {
        displayServerError(
          response.statusText,
          ErrorCodes.WORKSHOP_FETCH_DATAPACK_FAILED,
          ErrorMessages[ErrorCodes.WORKSHOP_FETCH_DATAPACK_FAILED]
        );
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      pushError(ErrorCodes.SERVER_RESPONSE_ERROR);
    }
  }
);

export const userDeleteDatapack = action(async (datapack: string) => {
  try {
    const recaptcha = await getRecaptchaToken("userDeleteDatapack");
    if (!recaptcha) return;
    const response = await fetcher(`/user/datapack/${datapack}`, {
      method: "DELETE",
      credentials: "include",
      headers: {
        "recaptcha-token": recaptcha
      }
    });
    if (response.ok) {
      removeDatapack({ title: datapack, type: "user", uuid: state.user.uuid });
      pushSnackbar(`Datapack ${datapack} deleted`, "success");
    } else {
      displayServerError(
        response.statusText,
        ErrorCodes.USER_DELETE_DATAPACK_FAILED,
        ErrorMessages[ErrorCodes.USER_DELETE_DATAPACK_FAILED]
      );
    }
  } catch (e) {
    pushError(ErrorCodes.SERVER_RESPONSE_ERROR);
  }
});

export const setDatapackImageOnDatapack = action((datapack: Datapack, image: string) => {
  datapack.datapackImage = image;
});
