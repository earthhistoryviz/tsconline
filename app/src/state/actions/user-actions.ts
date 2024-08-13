import { action } from "mobx";
import { fetcher } from "../../util";
import { getRecaptchaToken, pushError, pushSnackbar } from "./general-actions";
import { displayServerError } from "./util-actions";
import { ErrorCodes, ErrorMessages } from "../../util/error-codes";

export const userDeleteDatapack = action(async (datapack: string) => {
    try {
        const recaptcha = await getRecaptchaToken("userDeleteDatapack")
        if (!recaptcha) return;
        const response = await fetcher(`/user/datapack/${datapack}`, {
            method: "DELETE",
            credentials: "include",
            headers: {
                "recaptcha-token": recaptcha
            }
        })
        if (response.ok) {
            pushSnackbar(`Datapack ${datapack} deleted`, "success")
        } else {
            displayServerError(response, ErrorCodes.USER_DELETE_DATAPAACK_FAILED, ErrorMessages[ErrorCodes.USER_DELETE_DATAPAACK_FAILED])
        }
    } catch (e) {
        pushError(ErrorCodes.SERVER_RESPONSE_ERROR)
    }
})