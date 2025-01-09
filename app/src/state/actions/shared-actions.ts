import { OfficialDatapack, Datapack, assertBatchUpdateServerPartialError, DatapackUniqueIdentifier, isOfficialDatapack, assertDatapackUniqueIdentifier } from "@tsconline/shared";
import { action } from "mobx";
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
    removeAllErrors
} from "./general-actions";
import { setEditRequestInProgress, refetchDatapack } from "./user-actions";
import { displayServerError } from "./util-actions";

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
                        ...(!isOfficialDatapack(originalDatapack) && { uuid: state.user.uuid })
                    };
                    assertDatapackUniqueIdentifier(datapackUniqueIdentifier);
                    const datapack = await refetchDatapack(datapackUniqueIdentifier);
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
const getEditDatapackRoute = (datapack: Datapack) => {
    switch (datapack.type) {
        case "official": {
            return `/admin/official/datapack/${datapack.title}`
        }
        case "workshop":
        case "user": {
            return `/user/datapack/${datapack.title}`;
        }
        default: {
            return "";
        }
    }
}
