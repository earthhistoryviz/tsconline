import { action } from "mobx";
import { state } from "..";
import { executeRecaptcha, fetcher } from "../../util";
import { ErrorCodes, ErrorMessages } from "../../util/error-codes";
import { AdminSharedUser, assertAdminSharedUserArray } from "@tsconline/shared";
import { displayServerError } from "./util-actions";
import { pushError, pushSnackbar } from "./general-actions";

export const fetchUsers = action(async () => {
  let recaptchaToken: string;
  try {
    recaptchaToken = await executeRecaptcha("displayUsers");
    if (!recaptchaToken) {
      pushError(ErrorCodes.RECAPTCHA_FAILED);
      return;
    }
  } catch (error) {
    pushError(ErrorCodes.RECAPTCHA_FAILED);
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
        pushError(ErrorCodes.FETCH_USERS_FAILED);
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
    console.error(error);
    pushError(ErrorCodes.SERVER_RESPONSE_ERROR);
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
      pushError(ErrorCodes.RECAPTCHA_FAILED);
      return;
    }
  } catch (error) {
    pushError(ErrorCodes.RECAPTCHA_FAILED);
    return;
  }
  const body = JSON.stringify({
    email,
    password,
    isAdmin: isAdmin ? 1 : 0,
    ...(username && { username })
  });
  try {
    const response = await fetcher("/admin/user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "recaptcha-token": recaptchaToken
      },
      body,
      credentials: "include"
    });
    if (response.ok) {
      fetchUsers();
      pushSnackbar("User added successfully", "success");
    } else {
      displayServerError(
        await response.json(),
        ErrorCodes.ADMIN_ADD_USER_FAILED,
        ErrorMessages[ErrorCodes.ADMIN_ADD_USER_FAILED]
      );
    }
  } catch (e) {
    console.error(e);
    pushError(ErrorCodes.SERVER_RESPONSE_ERROR);
  }
});

export const adminDeleteUsers = action(async (users: AdminSharedUser[]) => {
  let recaptchaToken: string;
  try {
    recaptchaToken = await executeRecaptcha("displayUsers");
    if (!recaptchaToken) {
      pushError(ErrorCodes.RECAPTCHA_FAILED);
      return;
    }
  } catch (error) {
    pushError(ErrorCodes.RECAPTCHA_FAILED);
    return;
  }
  let deletedAllUsers = true;
  for (const user of users) {
    const body = JSON.stringify({
      uuid: user.uuid
    });
    try {
      const response = await fetcher("/admin/user", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "recaptcha-token": recaptchaToken
        },
        body,
        credentials: "include"
      });
      if (response.ok) {
        fetchUsers();
      } else {
        deletedAllUsers = false;
        displayServerError(
          await response.json(),
          ErrorCodes.ADMIN_DELETE_USER_FAILED,
          `${ErrorMessages[ErrorCodes.ADMIN_DELETE_USER_FAILED]}: ${user.username}`
        );
        continue;
      }
    } catch (e) {
      console.error(e);
      pushError(ErrorCodes.SERVER_RESPONSE_ERROR);
      return;
    }
  }
  if (deletedAllUsers) {
    pushSnackbar("Users deleted successfully", "success");
  } else {
    pushSnackbar("Some users were not deleted", "warning");
  }
});
