import { action, toJS } from "mobx";
import { fetcher } from "../../util";
import {
  addDatapack,
  getRecaptchaToken,
  pushError,
  pushSnackbar,
  removeAllErrors,
  removeDatapack,
  setDatapackProfilePageEditMode,
  resetEditableDatapackMetadata,
  processDatapackConfig,
  fetchOfficialDatapack,
  fetchAllPublicDatapacks
} from "./general-actions";
import { displayServerError } from "./util-actions";
import { ErrorCodes, ErrorMessages } from "../../util/error-codes";
import { EditableDatapackMetadata } from "../../types";
import {
  Datapack,
  DatapackUniqueIdentifier,
  assertBatchUpdateServerPartialError,
  assertDatapack,
  assertUserDatapack,
  isOfficialDatapack,
  isUserDatapack,
  isWorkshopDatapack
} from "@tsconline/shared";
import { state } from "../state";
import { doesDatapackExistInCurrentConfig } from "../non-action-util";

export const setEditRequestInProgress = action((inProgress: boolean) => {
  state.datapackProfilePage.editRequestInProgress = inProgress;
});

export const refetchDatapack = action(async (datapack: DatapackUniqueIdentifier) => {
  let fetchedDatapack;
  if (isWorkshopDatapack(datapack)) {
    // change this in @Aditya's PR (he makes the workshop fetcher)
    fetchAllPublicDatapacks();
  } else if (isUserDatapack(datapack)) {
    fetchedDatapack = await fetchUserDatapack(datapack.title);
  } else if (isOfficialDatapack(datapack)) {
    fetchedDatapack = await fetchOfficialDatapack(datapack.title);
  }
  if (fetchedDatapack) {
    removeDatapack(datapack);
    addDatapack(fetchedDatapack);
    return fetchedDatapack;
  } else {
    return null;
  }
});

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

export const replaceUserDatapackFile = action(async (id: string, file: File) => {
  const datapackUniqueIdentifier: DatapackUniqueIdentifier = { title: id, type: "user", uuid: state.user.uuid };
  try {
    setEditRequestInProgress(true);
    const recaptcha = await getRecaptchaToken("replaceUserDatapackFile");
    if (!recaptcha) return;
    const formData = new FormData();
    formData.append("datapack", file);
    const response = await fetcher(`/user/datapack/${id}`, {
      method: "PATCH",
      body: formData,
      credentials: "include",
      headers: {
        "recaptcha-token": recaptcha
      }
    });
    if (response.ok) {
      pushSnackbar("File replaced", "success");
      const datapack = await refetchDatapack(datapackUniqueIdentifier);
      if (!datapack) return;
      removeAllErrors();
      // if selected in the config, force a reprocess of the config
      if (doesDatapackExistInCurrentConfig(datapackUniqueIdentifier, state.config.datapacks)) {
        await processDatapackConfig(toJS(state.config.datapacks), undefined, true);
      }
    } else {
      displayServerError(
        response,
        ErrorCodes.USER_REPLACE_DATAPACK_FILE_FAILED,
        ErrorMessages[ErrorCodes.USER_REPLACE_DATAPACK_FILE_FAILED]
      );
    }
  } catch (e) {
    pushError(ErrorCodes.SERVER_RESPONSE_ERROR);
  } finally {
    setEditRequestInProgress(false);
  }
});

export const setDatapackImageOnDatapack = action((datapack: Datapack, image: string) => {
  datapack.datapackImage = image;
});

export const replaceUserProfileImageFile = action(async (id: string, file: File) => {
  try {
    setEditRequestInProgress(true);
    const recaptcha = await getRecaptchaToken("replaceUserProfileImageFile");
    if (!recaptcha) return;
    const formData = new FormData();
    formData.append("datapack-image", file);
    const response = await fetcher(`/user/datapack/${id}`, {
      method: "PATCH",
      body: formData,
      credentials: "include",
      headers: {
        "recaptcha-token": recaptcha
      }
    });
    if (response.ok) {
      pushSnackbar("Image replaced", "success");
      const datapack = await refetchDatapack({ title: id, type: "user", uuid: state.user.uuid });
      if (!datapack) return;
      removeAllErrors();
      setDatapackProfilePageImageVersion(new Date().getTime());
    } else {
      displayServerError(
        response,
        ErrorCodes.USER_REPLACE_DATAPACK_PROFILE_IMAGE_FAILED,
        ErrorMessages[ErrorCodes.USER_REPLACE_DATAPACK_PROFILE_IMAGE_FAILED]
      );
    }
  } catch (e) {
    pushError(ErrorCodes.SERVER_RESPONSE_ERROR);
  } finally {
    setEditRequestInProgress(false);
  }
});
export const setDatapackProfilePageImageVersion = action(async (datapackVersion: number) => {
  state.datapackProfilePage.datapackImageVersion = datapackVersion;
});
