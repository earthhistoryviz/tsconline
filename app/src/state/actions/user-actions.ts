import { action, runInAction, toJS } from "mobx";
import { fetcher } from "../../util";
import {
  addDatapack,
  getRecaptchaToken,
  pushError,
  pushSnackbar,
  removeDatapack,
  fetchDatapack,
  setChartTabState,
  processDatapackConfig
} from "./general-actions";
import { displayServerError } from "./util-actions";
import { ErrorCodes, ErrorMessages } from "../../util/error-codes";
import { DatapackFetchParams } from "../../types";
import {
  ChartHistory,
  Datapack,
  DatapackUniqueIdentifier,
  assertChartHistory,
  assertDatapack,
  assertHistoryEntryArray,
  assertUserDatapack,
  assertWorkshopDatapack,
  extractDatapackType
} from "@tsconline/shared";
import { state } from "../state";
import { purifyChartContent } from "./generate-chart-actions";
import { xmlToJson } from "../parse-settings";

export const setEditRequestInProgress = action((inProgress: boolean) => {
  state.datapackProfilePage.editRequestInProgress = inProgress;
});

/**
 * Refetches the datapack from the server and replaces the original datapack with the new one. If used to refetch private user datapacks or workshop datapacks, you must make sure recaptcha is loaded before calling this function.
 */
export const refetchDatapack = action(
  async (editedMetadata: DatapackFetchParams, originalDatapack: DatapackUniqueIdentifier) => {
    const datapack = await fetchDatapack(editedMetadata);
    if (datapack) {
      removeDatapack(originalDatapack);
      addDatapack(datapack);
      return datapack;
    } else {
      return null;
    }
  }
);

export const fetchPublicUserDatapack = action(
  async (datapack: string, uuid: string, options?: { signal?: AbortSignal }) => {
    try {
      const response = await fetcher(`/user/uuid/${uuid}/datapack/${datapack}`, options);
      if (response.ok) {
        const data = await response.json();
        assertUserDatapack(data);
        assertDatapack(data);
        return data;
      } else {
        displayServerError(
          response.statusText,
          ErrorCodes.USER_FETCH_DATAPACK_FAILED,
          ErrorMessages[ErrorCodes.USER_FETCH_DATAPACK_FAILED]
        );
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      pushError(ErrorCodes.SERVER_RESPONSE_ERROR);
    }
  }
);

export const fetchUserDatapack = action(async (datapack: string, options?: { signal?: AbortSignal }) => {
  try {
    const recaptcha = await getRecaptchaToken("fetchUserDatapack");
    if (!recaptcha) return;
    const response = await fetcher(`/user/datapack/${datapack}`, {
      credentials: "include",
      headers: {
        "recaptcha-token": recaptcha
      },
      ...options
    });
    if (response.ok) {
      const data = await response.json();
      assertUserDatapack(data);
      assertDatapack(data);
      return data;
    } else {
      displayServerError(
        response.statusText,
        ErrorCodes.USER_FETCH_DATAPACK_FAILED,
        ErrorMessages[ErrorCodes.USER_FETCH_DATAPACK_FAILED]
      );
    }
  } catch (e) {
    if ((e as Error).name === "AbortError") return;
    pushError(ErrorCodes.SERVER_RESPONSE_ERROR);
  }
});

export const fetchWorkshopDatapack = action(
  async (workshopUUID: string, datapack: string, options?: { signal?: AbortSignal }) => {
    try {
      const recaptcha = await getRecaptchaToken("fetchWorkshopDatapack");
      if (!recaptcha) return;
      const response = await fetcher(`/user/workshop/${workshopUUID}/datapack/${datapack}`, {
        credentials: "include",
        headers: {
          "recaptcha-token": recaptcha
        },
        ...options
      });
      if (response.ok) {
        const data = await response.json();
        assertWorkshopDatapack(data);
        assertDatapack(data);
        return data;
      } else {
        displayServerError(
          response.statusText,
          ErrorCodes.WORKSHOP_FETCH_DATAPACK_FAILED,
          ErrorMessages[ErrorCodes.WORKSHOP_FETCH_DATAPACK_FAILED]
        );
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      pushError(ErrorCodes.SERVER_RESPONSE_ERROR);
    }
  }
);

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
      removeDatapack({ title: datapack, type: "user", uuid: state.user.uuid });
      pushSnackbar(`Datapack ${datapack} deleted`, "success");
    } else {
      displayServerError(
        response.statusText,
        ErrorCodes.USER_DELETE_DATAPACK_FAILED,
        ErrorMessages[ErrorCodes.USER_DELETE_DATAPACK_FAILED]
      );
    }
  } catch (e) {
    pushError(ErrorCodes.SERVER_RESPONSE_ERROR);
  }
});

export const setDatapackImageOnDatapack = action((datapack: Datapack, image: string) => {
  datapack.datapackImage = image;
});

export const fetchUserHistoryMetadata = action(async () => {
  try {
    const response = await fetcher("/user/history", {
      credentials: "include"
    });
    if (response.ok) {
      const historyEntries = await response.json();
      assertHistoryEntryArray(historyEntries);
      state.user.historyEntries = historyEntries;
    } else {
      displayServerError(
        response.statusText,
        ErrorCodes.USER_FETCH_HISTORY_METADATA_FAILED,
        ErrorMessages[ErrorCodes.USER_FETCH_HISTORY_METADATA_FAILED]
      );
    }
  } catch (e) {
    pushError(ErrorCodes.SERVER_RESPONSE_ERROR);
  }
});

export const loadUserHistory = action(async (timestamp: string) => {
  try {
    const response = await fetcher(`/user/history/${timestamp}`, {
      credentials: "include"
    });
    if (response.ok) {
      const history = await response.json();
      assertChartHistory(history);
      setUserHistory(history);
    } else {
      const message = await response.text();
      let errorCode = ErrorCodes.USER_FETCH_HISTORY_FAILED;
      switch (response.status) {
        case 404:
          errorCode = ErrorCodes.USER_FETCH_HISTORY_FAILED_DATAPACKS_MISSING;
          removeUserHistoryEntry(timestamp);
          break;
      }
      displayServerError(message, errorCode, ErrorMessages[errorCode]);
    }
  } catch (e) {
    pushError(ErrorCodes.SERVER_RESPONSE_ERROR);
  }
});

export const setUserHistory = action(async (history: ChartHistory) => {
  setChartTabState(state.chartTab.state, { madeChart: false });
  for (const datapack of history.datapacks) {
    addDatapack(datapack);
  }
  await processDatapackConfig(
    toJS(
      history.datapacks.map((d) => {
        return {
          title: d.title,
          isPublic: d.isPublic,
          storedFileName: d.storedFileName,
          ...extractDatapackType(d)
        };
      })
    ),
    { settings: xmlToJson(history.settings), force: true }
  );
  runInAction(() => {
    state.prevSettings = state.settings;
  });
  setChartTabState(state.chartTab.state, {
    chartContent: purifyChartContent(history.chartContent),
    chartHash: history.chartHash,
    madeChart: true,
    unsafeChartContent: history.chartContent,
    chartTimelineEnabled: false
  });
});

/**
 * Deletes a user's history entry or all entries. If id is -1, all entries are deleted.
 * @param timestamp Timestamp of the history entry to delete, or -1 to delete all entries
 */
export const deleteUserHistory = action(async (timestamp: string) => {
  if (state.user.historyEntries.length === 0) {
    pushSnackbar("No history entries to delete", "warning");
    return;
  }
  try {
    const response = await fetcher(`/user/history/${timestamp}`, {
      method: "DELETE",
      credentials: "include"
    });
    if (response.ok) {
      if (timestamp === "-1") {
        pushSnackbar("All history entries deleted", "success");
        clearUserHistory();
      } else {
        pushSnackbar("History entry deleted", "success");
        removeUserHistoryEntry(timestamp);
      }
    } else {
      displayServerError(
        response.statusText,
        ErrorCodes.USER_DELETE_HISTORY_FAILED,
        ErrorMessages[ErrorCodes.USER_DELETE_HISTORY_FAILED]
      );
    }
  } catch (e) {
    pushError(ErrorCodes.SERVER_RESPONSE_ERROR);
  }
});

export const removeUserHistoryEntry = action((timestamp: string) => {
  state.user.historyEntries = state.user.historyEntries.filter((entry) => entry.timestamp !== timestamp);
});

export const clearUserHistory = action(() => {
  state.user.historyEntries = [];
});
