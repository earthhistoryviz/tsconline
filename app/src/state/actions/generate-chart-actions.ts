import * as generalActions from "./general-actions";
import { displayServerError } from "./util-actions";
import { state } from "../state";
import { action, runInAction } from "mobx";
import { fetcher } from "../../util";
import {
  ChartProgressUpdate,
  ChartRequest,
  ColumnInfo,
  assertChartProgressUpdate,
  isTempDatapack
} from "@tsconline/shared";
import { jsonToXml } from "../parse-settings";
import { NavigateFunction } from "react-router";
import { ErrorCodes, ErrorMessages } from "../../util/error-codes";
import { ChartSettings, ChartTabState } from "../../types";
import { cloneDeep } from "lodash";
import { getDatapackFromArray, purifyChartContent } from "../non-action-util";
import { defaultChartZoomSettings } from "../../constants";
import { fetchUserHistoryMetadata } from "./user-actions";
import { backendUrl } from "../../util/constant";

export const handlePopupResponse = action(
  "handlePopupResponse",
  (
    response: boolean,
    navigate: NavigateFunction,
    options: {
      from?: string;
    }
  ) => {
    if (response) setDatapackTimeDefaults();
    compileChartRequest(navigate, options);
  }
);

type UnitValues = {
  topStageAge: number;
  baseStageAge: number;
  verticalScale: number;
};
function setDatapackTimeDefaults() {
  const unitMap = new Map<string, UnitValues>();

  // combine the datapacks and the min and max ages for their respective units
  // (can't just min or max the time settings immediately, since we have to set it on top of the user settings)
  for (const datapack of state.config.datapacks) {
    const pack = getDatapackFromArray(datapack, state.datapacks);
    if (!pack) continue;
    const timeSettings = state.settings.timeSettings[pack.ageUnits];
    if (!timeSettings) continue;
    if (!unitMap.has(pack.ageUnits)) {
      unitMap.set(pack.ageUnits, {
        topStageAge: Number.MAX_SAFE_INTEGER,
        baseStageAge: Number.MIN_SAFE_INTEGER,
        verticalScale: Number.MIN_SAFE_INTEGER
      });
    }
    const unitValues = unitMap.get(pack.ageUnits)!;
    if ((pack.topAge || pack.topAge === 0) && (pack.baseAge || pack.baseAge === 0)) {
      unitValues.topStageAge = Math.min(unitValues.topStageAge, pack.topAge);
      unitValues.baseStageAge = Math.max(unitValues.baseStageAge, pack.baseAge);
    }
    if (pack.verticalScale) unitValues.verticalScale = Math.max(unitValues.verticalScale, pack.verticalScale);
  }

  // apply the combined values to the settings
  for (const [unit, values] of unitMap) {
    if (values.topStageAge !== Number.MAX_SAFE_INTEGER && values.baseStageAge !== Number.MIN_SAFE_INTEGER) {
      generalActions.setBaseStageAge(values.baseStageAge, unit);
      generalActions.setTopStageAge(values.topStageAge, unit);
    }
    if (values.verticalScale !== Number.MIN_SAFE_INTEGER) {
      generalActions.setUnitsPerMY(values.verticalScale, unit);
    }
  }
}

// Shows the user a popup before chart generation if there are age spans on the datapack
// only pops up if they are in the configure datapacks page, or not in the settings page
export const initiateChartGeneration = action(
  "initiateChartGeneration",
  (navigate: NavigateFunction, location: string) => {
    if (
      state.settings.datapackContainsSuggAge &&
      ((location === "/settings" && state.settingsTabs.selected === "datapacks") || location !== "/settings")
    ) {
      state.showSuggestedAgePopup = true;
    } else {
      compileChartRequest(navigate, {
        from: location
      });
    }
  }
);

function areSettingsValidForGeneration(options?: { from?: string }) {
  if (!state.config.datapacks || state.config.datapacks.length === 0 || !state.settingsTabs.columns) {
    generalActions.pushError(ErrorCodes.NO_DATAPACKS_SELECTED);
    return false;
  }
  generalActions.removeError(ErrorCodes.NO_DATAPACKS_SELECTED);
  // we don't allow customization of converted datapacks if the user is not logged in
  if (options?.from !== "/crossplot" && state.config.datapacks.some((dp) => isTempDatapack(dp))) {
    generalActions.pushError(ErrorCodes.LOGIN_TO_GENERATE_CUSTOM_CONVERTED_DATAPACK);
    return false;
  }
  generalActions.removeError(ErrorCodes.LOGIN_TO_GENERATE_CUSTOM_CONVERTED_DATAPACK);
  if (
    Object.keys(state.settings.timeSettings).some(
      (key) =>
        state.settings.timeSettings[key].baseStageAge <= state.settings.timeSettings[key].topStageAge ||
        isNaN(state.settings.timeSettings[key].topStageAge) ||
        isNaN(state.settings.timeSettings[key].baseStageAge)
    )
  ) {
    generalActions.pushError(ErrorCodes.IS_BAD_RANGE);
    return false;
  }
  generalActions.removeError(ErrorCodes.IS_BAD_RANGE);
  if (!state.settingsTabs.columns.children.some((column) => column.on)) {
    generalActions.pushError(ErrorCodes.NO_COLUMNS_SELECTED);
    return false;
  }
  generalActions.removeError(ErrorCodes.NO_COLUMNS_SELECTED);
  return true;
}

export const resetChartTabStateForGeneration = action("resetChartTabStateForGeneration", (oldval: ChartTabState) => {
  generalActions.setChartTabState(oldval, {
    madeChart: false,
    chartLoading: true,
    chartContent: "",
    unsafeChartContent: "",
    chartZoomSettings: cloneDeep(defaultChartZoomSettings),
    chartTimelineEnabled: false
  });
  runInAction(() => {
    oldval.matchesSettings = true;
  });
});

export const compileChartRequest = action(
  "compileChartRequest",
  async (
    navigate: NavigateFunction,
    options?: {
      from?: string;
    }
  ) => {
    // asserts column is not null
    if (!areSettingsValidForGeneration(options)) return;
    state.showSuggestedAgePopup = false;
    if (options && options.from === "/crossplot") {
      navigate("/chart?from=crossplot");
    } else {
      navigate("/chart");
    }
    //set the loading screen and make sure the chart isn't up
    savePreviousSettings();
    resetChartTabStateForGeneration(state.chartTab.state);
    generalActions.setTab(3);
    try {
      let chartRequest: ChartRequest | null = null;
      try {
        const chartSettingsCopy: ChartSettings = cloneDeep(state.settings);
        const columnCopy: ColumnInfo = cloneDeep(state.settingsTabs.columns!);
        const xmlSettings = jsonToXml(columnCopy, state.settingsTabs.columnHashMap, chartSettingsCopy);
        chartRequest = {
          settings: xmlSettings,
          datapacks: state.config.datapacks,
          useCache: state.useCache,
          isCrossPlot: false
        };
      } catch (e) {
        console.error(e);
        generalActions.pushError(ErrorCodes.INVALID_DATAPACK_CONFIG);
        return;
      }
      if (!chartRequest) {
        generalActions.pushError(ErrorCodes.INVALID_DATAPACK_CONFIG);
        return;
      }
      const response = await sendChartRequestToServer(chartRequest);
      if (!response) {
        // error SHOULD already displayed
        return;
      }
      generalActions.setChartTabState(state.chartTab.state, {
        chartContent: response.chartContent,
        chartHash: response.hash,
        madeChart: true,
        unsafeChartContent: response.unsafeChartContent,
        chartTimelineEnabled: false
      });
      generalActions.updateChartLoadingProgress(0, "Initializing");
      if (state.isLoggedIn) fetchUserHistoryMetadata();
    } finally {
      generalActions.setChartTabState(state.chartTab.state, { chartLoading: false });
    }
  }
);

const savePreviousSettings = action("savePreviousSettings", () => {
  state.prevSettings = JSON.parse(JSON.stringify(state.settings));
  state.prevConfig = JSON.parse(JSON.stringify(state.config));
});

export const sendChartRequestToServer: (chartRequest: ChartRequest) => Promise<
  | {
      chartContent: string;
      unsafeChartContent: string;
      hash: string;
    }
  | undefined
> = action("sendChartRequestToServer", async (chartRequest: ChartRequest) => {
  return await new Promise((resolve) => {
    try {
      const ws = new WebSocket(`${backendUrl}/chart`);
      ws.onopen = () => {
        ws.send(JSON.stringify(chartRequest));
      };
      ws.onclose = (event) => {
        if (!event.wasClean) {
          console.error("WebSocket closed unexpectedly", event.code, event.reason);
          displayServerError(null, ErrorCodes.SERVER_RESPONSE_ERROR, ErrorMessages[ErrorCodes.SERVER_RESPONSE_ERROR]);
          resolve(undefined);
        }
      };
      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        displayServerError(null, ErrorCodes.SERVER_RESPONSE_ERROR, ErrorMessages[ErrorCodes.SERVER_RESPONSE_ERROR]);
        resolve(undefined);
      };
      ws.onmessage = async (event) => {
        const progress = JSON.parse(event.data);
        assertChartProgressUpdate(progress);
        if (progress.stage === "Error") {
          let errorCode = ErrorCodes.INTERNAL_ERROR;
          switch (progress.errorCode) {
            case 100:
              errorCode = ErrorCodes.SERVER_FILE_METADATA_ERROR;
              break;
            case 408:
              errorCode = ErrorCodes.SERVER_TIMEOUT;
              break;
            case 503:
              errorCode = ErrorCodes.SERVER_BUSY;
              break;
            case 1000:
              errorCode = ErrorCodes.INVALID_SETTINGS;
              break;
            case 1001:
              errorCode = ErrorCodes.NO_COLUMNS_SELECTED;
              break;
          }
          displayServerError(progress.error, errorCode, ErrorMessages[errorCode]);
          resolve(undefined);
          return;
        }
        generalActions.updateChartLoadingProgress(progress.percent, progress.stage);
        if (progress.stage === "Complete") {
          try {
            const content = await (await fetcher(progress.chartpath)).text();
            const sanitizedSVG = purifyChartContent(content);
            generalActions.pushSnackbar("Successfully generated chart", "success");
            resolve({
              chartContent: sanitizedSVG,
              unsafeChartContent: content,
              hash: progress.hash
            });
          } catch (e) {
            console.error("Failed while processing chart result", e);
            resolve(undefined);
          }
        }
      };
    } catch (e) {
      console.error(e);
      displayServerError(null, ErrorCodes.SERVER_RESPONSE_ERROR, ErrorMessages[ErrorCodes.SERVER_RESPONSE_ERROR]);
      resolve(undefined);
    }
  });
});
