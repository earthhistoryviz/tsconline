import { action } from "mobx";
import { fetcher } from "../../util";
import {
  addDatapack,
  getRecaptchaToken,
  pushError,
  pushSnackbar,
  removeDatapack,
  fetchOfficialDatapack,
  fetchAllPublicDatapacks,
  fetchUserDatapacks
} from "./general-actions";
import { displayServerError } from "./util-actions";
import { ErrorCodes, ErrorMessages } from "../../util/error-codes";
import {
  Datapack,
  DatapackUniqueIdentifier,
  assertDatapack,
  assertUserDatapack,
  assertWorkshopDatapack,
  isOfficialDatapack,
  isUserDatapack,
  isWorkshopDatapack
} from "@tsconline/shared";
import { state } from "../state";

export const setEditRequestInProgress = action((inProgress: boolean) => {
  state.datapackProfilePage.editRequestInProgress = inProgress;
});

export const refetchDatapack = action(
  async (editedDatapack: DatapackUniqueIdentifier, originalDatapack: DatapackUniqueIdentifier) => {
    let fetchedDatapack;
    if (isWorkshopDatapack(editedDatapack)) {
      // TODO change this in @Aditya's PR (he makes the workshop fetcher)
      // until then, we cannot navigate since we can't find the workshop datapack through fetching specifically
      await fetchUserDatapacks();
      removeDatapack(originalDatapack);
    } else if (isUserDatapack(editedDatapack)) {
      fetchedDatapack = await fetchUserDatapack(editedDatapack.title);
    } else if (isOfficialDatapack(editedDatapack)) {
      fetchedDatapack = await fetchOfficialDatapack(editedDatapack.title);
    }
    if (fetchedDatapack) {
      removeDatapack(originalDatapack);
      addDatapack(fetchedDatapack);
      return fetchedDatapack;
    } else {
      return null;
    }
  }
);

export const fetchUserDatapack = action(async (datapack: string) => {
  try {
    const recaptcha = await getRecaptchaToken("fetchUserDatapack");
    if (!recaptcha) return;
    const response = await fetcher(`/user/datapack/${datapack}`, {
      credentials: "include",
      headers: {
        "recaptcha-token": recaptcha
      }
    });
    if (response.ok) {
      const data = await response.json();
      assertUserDatapack(data);
      assertDatapack(data);
      return data;
    } else {
      displayServerError(
        response,
        ErrorCodes.USER_FETCH_DATAPACK_FAILED,
        ErrorMessages[ErrorCodes.USER_FETCH_DATAPACK_FAILED]
      );
    }
  } catch (e) {
    pushError(ErrorCodes.SERVER_RESPONSE_ERROR);
  }
});

export const fetchWorkshopDatapack = action(async (workshopUUID: string, datapack: string) => {
  try {
    const recaptcha = await getRecaptchaToken("fetchWorkshopDatapack");
    if (!recaptcha) return;
    const response = await fetcher(`/user/workshop/${workshopUUID}/datapack/${datapack}`, {
      credentials: "include",
      headers: {
        "recaptcha-token": recaptcha
      }
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
    pushError(ErrorCodes.SERVER_RESPONSE_ERROR);
  }
});

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
        response,
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
