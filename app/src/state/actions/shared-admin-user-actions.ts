import {
  Datapack,
  assertBatchUpdateServerPartialError,
  assertDatapackUniqueIdentifier,
  DatapackUniqueIdentifier
} from "@tsconline/shared";
import { action, toJS } from "mobx";
import { EditableDatapackMetadata } from "../../types";
import { fetcher } from "../../util";
import { ErrorCodes, ErrorMessages } from "../../util/error-codes";
import { state } from "../state";
import {
  pushError,
  pushSnackbar,
  setDatapackProfilePageEditMode,
  getRecaptchaToken,
  resetEditableDatapackMetadata,
  removeAllErrors,
  processDatapackConfig
} from "./general-actions";
import { setEditRequestInProgress, refetchDatapack } from "./user-actions";
import { displayServerError } from "./util-actions";
import { compareExistingDatapacks, doesDatapackExistInCurrentConfig } from "../non-action-util";

export const handleDatapackEdit = action(
  async (originalDatapack: Datapack, editedDatapack: EditableDatapackMetadata) => {
    try {
      setEditRequestInProgress(true);
      if (!state.user.uuid) {
        pushError(ErrorCodes.NOT_LOGGED_IN);
        return false;
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
        return false;
      }
      try {
        const recaptcha = await getRecaptchaToken("handleDatapackEdit");
        if (!recaptcha) return false;
        const response = await fetcher(getEditDatapackRoute(originalDatapack), {
          method: "PATCH",
          body: formData,
          credentials: "include",
          headers: {
            "recaptcha-token": recaptcha
          }
        });
        if (response.ok) {
          pushSnackbar("Datapack updated", "success");
          setDatapackProfilePageEditMode(false);
          const datapackUniqueIdentifier = {
            title: editedDatapack.title,
            type: editedDatapack.type,
            ...("uuid" in originalDatapack && { uuid: originalDatapack.uuid })
          };
          assertDatapackUniqueIdentifier(datapackUniqueIdentifier);
          const datapack = await refetchDatapack(datapackUniqueIdentifier, originalDatapack);
          if (!datapack) return false;
          resetEditableDatapackMetadata(datapack);
          removeAllErrors();
          return true;
        } else {
          try {
            const error = await response.json();
            assertBatchUpdateServerPartialError(error);
            for (const err of error.errors) {
              pushSnackbar(err, "warning");
            }
          } catch (e) {
            displayServerError(
              response,
              ErrorCodes.USER_EDIT_DATAPACK_FAILED,
              ErrorMessages[ErrorCodes.USER_EDIT_DATAPACK_FAILED]
            );
          }
          return false;
        }
      } catch (e) {
        pushError(ErrorCodes.SERVER_RESPONSE_ERROR);
      }
    } finally {
      setEditRequestInProgress(false);
    }
  }
);

/**
 *
 * @param datapack the datapack (original)
 * @returns
 */
const getEditDatapackRoute = (datapack: DatapackUniqueIdentifier) => {
  switch (datapack.type) {
    case "official": {
      return `/admin/official/datapack/${datapack.title}`;
    }
    case "workshop": {
      return `/workshop/${datapack.uuid}/datapack/${datapack.title}`;
    }
    case "user": {
      return `/user/datapack/${datapack.title}`;
    }
    default: {
      return "";
    }
  }
};

export const replaceDatapackFile = action(async (datapackUniqueIdentifier: DatapackUniqueIdentifier, file: File) => {
  try {
    setEditRequestInProgress(true);
    if (!state.user.uuid) {
      pushError(ErrorCodes.NOT_LOGGED_IN);
      return false;
    }
    const recaptcha = await getRecaptchaToken("replaceUserDatapackFile");
    if (!recaptcha) return;
    const formData = new FormData();
    formData.append("datapack", file);
    const response = await fetcher(getEditDatapackRoute(datapackUniqueIdentifier), {
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
        await processDatapackConfig(
          toJS(state.config.datapacks.filter((dp) => !compareExistingDatapacks(datapackUniqueIdentifier, dp))),
          undefined,
          true
        );
        pushSnackbar("Datapack must be reselected to generate a chart", "info");
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

export const replaceProfileImageFile = action(
  async (datapackUniqueIdentifier: DatapackUniqueIdentifier, file: File) => {
    try {
      setEditRequestInProgress(true);
      if (!state.user.uuid) {
        pushError(ErrorCodes.NOT_LOGGED_IN);
        return false;
      }
      const recaptcha = await getRecaptchaToken("replaceUserProfileImageFile");
      if (!recaptcha) return;
      const formData = new FormData();
      formData.append("datapack-image", file);
      const response = await fetcher(getEditDatapackRoute(datapackUniqueIdentifier), {
        method: "PATCH",
        body: formData,
        credentials: "include",
        headers: {
          "recaptcha-token": recaptcha
        }
      });
      if (response.ok) {
        pushSnackbar("Image replaced", "success");
        const datapack = await refetchDatapack(datapackUniqueIdentifier, datapackUniqueIdentifier);
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
  }
);
export const setDatapackProfilePageImageVersion = action(async (datapackVersion: number) => {
  state.datapackProfilePage.datapackImageVersion = datapackVersion;
});
