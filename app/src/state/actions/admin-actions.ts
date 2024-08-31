import { action, runInAction } from "mobx";
import { state } from "..";
import { fetcher } from "../../util";
import { ErrorCodes, ErrorMessages } from "../../util/error-codes";
import {
  AdminSharedUser,
  DatapackMetadata,
  Workshop,
  assertAdminSharedUserArray,
  assertDatapackIndex,
  assertWorkshop,
  assertWorkshopArray,
  isServerResponseError
} from "@tsconline/shared";
import { displayServerError } from "./util-actions";
import {
  addDatapackToServerDatapackIndex,
  fetchServerDatapack,
  getRecaptchaToken,
  pushError,
  pushSnackbar,
  removeAllErrors
} from "./general-actions";
import { State } from "../state";

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
      const recaptchaToken = await getRecaptchaToken("adminDeleteUsers");
      if (!recaptchaToken) return;
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
      if (!response.ok) {
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

export const adminDeleteServerDatapacks = action(async (datapacks: string[]) => {
  const recaptchaToken = await getRecaptchaToken("adminDeleteServerDatapacks");
  if (!recaptchaToken) return;
  let deletedAllDatapacks = true;
  let deletedNoDatapacks = true;
  for (const datapack of datapacks) {
    try {
      const response = await fetcher("/admin/server/datapack", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "recaptcha-token": recaptchaToken
        },
        body: JSON.stringify({ datapack }),
        credentials: "include"
      });
      if (!response.ok) {
        deletedAllDatapacks = false;
        const serverResponse = await response.json();
        if (response.status == 403 && isServerResponseError(serverResponse) && serverResponse.error.includes("root")) {
          displayServerError(
            serverResponse,
            ErrorCodes.ADMIN_CANNOT_DELETE_ROOT_DATAPACK,
            ErrorMessages[ErrorCodes.ADMIN_CANNOT_DELETE_ROOT_DATAPACK]
          );
        } else {
          displayServerError(
            serverResponse,
            ErrorCodes.ADMIN_DELETE_SERVER_DATAPACK_FAILED,
            ErrorMessages[ErrorCodes.ADMIN_DELETE_SERVER_DATAPACK_FAILED]
          );
        }
      } else {
        deletedNoDatapacks = false;
        runInAction(() => {
          delete state.datapackCollection.serverDatapackIndex[datapack];
        });
      }
    } catch (error) {
      console.error(error);
      pushError(ErrorCodes.SERVER_RESPONSE_ERROR);
    }
  }
  if (deletedNoDatapacks) {
    pushSnackbar("No datapacks deleted", "warning");
  } else if (deletedAllDatapacks) {
    pushSnackbar("Datapacks deleted successfully", "success");
  } else if (datapacks.length > 1) {
    pushSnackbar("Some datapacks were not deleted", "warning");
  }
  // this will return if any datapacks were deleted
  return !deletedNoDatapacks;
});

export const adminUploadServerDatapack = action(async (file: File, metadata: DatapackMetadata) => {
  const recaptchaToken = await getRecaptchaToken("adminUploadServerDatapack");
  if (!recaptchaToken) return;
  if (state.datapackCollection.serverDatapackIndex[metadata.title]) {
    pushError(ErrorCodes.DATAPACK_ALREADY_EXISTS);
    return;
  }
  const formData = new FormData();
  const { title, description, authoredBy, contact, notes, date, references, tags } = metadata;
  formData.append("file", file);
  formData.append("title", title);
  formData.append("description", description);
  formData.append("references", JSON.stringify(references));
  formData.append("tags", JSON.stringify(tags));
  formData.append("authoredBy", authoredBy);
  if (notes) formData.append("notes", notes);
  if (date) formData.append("date", date);
  if (contact) formData.append("contact", contact);
  try {
    const response = await fetcher(`/admin/server/datapack`, {
      method: "POST",
      body: formData,
      credentials: "include",
      headers: {
        "recaptcha-token": recaptchaToken
      }
    });
    const data = await response.json();

    if (response.ok) {
      const pack = await fetchServerDatapack(metadata.title);
      if (!pack) {
        return;
      }
      addDatapackToServerDatapackIndex(file.name, pack);
      pushSnackbar("Successfully uploaded " + title + " datapack", "success");
    } else {
      displayServerError(data, ErrorCodes.INVALID_DATAPACK_UPLOAD, ErrorMessages[ErrorCodes.INVALID_DATAPACK_UPLOAD]);
    }
  } catch (e) {
    displayServerError(null, ErrorCodes.SERVER_RESPONSE_ERROR, ErrorMessages[ErrorCodes.SERVER_RESPONSE_ERROR]);
    console.error(e);
  }
});

/**
 * Adds users to a workshop
 * @param formData The form data containing the users to add
 * @returns Whether the operation was successful and any invalid emails
 */
export const adminAddUsersToWorkshop = action(
  async (formData: FormData): Promise<{ success: boolean; invalidEmails: string }> => {
    try {
      const recaptchaToken = await getRecaptchaToken("adminAddUsersToWorkshop");
      if (!recaptchaToken) return { success: false, invalidEmails: "" };
      const response = await fetcher(`/admin/workshop/users`, {
        method: "POST",
        body: formData,
        headers: {
          "recaptcha-token": recaptchaToken
        },
        credentials: "include"
      });
      if (response.ok) {
        removeAllErrors();
        adminFetchUsers();
        return { success: true, invalidEmails: "" };
      } else {
        let errorCode = ErrorCodes.ADMIN_ADD_USERS_TO_WORKSHOP_FAILED;
        switch (response.status) {
          case 400:
            errorCode = ErrorCodes.INVALID_FORM;
            break;
          case 404:
            errorCode = ErrorCodes.ADMIN_WORKSHOP_NOT_FOUND;
            adminFetchWorkshops();
            break;
          case 409:
            errorCode = ErrorCodes.ADMIN_EMAIL_INVALID;
            break;
          case 422:
            errorCode = ErrorCodes.RECAPTCHA_FAILED;
            break;
        }
        const serverResponse = await response.json();
        displayServerError(serverResponse, errorCode, ErrorMessages[errorCode]);
        return { success: false, invalidEmails: serverResponse.invalidEmails };
      }
    } catch (e) {
      displayServerError(null, ErrorCodes.SERVER_RESPONSE_ERROR, ErrorMessages[ErrorCodes.SERVER_RESPONSE_ERROR]);
      console.error(e);
    }
    return { success: false, invalidEmails: "" };
  }
);

/**
 * Fetches all workshops
 */
export const adminFetchWorkshops = action(async () => {
  try {
    const recaptchaToken = await getRecaptchaToken("adminFetchWorkshops");
    if (!recaptchaToken) return;
    const response = await fetcher("/admin/workshops", {
      method: "GET",
      credentials: "include",
      headers: {
        "recaptcha-token": recaptchaToken
      }
    });
    if (response.ok) {
      const workshops = (await response.json()).workshops;
      assertWorkshopArray(workshops);
      adminDeleteWorkshops();
      workshops.forEach((workshop) => adminUpdateWorkshop(workshop));
    } else {
      displayServerError(
        await response.json(),
        ErrorCodes.ADMIN_FETCH_WORKSHOPS_FAILED,
        ErrorMessages[ErrorCodes.ADMIN_FETCH_WORKSHOPS_FAILED]
      );
    }
  } catch (error) {
    console.error(error);
    pushError(ErrorCodes.SERVER_RESPONSE_ERROR);
  }
});

/**
 * Creates a new workshop
 * @param title The title of the workshop
 * @param start The start date of the workshop
 * @param end The end date of the workshop
 * @param password The password for the workshop (optional)
 * @returns The workshop ID if successful, undefined otherwise
 */
export const adminCreateWorkshop = action(
  async (title: string, start: string, end: string, password?: string): Promise<number | undefined> => {
    try {
      const recaptchaToken = await getRecaptchaToken("adminCreateWorkshop");
      if (!recaptchaToken) return;
      const body: Record<string, string> = { title, start, end };
      if (password) {
        body.password = password;
      }
      const response = await fetcher("/admin/workshop", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "recaptcha-token": recaptchaToken
        },
        body: JSON.stringify(body),
        credentials: "include"
      });
      if (response.ok) {
        const workshop = (await response.json()).workshop;
        assertWorkshop(workshop);
        adminUpdateWorkshop(workshop);
        return workshop.workshopId;
      } else {
        let errorCode = ErrorCodes.ADMIN_CREATE_WORKSHOP_FAILED;
        switch (response.status) {
          case 400:
            errorCode = ErrorCodes.INVALID_FORM;
            break;
          case 409:
            errorCode = ErrorCodes.ADMIN_WORKSHOP_ALREADY_EXISTS;
            break;
          case 422:
            errorCode = ErrorCodes.RECAPTCHA_FAILED;
            break;
        }
        displayServerError(await response.json(), errorCode, ErrorMessages[errorCode]);
      }
    } catch (error) {
      console.error(error);
      pushError(ErrorCodes.SERVER_RESPONSE_ERROR);
    }
  }
);

export const adminDeleteWorkshops = action(() => {
  state.admin.workshops.clear();
});

export const adminUpdateWorkshop = action((workshop: Workshop) => {
  state.admin.workshops.set(workshop.title, workshop);
});

export const adminRemoveDisplayedUserDatapack = action((uuid: string) => {
  if (!state.admin.displayedUserDatapacks[uuid]) throw new Error(`User ${uuid} not found in displayedUserDatapacks`);
  state.admin.displayedUserDatapacks[uuid] = {};
});

export const adminAddDisplayedUserDatapack = action(async (uuid: string) => {
  const datapackIndex = await adminFetchUserDatapacks(uuid);
  if (!datapackIndex) return;
  runInAction(() => (state.admin.displayedUserDatapacks[uuid] = datapackIndex));
});

export const updateAdminUserDatapacks = action(async (uuid: string[]) => {
  uuid.forEach(async (uuid) => {
    const datapackIndex = await adminFetchUserDatapacks(uuid);
    if (!datapackIndex) return;
    runInAction(() => (state.admin.displayedUserDatapacks[uuid] = datapackIndex));
  });
});

export const adminSetDisplayedUserDatapacks = action((datapacks: State["admin"]["displayedUserDatapacks"]) => {
  state.admin.displayedUserDatapacks = datapacks;
});
