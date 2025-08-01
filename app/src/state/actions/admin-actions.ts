import { action, runInAction } from "mobx";
import { actions, state } from "..";
import { fetcher } from "../../util";
import { ErrorCodes, ErrorMessages } from "../../util/error-codes";
import {
  AdminRecaptchaActions,
  AdminSharedUser,
  Datapack,
  DatapackMetadata,
  DatapackPriorityChangeRequest,
  SharedWorkshop,
  assertAdminSharedUserArray,
  assertDatapack,
  assertDatapackArray,
  assertDatapackIndex,
  assertDatapackMetadataArray,
  assertDatapackPriorityPartialUpdateSuccess,
  assertDatapackPriorityUpdateSuccess,
  assertOfficialDatapack,
  assertSharedWorkshop,
  assertWorkshopDatapack,
  isServerResponseError
} from "@tsconline/shared";
import { displayServerError } from "./util-actions";
import {
  addDatapack,
  deleteDatapackProfileComment,
  getRecaptchaToken,
  pushError,
  pushSnackbar,
  removeAllErrors,
  removeDatapack,
  setPrivateOfficialDatapacksLoading
} from "./general-actions";
import { State } from "../state";
import { getMetadataFromArray } from "../non-action-util";
import { EditableDatapackMetadata, UploadDatapackMethodType } from "../../types";
import { fetchAllWorkshops } from "./workshop-actions";

export const adminFetchUsers = action(async () => {
  const recaptchaToken = await getRecaptchaToken(AdminRecaptchaActions.ADMIN_FETCH_USERS);
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
  const recaptchaToken = await getRecaptchaToken(AdminRecaptchaActions.ADMIN_FETCH_USER_DATAPACKS);
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
  const recaptchaToken = await getRecaptchaToken(AdminRecaptchaActions.ADMIN_CREATE_USER);
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
      const recaptchaToken = await getRecaptchaToken(AdminRecaptchaActions.ADMIN_DELETE_USER);
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

export const adminModifyUsers = action(
  async (user: { username: string; email: string; accountType?: string; isAdmin?: number }) => {
    const { username, email, accountType, isAdmin } = user;
    if (!username || !email || (!accountType && isAdmin === undefined)) {
      pushSnackbar("Missing required fields", "warning");
      return;
    }
    try {
      const recaptchaToken = await getRecaptchaToken(AdminRecaptchaActions.ADMIN_EDIT_USER);
      if (!recaptchaToken) return;

      const response = await fetcher("/admin/user", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "recaptcha-token": recaptchaToken
        },
        body: JSON.stringify({ username, email, accountType, isAdmin }),
        credentials: "include"
      });

      if (response.ok) {
        pushSnackbar("User modified successfully", "success");
        adminFetchUsers(); // Refresh the user list if applicable
      } else {
        const serverResponse = await response.json();
        displayServerError(
          serverResponse,
          ErrorCodes.ADMIN_MODIFY_USER_FAILED,
          ErrorMessages[ErrorCodes.ADMIN_MODIFY_USER_FAILED]
        );
        return `${ErrorMessages[ErrorCodes.ADMIN_MODIFY_USER_FAILED]}`;
      }
    } catch (error) {
      console.error(error);
      pushError(ErrorCodes.SERVER_RESPONSE_ERROR);
    }
  }
);

/**
 * Deletes a user's datapack (datapack's "id" is the filename)
 */
export const adminDeleteUserDatapacks = action(async (datapacks: { uuid: string; datapack: string }[]) => {
  const recaptchaToken = await getRecaptchaToken(AdminRecaptchaActions.ADMIN_DELETE_USER_DATAPACKS);
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

export const adminDeleteOfficialDatapacks = action(
  async (datapacks: DatapackMetadata[] | EditableDatapackMetadata[]) => {
    const recaptchaToken = await getRecaptchaToken("adminDeleteOfficialDatapacks");
    if (!recaptchaToken) return;
    let deletedAllDatapacks = true;
    let deletedNoDatapacks = true;
    for (const datapack of datapacks) {
      try {
        const response = await fetcher("/admin/official/datapack", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "recaptcha-token": recaptchaToken
          },
          body: JSON.stringify({ datapack: datapack.title }),
          credentials: "include"
        });
        if (!response.ok) {
          deletedAllDatapacks = false;
          const serverResponse = await response.json();
          if (
            response.status == 403 &&
            isServerResponseError(serverResponse) &&
            serverResponse.error.includes("root")
          ) {
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
            removeDatapack({ title: datapack.title, type: "official" });
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
  }
);

export const adminUploadOfficialDatapack: UploadDatapackMethodType = action(
  async (file: File, metadata: DatapackMetadata, datapackProfilePicture?: File, pdfFiles?: File[]) => {
    const recaptchaToken = await getRecaptchaToken("adminUploadOfficialDatapack");
    if (!recaptchaToken) return;
    if (getMetadataFromArray(metadata, state.datapackMetadata)) {
      pushError(ErrorCodes.DATAPACK_ALREADY_EXISTS);
      return;
    }
    const formData = new FormData();
    const { title, description, authoredBy, contact, notes, date, references, tags, isPublic } = metadata;
    formData.append("datapack", file);
    formData.append("title", title);
    formData.append("description", description);
    formData.append("references", JSON.stringify(references));
    formData.append("tags", JSON.stringify(tags));
    formData.append("authoredBy", authoredBy);
    formData.append("isPublic", String(isPublic));
    formData.append("type", metadata.type);
    formData.append("priority", String(metadata.priority));
    formData.append("hasFiles", String(metadata.hasFiles));
    if (datapackProfilePicture) formData.append("datapack-image", datapackProfilePicture);
    if (notes) formData.append("notes", notes);
    if (date) formData.append("date", date);
    if (contact) formData.append("contact", contact);
    if (pdfFiles?.length) {
      pdfFiles.forEach((pdfFile) => {
        formData.append("pdfFiles[]", pdfFile);
      });
    }
    try {
      const response = await fetcher(`/admin/official/datapack`, {
        method: "POST",
        body: formData,
        credentials: "include",
        headers: {
          "recaptcha-token": recaptchaToken
        }
      });
      const data = await response.json();

      if (response.ok) {
        const pack = await adminFetchOfficialDatapack(metadata.title);
        if (!pack) {
          return;
        }
        addDatapack(pack);
        pushSnackbar("Successfully uploaded " + title + " datapack", "success");
      } else {
        displayServerError(data, ErrorCodes.INVALID_DATAPACK_UPLOAD, ErrorMessages[ErrorCodes.INVALID_DATAPACK_UPLOAD]);
      }
    } catch (e) {
      displayServerError(null, ErrorCodes.SERVER_RESPONSE_ERROR, ErrorMessages[ErrorCodes.SERVER_RESPONSE_ERROR]);
      console.error(e);
    }
  }
);

/**
 * Fetches all private official datapacks, used only on Admin page
 */
export const adminFetchPrivateOfficialDatapacks = action(async (options?: { signal?: AbortSignal }) => {
  try {
    const recaptchaToken = await getRecaptchaToken(AdminRecaptchaActions.ADMIN_FETCH_ALL_PRIVATE_OFFICIAL_DATAPACKS);
    if (!recaptchaToken) return;
    const response = await fetcher("/admin/official/datapacks/private", {
      method: "GET",
      credentials: "include",
      headers: {
        "recaptcha-token": recaptchaToken
      },
      ...options
    });
    if (response.ok) {
      const array = await response.json();
      if (!array) {
        pushError(ErrorCodes.ADMIN_FETCH_PRIVATE_DATAPACKS_FAILED);
        return;
      }
      assertDatapackArray(array);
      array.forEach((datapack: Datapack) => {
        addDatapack(datapack);
      });
    } else {
      displayServerError(
        await response.json(),
        ErrorCodes.SERVER_RESPONSE_ERROR,
        ErrorMessages[ErrorCodes.SERVER_RESPONSE_ERROR]
      );
    }
  } catch (error) {
    if ((error as Error).name === "AbortError") return;
    console.error(error);
    pushError(ErrorCodes.SERVER_RESPONSE_ERROR);
    return;
  }
});

export const adminFetchPrivateOfficialDatapacksMetadata = action(async () => {
  try {
    const response = await fetcher("/admin/official/private/metadata", {
      method: "GET",
      credentials: "include"
    });
    if (response.ok) {
      const data = await response.json();
      assertDatapackMetadataArray(data);
      for (const dp in data) {
        addDatapack(data[dp]);
      }
    } else {
      displayServerError(
        await response.json(),
        ErrorCodes.ADMIN_FETCH_PRIVATE_DATAPACKS_FAILED,
        ErrorMessages[ErrorCodes.ADMIN_FETCH_PRIVATE_DATAPACKS_FAILED]
      );
    }
  } catch (error) {
    console.error(error);
    pushError(ErrorCodes.SERVER_RESPONSE_ERROR);
  } finally {
    setPrivateOfficialDatapacksLoading(false);
  }
});

/**
 * Fetch an official datapack, private or public
 */
export const adminFetchOfficialDatapack = action(async (datapack: string, options?: { signal?: AbortSignal }) => {
  try {
    const recaptchaToken = await getRecaptchaToken(AdminRecaptchaActions.ADMIN_FETCH_OFFICIAL_DATAPACK);
    if (!recaptchaToken) return;
    const response = await fetcher(`/admin/official/datapack/${encodeURIComponent(datapack)}`, {
      method: "GET",
      credentials: "include",
      headers: {
        "recaptcha-token": recaptchaToken
      },
      ...options
    });
    if (response.ok) {
      const datapack = await response.json();
      assertOfficialDatapack(datapack);
      assertDatapack(datapack);
      return datapack;
    } else {
      displayServerError(
        await response.json(),
        ErrorCodes.SERVER_RESPONSE_ERROR,
        ErrorMessages[ErrorCodes.SERVER_RESPONSE_ERROR]
      );
    }
  } catch (error) {
    if ((error as Error).name === "AbortError") return;
    console.error(error);
    pushError(ErrorCodes.SERVER_RESPONSE_ERROR);
    return;
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
      const recaptchaToken = await getRecaptchaToken(AdminRecaptchaActions.ADMIN_ADD_USERS_TO_WORKSHOP);
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
            fetchAllWorkshops();
            break;
          case 409:
            errorCode = ErrorCodes.ADMIN_EMAIL_INVALID;
            break;
          case 422:
            errorCode = ErrorCodes.RECAPTCHA_FAILED;
            break;
        }
        const serverResponse = await response.json();
        const invalidEmails = serverResponse.invalidEmails || "";
        displayServerError(serverResponse, errorCode, ErrorMessages[errorCode]);
        return { success: false, invalidEmails };
      }
    } catch (e) {
      displayServerError(null, ErrorCodes.SERVER_RESPONSE_ERROR, ErrorMessages[ErrorCodes.SERVER_RESPONSE_ERROR]);
      console.error(e);
    }
    return { success: false, invalidEmails: "" };
  }
);

/**
 * Creates a new workshop
 * @param title The title of the workshop
 * @param start The start date of the workshop
 * @param end The end date of the workshop
 * @param regRestrict Whether registration is restricted
 * @returns The workshop ID if successful, undefined otherwise
 */
export const adminCreateWorkshop = action(
  async (
    workshop: Omit<SharedWorkshop, "workshopId" | "files" | "datapacks" | "active">
  ): Promise<number | undefined> => {
    try {
      const recaptchaToken = await getRecaptchaToken(AdminRecaptchaActions.ADMIN_CREATE_WORKSHOP);
      if (!recaptchaToken) return;
      const { title, start, end, regRestrict, creatorUUID, regLink, description } = workshop;
      const body: Record<string, string | boolean | undefined> = {
        title,
        start,
        end,
        regRestrict,
        creatorUUID,
        ...(regLink && { ...(regLink && { regLink }), ...(description && { description }) })
      };
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
        assertSharedWorkshop(workshop);
        runInAction(() => state.workshops.push(workshop));
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

/**
 * Edits a workshop
 * @param updatedFields The fields to update
 * @returns The updated workshop if successful, null otherwise
 */
export const adminEditWorkshop = action(
  async (updatedFields: Partial<SharedWorkshop>): Promise<SharedWorkshop | null> => {
    if (!updatedFields.workshopId) {
      pushError(ErrorCodes.INVALID_FORM);
      return null;
    }
    const index = state.workshops.findIndex((w) => w.workshopId === updatedFields.workshopId);
    if (index === -1) {
      pushError(ErrorCodes.ADMIN_WORKSHOP_NOT_FOUND);
      return null;
    }
    try {
      const recaptchaToken = await getRecaptchaToken(AdminRecaptchaActions.ADMIN_EDIT_WORKSHOP);
      if (!recaptchaToken) return null;
      const response = await fetcher(`/admin/workshop`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "recaptcha-token": recaptchaToken
        },
        body: JSON.stringify(updatedFields),
        credentials: "include"
      });
      if (response.ok) {
        const workshop = (await response.json()).workshop;
        assertSharedWorkshop(workshop);
        runInAction(() => (state.workshops[index] = workshop));
        return workshop;
      } else {
        let errorCode = ErrorCodes.ADMIN_WORKSHOP_EDIT_FAILED;
        if (response.status === 409) {
          errorCode = ErrorCodes.ADMIN_WORKSHOP_ALREADY_EXISTS;
        }
        displayServerError(await response.json(), errorCode, ErrorMessages[errorCode]);
      }
    } catch (error) {
      console.error(error);
      pushError(ErrorCodes.SERVER_RESPONSE_ERROR);
    }
    return null;
  }
);

/**
 * Deletes a workshop
 * @param workshopId The ID of the workshop to delete
 */
export const adminDeleteWorkshop = action(async (workshopId: number) => {
  const index = state.workshops.findIndex((w) => w.workshopId === workshopId);
  if (index === -1) {
    pushError(ErrorCodes.ADMIN_WORKSHOP_NOT_FOUND);
    return;
  }
  try {
    const recaptchaToken = await getRecaptchaToken(AdminRecaptchaActions.ADMIN_DELETE_WORKSHOP);
    if (!recaptchaToken) return;
    const response = await fetcher(`/admin/workshop`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "recaptcha-token": recaptchaToken
      },
      body: JSON.stringify({ workshopId }),
      credentials: "include"
    });
    if (response.ok) {
      runInAction(() => state.workshops.splice(index, 1));
      pushSnackbar("Workshop deleted successfully", "success");
    } else {
      displayServerError(
        await response.json(),
        ErrorCodes.ADMIN_DELETE_WORKSHOP_FAILED,
        ErrorMessages[ErrorCodes.ADMIN_DELETE_WORKSHOP_FAILED]
      );
    }
  } catch (error) {
    console.error(error);
    pushError(ErrorCodes.SERVER_RESPONSE_ERROR);
  }
  return;
});

/**
 * Uploads a datapack to a workshop
 * @param file The file to upload
 * @param metadata The metadata for the datapack
 * @param workshopId The ID of the workshop to upload to (required)
 */
export const adminUploadDatapackToWorkshop = action(
  async (file: File, metadata: DatapackMetadata, datapackProfilePicture?: File) => {
    assertWorkshopDatapack(metadata);
    const recaptchaToken = await getRecaptchaToken(AdminRecaptchaActions.ADMIN_UPLOAD_DATAPACK_TO_WORKSHOP);
    if (!recaptchaToken) return;
    const formData = new FormData();
    const { title, description, authoredBy, contact, notes, date, references, tags, isPublic, type, uuid, hasFiles } =
      metadata;
    formData.append("datapack", file);
    formData.append("title", title);
    formData.append("description", description);
    formData.append("references", JSON.stringify(references));
    formData.append("tags", JSON.stringify(tags));
    formData.append("authoredBy", authoredBy);
    formData.append("isPublic", String(isPublic));
    formData.append("type", type);
    formData.append("uuid", uuid);
    formData.append("hasFiles", String(hasFiles));
    if (datapackProfilePicture) formData.append("datapack-image", datapackProfilePicture);
    if (notes) formData.append("notes", notes);
    if (date) formData.append("date", date);
    if (contact) formData.append("contact", contact);
    try {
      const response = await fetcher(`/admin/workshop/datapack`, {
        method: "POST",
        body: formData,
        credentials: "include",
        headers: {
          "recaptcha-token": recaptchaToken
        }
      });
      const data = await response.json();

      if (response.ok) {
        pushSnackbar("Successfully uploaded " + title + " datapack", "success");
        actions.fetchAllWorkshops();
      } else {
        displayServerError(data, ErrorCodes.INVALID_DATAPACK_UPLOAD, ErrorMessages[ErrorCodes.INVALID_DATAPACK_UPLOAD]);
      }
    } catch (e) {
      displayServerError(null, ErrorCodes.SERVER_RESPONSE_ERROR, ErrorMessages[ErrorCodes.SERVER_RESPONSE_ERROR]);
      console.error(e);
    }
  }
);

/**
 * Adds server datapacks to the workshop
 * @param workshopId The ID of the workshop to add to
 * @param titles The title of the datapack to add
 */
export const adminAddOfficialDatapackToWorkshop = action(async (workshopId: number, datapackTitle: string) => {
  try {
    const recaptchaToken = await getRecaptchaToken(AdminRecaptchaActions.ADMIN_ADD_OFFICIAL_DATAPACK_TO_WORKSHOP);
    if (!recaptchaToken) return;
    const response = await fetcher(`/admin/workshop/official/datapack`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "recaptcha-token": recaptchaToken
      },
      body: JSON.stringify({ workshopId, datapackTitle }),
      credentials: "include"
    });
    if (response.ok) {
      pushSnackbar("Datapacks added to workshop successfully", "success");
      actions.fetchAllWorkshops();
    } else {
      let errorCode = ErrorCodes.ADMIN_ADD_OFFICIAL_DATAPACK_TO_WORKSHOP_FAILED;
      switch (response.status) {
        case 409:
          errorCode = ErrorCodes.ADMIN_SERVER_DATAPACK_ALREADY_EXISTS;
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
});

export const adminSetWorkshop = action((workshop: SharedWorkshop[]) => {
  state.workshops = workshop;
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

export const handleDatapackPriorityChange = action((data: Datapack, newPriority: number) => {
  data.priority = newPriority;
});

export const setLoadingDatapackPriority = action((loading: boolean) => {
  state.admin.datapackPriorityLoading = loading;
});

export const adminUpdateDatapackPriority = action(async (tasks: DatapackPriorityChangeRequest[]) => {
  try {
    setLoadingDatapackPriority(true);
    const recaptchaToken = await getRecaptchaToken(AdminRecaptchaActions.ADMIN_UPDATE_DATAPACK_PRIORITY);
    if (!recaptchaToken) return;
    const response = await fetcher("/admin/official/datapack/priority", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "recaptcha-token": recaptchaToken
      },
      body: JSON.stringify({ tasks }),
      credentials: "include"
    });
    const json = await response.json();
    try {
      if (response.ok) {
        assertDatapackPriorityUpdateSuccess(json);
        json.completedRequests.forEach((datapack) => {
          const index = state.datapackMetadata.findIndex((d) => d.title === datapack.id);
          if (index !== -1) {
            runInAction(() => {
              state.datapackMetadata[index].priority = datapack.priority;
            });
          }
        });
        pushSnackbar("Datapack priorities updated successfully", "success");
      } else {
        assertDatapackPriorityPartialUpdateSuccess(json);
        pushSnackbar("Some datapack priorities were not updated", "warning");
      }
    } catch (e) {
      console.error(e);
      displayServerError(
        await response.json(),
        ErrorCodes.ADMIN_PRIORITY_BATCH_UPDATE_FAILED,
        ErrorMessages[ErrorCodes.ADMIN_PRIORITY_BATCH_UPDATE_FAILED]
      );
    }
  } catch (e) {
    console.error(e);
    displayServerError(null, ErrorCodes.SERVER_RESPONSE_ERROR, ErrorMessages[ErrorCodes.SERVER_RESPONSE_ERROR]);
  } finally {
    setLoadingDatapackPriority(false);
  }
});

export const setAdminDatapackConfigTempRowData = action(
  (tempRowData: State["admin"]["datapackConfig"]["tempRowData"]) => {
    state.admin.datapackConfig.tempRowData = tempRowData;
  }
);
export const setAdminRowPriorityUpdates = action((newVal: DatapackPriorityChangeRequest[]) => {
  state.admin.datapackConfig.rowPriorityUpdates = newVal;
});
export const resetAdminConfigTempState = action(() => {
  state.admin.datapackConfig.rowPriorityUpdates = [];
  state.admin.datapackConfig.tempRowData = null;
});

/**
 * Upload files to a workshop, at least one file is required
 * @param presentationFile The presentation file to upload (verify it is a valid pdf before calling)
 * @param instructionsFile The instructions file to upload (verify it is a valid pdf before calling)
 * @param otherFiles Other files to upload
 * @returns Whether the operation was successful
 */
export const adminAddFilesToWorkshop = action(
  async (
    workshopId: number,
    presentationFile?: File | null,
    instructionsFile?: File | null,
    otherFiles?: File[] | null
  ) => {
    if (!presentationFile && !instructionsFile && (!otherFiles || otherFiles.length === 0)) {
      pushError(ErrorCodes.INVALID_FORM);
      return false;
    }
    const recaptchaToken = await getRecaptchaToken(AdminRecaptchaActions.ADMIN_UPLOAD_FILES_TO_WORKSHOP);
    if (!recaptchaToken) return false;
    const formData = new FormData();
    if (presentationFile) {
      formData.append("presentationFile", presentationFile);
    }
    if (instructionsFile) {
      formData.append("instructionsFile", instructionsFile);
    }
    if (otherFiles && otherFiles.length > 0) {
      otherFiles.forEach((file) => {
        formData.append("otherFiles", file);
      });
    }
    try {
      const response = await fetcher(`/admin/workshop/files/${workshopId}`, {
        method: "POST",
        body: formData,
        credentials: "include",
        headers: {
          "recaptcha-token": recaptchaToken
        }
      });
      if (response.ok) {
        return true;
      } else {
        let errorCode = ErrorCodes.ADMIN_ADD_FILES_TO_WORKSHOP_FAILED;
        switch (response.status) {
          case 400:
            errorCode = ErrorCodes.INVALID_FORM;
            break;
          case 422:
            errorCode = ErrorCodes.RECAPTCHA_FAILED;
            break;
          case 404:
            errorCode = ErrorCodes.ADMIN_WORKSHOP_NOT_FOUND;
            fetchAllWorkshops();
            break;
        }
        displayServerError(await response.json(), errorCode, ErrorMessages[errorCode]);
      }
    } catch (error) {
      console.error(error);
      pushError(ErrorCodes.SERVER_RESPONSE_ERROR);
    }
    return false;
  }
);

/**
 * Upload cover picture to a workshop
 * @param coverPicture The uploaded cover picture
 * @returns Whether the operation was successful
 */

export const adminAddCoverPicToWorkshop = action(async (workshopId: number, coverPicture: File) => {
  const recaptchaToken = await getRecaptchaToken(AdminRecaptchaActions.ADMIN_UPLOAD_COVER_PICTURE_TO_WORKSHOP);
  if (!recaptchaToken) return;
  const formData = new FormData();
  formData.append("file", coverPicture);
  try {
    const response = await fetcher(`/admin/workshop/cover/${workshopId}`, {
      method: "POST",
      body: formData,
      credentials: "include",
      headers: {
        "recaptcha-token": recaptchaToken
      }
    });

    if (response.ok) {
      return true;
    } else {
      let errorCode = ErrorCodes.ADMIN_ADD_COVER_TO_WORKSHOP_FAILED;
      switch (response.status) {
        case 400:
          errorCode = ErrorCodes.INVALID_FORM;
          break;
        case 422:
          errorCode = ErrorCodes.RECAPTCHA_FAILED;
          break;
        case 404:
          errorCode = ErrorCodes.ADMIN_WORKSHOP_NOT_FOUND;
          fetchAllWorkshops();
          break;
        case 415:
          errorCode = ErrorCodes.INVALID_FILE_FORMAT;
          break;
      }
      displayServerError(await response.json(), errorCode, ErrorMessages[errorCode]);
    }
  } catch (error) {
    console.error(error);
    pushError(ErrorCodes.SERVER_RESPONSE_ERROR);
  }
});

/**
 * Delete datapack comment
 * @param commentId ID of comment to be deleted
 * @returns Whether the operation was successful
 */

export const adminDeleteDatapackComment = action(async (commentId: number) => {
  const recaptchaToken = await getRecaptchaToken(AdminRecaptchaActions.ADMIN_DELETE_DATAPACK_COMMENT);
  if (!recaptchaToken) return;
  try {
    const response = await fetcher(`/admin/datapack/comments/${commentId}`, {
      method: "DELETE",
      credentials: "include",
      headers: {
        "recaptcha-token": recaptchaToken
      }
    });

    if (response.ok) {
      deleteDatapackProfileComment(commentId);
      pushSnackbar("Comment deleted.", "success");
      removeAllErrors();
      return true;
    } else {
      let errorCode = ErrorCodes.DATAPACK_COMMENT_DELETE_FAILED;
      if (response.status === 404) {
        errorCode = ErrorCodes.DATAPACK_COMMENT_NOT_FOUND;
      }
      displayServerError(await response.json(), errorCode, ErrorMessages[errorCode]);
    }
  } catch (error) {
    console.error(error);
    pushError(ErrorCodes.SERVER_RESPONSE_ERROR);
  }
});
