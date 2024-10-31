import { action } from "mobx";
import { fetcher } from "../../util";
import {
  addDatapack,
  getRecaptchaToken,
  pushError,
  pushSnackbar,
  removeAllErrors,
  removeDatapack,
  setDatapackProfilePageEditMode,
  setEditableDatapackMetadata
} from "./general-actions";
import { displayServerError } from "./util-actions";
import { ErrorCodes, ErrorMessages } from "../../util/error-codes";
import { EditableDatapackMetadata } from "../../types";
import { assertDatapack, assertUserDatapack } from "@tsconline/shared";

export const handleDatapackEdit = action(
  async (originalDatapack: EditableDatapackMetadata, editedDatapack: EditableDatapackMetadata) => {
    const formData = new FormData();
    for (const key in editedDatapack) {
      const castedKey = key as keyof EditableDatapackMetadata;
      if (editedDatapack[castedKey] !== originalDatapack[castedKey]) {
        if (castedKey === "tags" || castedKey === "references") {
          formData.append(castedKey, JSON.stringify(editedDatapack[castedKey]));
          continue;
        }
        formData.append(castedKey, editedDatapack[castedKey] as string);
      }
    }
    if(Array.from(formData.keys()).length === 0) {
      pushSnackbar("No changes made", "info");
      setDatapackProfilePageEditMode(false);
      return false;
    }
    try {
      const recaptcha = await getRecaptchaToken("handleDatapackEdit");
      if (!recaptcha) return false;
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
        setEditableDatapackMetadata(editedDatapack);
        setDatapackProfilePageEditMode(false);
        const datapack = await fetchUserDatapack(editedDatapack.title);
        if (!datapack) return false;
        addDatapack(datapack);
        if (originalDatapack.title !== editedDatapack.title) {
          removeDatapack(originalDatapack);
        }
        removeAllErrors();
        return true;
      } else {
        displayServerError(
          response,
          ErrorCodes.USER_EDIT_DATAPACK_FAILED,
          ErrorMessages[ErrorCodes.USER_EDIT_DATAPACK_FAILED]
        );
        return false;
      }
    } catch (e) {
      pushError(ErrorCodes.SERVER_RESPONSE_ERROR);
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
      removeDatapack({ title: datapack, type: "user" });
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
