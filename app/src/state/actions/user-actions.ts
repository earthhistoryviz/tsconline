import { action, runInAction } from "mobx";
import { fetcher } from "../../util";
import { getRecaptchaToken, pushError, pushSnackbar } from "./general-actions";
import { displayServerError } from "./util-actions";
import { ErrorCodes, ErrorMessages } from "../../util/error-codes";
import { state } from "../state";
import { EditableDatapackMetadata } from "../../types";

export const handleDatapackEdit = action(async (datapack: EditableDatapackMetadata) => {
  const formData = new FormData();
  for (const key in datapack) {
    const value = datapack[key as keyof EditableDatapackMetadata];
    if (value !== undefined) formData.append(key, String(value));
  }
  try {
    const recaptcha = await getRecaptchaToken("handleDatapackEdit");
    if (!recaptcha) return;
    const response = await fetcher(`/user/datapack/${datapack.title}`, {
      method: "PATCH",
      body: formData,
      credentials: "include",
      headers: {
        "recaptcha-token": recaptcha
      }
    });
    if (response.ok) {
      pushSnackbar("Datapack updated", "success");
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
