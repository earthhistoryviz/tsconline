import { action } from "mobx";
import { actions, state } from "..";
import { executeRecaptcha, fetcher } from "../../util";
import { ErrorCodes, ErrorMessages } from "../../util/error-codes";
import {
  AdminSharedUser,
  assertAdminSharedUserArray} from "@tsconline/shared";
import { displayServerError } from "./util-actions";

export const fetchUsers = action(async () => {
  let recaptchaToken: string;
  try {
    recaptchaToken = await executeRecaptcha("displayUsers");
    if (!recaptchaToken) {
      actions.pushError(ErrorCodes.RECAPTCHA_FAILED);
      return;
    }
  } catch (error) {
    actions.pushError(ErrorCodes.RECAPTCHA_FAILED);
    return;
  }
  try {
    const response = await fetcher("/admin/users", {
      method: "GET",
      headers: {
        "recaptcha-token": recaptchaToken
      },
      credentials: "include"
    });
    if (response.ok) {
      const json = await response.json();
      if (!json.users) {
        actions.pushError(ErrorCodes.FETCH_USERS_FAILED);
        return;
      }
      assertAdminSharedUserArray(json.users);
      setUsers(json.users);
    } else {
      displayServerError(
        await response.json(),
        ErrorCodes.FETCH_USERS_FAILED,
        ErrorMessages[ErrorCodes.FETCH_USERS_FAILED]
      );
    }
  } catch (error) {
    actions.pushError(ErrorCodes.FETCH_USERS_FAILED);
    return;
  }
});

export const setUsers = action((users: AdminSharedUser[]) => {
  state.admin.displayedUsers = users;
});

export const adminAddUser = action(async (email: string, password: string, isAdmin: boolean, username?: string) => {
  let recaptchaToken: string;
  try {
    recaptchaToken = await executeRecaptcha("displayUsers");
    if (!recaptchaToken) {
      actions.pushError(ErrorCodes.RECAPTCHA_FAILED);
      return;
    }
  } catch (error) {
    actions.pushError(ErrorCodes.RECAPTCHA_FAILED);
    return;
  }
  const body = JSON.stringify({
    email,
    password,
    isAdmin,
    username
  });
  const response = await fetcher("/admin/user", {
    method: "POST",
    headers: {
      "recaptcha-token": recaptchaToken
    },
    body
  });
});
