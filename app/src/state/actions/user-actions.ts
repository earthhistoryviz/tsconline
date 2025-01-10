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
  fetchDatapack
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
  assertWorkshopDatapack
} from "@tsconline/shared";
import { state } from "../state";
import { doesDatapackExistInCurrentConfig } from "../non-action-util";

export const setEditRequestInProgress = action((inProgress: boolean) => {
  state.datapackProfilePage.editRequestInProgress = inProgress;
});

export const handleDatapackEdit = action(
  async (originalDatapack: Datapack, editedDatapack: EditableDatapackMetadata) => {
    try {
      setEditRequestInProgress(true);
      if (!state.user.uuid) {
        pushError(ErrorCodes.NOT_LOGGED_IN);
        return null;
      }
      const formData = new FormData();
      for (const key in editedDatapack) {
        const castedKey = key as keyof EditableDatapackMetadata;
        if (editedDatapack[castedKey] === null) continue;
        if (JSON.stringify(editedDatapack[castedKey]) !== JSON.stringify(originalDatapack[castedKey])) {
          if (castedKey === "tags" || castedKey === "references") {
            formData.append(castedKey, JSON.stringify(editedDatapack[castedKey]));
            continue;
          }
          formData.append(castedKey, editedDatapack[castedKey] as string);
        }
      }
      if (Array.from(formData.keys()).length === 0) {
        pushSnackbar("No changes made", "info");
        setDatapackProfilePageEditMode(false);
        return null;
      }
      try {
        const recaptcha = await getRecaptchaToken("handleDatapackEdit");
        if (!recaptcha) return null;
        const response = await fetcher(`/user/datapack/${originalDatapack.title}`, {
          method: "PATCH",
          body: formData,
          credentials: "include",
          headers: {
            "recaptcha-token": recaptcha
          }
        });
        if (response.ok) {
          pushSnackbar("Datapack updated", "success");
          const datapack = await refetchDatapack(
            { title: editedDatapack.title, type: "user", uuid: state.user.uuid },
            { title: originalDatapack.title, type: "user", uuid: state.user.uuid }
          );
          if (!datapack) return null;
          resetEditableDatapackMetadata(datapack);
          removeAllErrors();
          return datapack;
        } else {
          try {
            const error = await response.json();
            assertBatchUpdateServerPartialError(error);
            for (const err of error.errors) {
              pushSnackbar(err, "warning");
            }
          } catch (e) {
            displayServerError(
              response.statusText,
              ErrorCodes.USER_EDIT_DATAPACK_FAILED,
              ErrorMessages[ErrorCodes.USER_EDIT_DATAPACK_FAILED]
            );
          }
          return null;
        }
      } catch (e) {
        pushError(ErrorCodes.SERVER_RESPONSE_ERROR);
      }
    } finally {
      setEditRequestInProgress(false);
    }
    return null;
  }
);

export const refetchDatapack = action(
  async (editedDatapack: DatapackUniqueIdentifier, originalDatapack: DatapackUniqueIdentifier) => {
    const datapack = await fetchDatapack(editedDatapack.type, editedDatapack.title);
    if (datapack) {
      removeDatapack(originalDatapack);
      addDatapack(datapack);
      return datapack;
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
        response.statusText,
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
        response.statusText,
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
      const datapack = await refetchDatapack(datapackUniqueIdentifier, datapackUniqueIdentifier);
      if (!datapack) return;
      removeAllErrors();
      // if selected in the config, force a reprocess of the config
      if (doesDatapackExistInCurrentConfig(datapackUniqueIdentifier, state.config.datapacks)) {
        await processDatapackConfig(toJS(state.config.datapacks), undefined, true);
      }
      return datapack;
    } else {
      displayServerError(
        response.statusText,
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
      const datapackUniqueIdentifier: DatapackUniqueIdentifier = { title: id, type: "user", uuid: state.user.uuid };
      const datapack = await refetchDatapack(datapackUniqueIdentifier, datapackUniqueIdentifier);
      if (!datapack) return;
      removeAllErrors();
      setDatapackProfilePageImageVersion(new Date().getTime());
    } else {
      displayServerError(
        response.statusText,
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
