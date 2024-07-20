import { action } from "mobx";
import { state } from "..";
import { executeRecaptcha, fetcher } from "../../util";
import { ErrorCodes, ErrorMessages } from "../../util/error-codes";
import {
  AdminSharedUser,
  assertAdminSharedUserArray,
  assertDatapackIndex,
  isServerResponseError
} from "@tsconline/shared";
import { displayServerError } from "./util-actions";
import { pushError, pushSnackbar } from "./general-actions";

export const adminFetchUsers = action(async () => {
  const recaptchaToken = await getRecaptchaToken("adminFetchUsers");
  if (!recaptchaToken) return;
  try {
    const response = await fetcher("/admin/users", {
      method: "POST",
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

export const adminFetchUserDatapacks = action("adminFetchUserDatapacks", async (uuid: string) => {
  const recaptchaToken = await getRecaptchaToken("adminFetchUserDatapacks");
  if (!recaptchaToken) return null;
  try {
    const response = await fetcher("/admin/user/datapacks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "recaptcha-token": recaptchaToken
      },
      body: JSON.stringify({ uuid }),
      credentials: "include"
    });
    if (response.ok) {
      const index = await response.json();
      assertDatapackIndex(index);
      return index;
    } else {
      if (response.status === 404) {
        return null;
      }
      displayServerError(
        await response.json(),
        ErrorCodes.UNABLE_TO_FETCH_USER_DATAPACKS,
        ErrorMessages[ErrorCodes.UNABLE_TO_FETCH_USER_DATAPACKS]
      );
    }
  } catch (error) {
    console.error(error);
    pushError(ErrorCodes.SERVER_RESPONSE_ERROR);
  }
  return null;
});

export const setUsers = action((users: AdminSharedUser[]) => {
  state.admin.displayedUsers = users;
});

export const adminAddUser = action(async (email: string, password: string, isAdmin: boolean, username?: string) => {
  const recaptchaToken = await getRecaptchaToken("adminAddUser");
  if (!recaptchaToken) return;
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
      adminFetchUsers();
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
  const recaptchaToken = await getRecaptchaToken("adminDeleteUsers");
  if (!recaptchaToken) return;
  let deletedAllUsers = true;
  for (const user of users) {
    if (user.email === state.user.email) {
      deletedAllUsers = false;
      pushSnackbar("Proceed to account settings to delete your own account", "warning");
      continue;
    }
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
        adminFetchUsers();
      } else {
        deletedAllUsers = false;
        const serverResponse = await response.json();
        if (isServerResponseError(serverResponse)) {
          if (response.status === 403 && serverResponse.error.includes("root")) {
            pushError(ErrorCodes.CANNOT_DELETE_ROOT_USER);
            continue;
          }
          console.error(
            `${ErrorMessages[ErrorCodes.ADMIN_DELETE_USER_FAILED]}\nUser: "${user.username}"\n with server response: ${serverResponse.error}`
          );
        }
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
  } else if (users.length > 1) {
    pushSnackbar("Some users were not deleted", "warning");
  }
});

/**
 * Deletes a user's datapack (datapack's "id" is the filename)
 */
export const adminDeleteUserDatapacks = action(async (datapacks: { uuid: string; datapack: string }[]) => {
  const recaptchaToken = await getRecaptchaToken("adminDeleteUserDatapacks");
  if (!recaptchaToken) return;
  let deletedAllDatapacks = true;
  for (const { uuid, datapack } of datapacks) {
    try {
      const response = await fetcher("/admin/user/datapack", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "recaptcha-token": recaptchaToken
        },
        body: JSON.stringify({ uuid, datapack }),
        credentials: "include"
      });
      if (response.ok) {
        pushSnackbar("Datapack deleted successfully", "success");
      } else {
        deletedAllDatapacks = false;
        displayServerError(
          await response.json(),
          ErrorCodes.ADMIN_DELETE_USER_DATAPACK_FAILED,
          ErrorMessages[ErrorCodes.ADMIN_DELETE_USER_DATAPACK_FAILED]
        );
      }
    } catch (error) {
      console.error(error);
      pushError(ErrorCodes.SERVER_RESPONSE_ERROR);
    }
  }
  if (deletedAllDatapacks) {
    pushSnackbar("Datapacks deleted successfully", "success");
  } else if (datapacks.length > 1) {
    pushSnackbar("Some datapacks were not deleted", "warning");
  }
});

async function getRecaptchaToken(token: string) {
  try {
    const recaptchaToken = await executeRecaptcha(token);
    if (!recaptchaToken) {
      pushError(ErrorCodes.RECAPTCHA_FAILED);
      return null;
    }
    return recaptchaToken;
  } catch (error) {
    pushError(ErrorCodes.RECAPTCHA_FAILED);
    return null;
  }
}
