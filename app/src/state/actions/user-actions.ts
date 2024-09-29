import { action, runInAction } from "mobx";
import { fetcher } from "../../util";
import {
  addDatapackToUserDatapackIndex,
  getRecaptchaToken,
  pushError,
  pushSnackbar,
  removeDatapackFromUserDatapackIndex,
  setDatapackProfilePageEditMode,
  setEditableDatapackMetadata
} from "./general-actions";
import { displayServerError } from "./util-actions";
import { ErrorCodes, ErrorMessages } from "../../util/error-codes";
import { state } from "../state";
import { EditableDatapackMetadata } from "../../types";
import { assertDatapack, assertPrivateUserDatapack } from "@tsconline/shared";

export const handleDatapackEdit = action(
  async (originalDatapack: EditableDatapackMetadata, editedDatapack: EditableDatapackMetadata) => {
    const body = {} as Partial<EditableDatapackMetadata>;
    for (const key in editedDatapack) {
      const castedKey = key as keyof EditableDatapackMetadata;
      if (editedDatapack[castedKey] !== originalDatapack[castedKey]) {
        Object.assign(body, { [castedKey]: editedDatapack[castedKey] });
      }
    }
    if (Object.keys(body).length === 0) {
      pushSnackbar("No changes made", "info");
      setDatapackProfilePageEditMode(false);
      return;
    }
    try {
      const recaptcha = await getRecaptchaToken("handleDatapackEdit");
      if (!recaptcha) return;
      const response = await fetcher(`/user/datapack/${originalDatapack.title}`, {
        method: "PATCH",
        body: JSON.stringify(body),
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "recaptcha-token": recaptcha
        }
      });
      if (response.ok) {
        pushSnackbar("Datapack updated", "success");
        setEditableDatapackMetadata(editedDatapack);
        setDatapackProfilePageEditMode(false);
        const datapack = await fetchUserDatapack(editedDatapack.title);
        if (!datapack) return;
        addDatapackToUserDatapackIndex(editedDatapack.title, datapack);
        if (originalDatapack.title !== editedDatapack.title) {
          removeDatapackFromUserDatapackIndex(originalDatapack.title);
        }
      } else {
        displayServerError(
          response,
          ErrorCodes.USER_EDIT_DATAPACK_FAILED,
          ErrorMessages[ErrorCodes.USER_EDIT_DATAPACK_FAILED]
        );
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
      assertPrivateUserDatapack(data);
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
      runInAction(() => {
        delete state.datapackCollection.privateUserDatapackIndex[datapack];
      });
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
