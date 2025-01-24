import * as generalActions from "./general-actions";
import { displayServerError } from "./util-actions";
import { state } from "../state";
import { action } from "mobx";
import { fetcher } from "../../util";
import { ChartRequest, ColumnInfo, assertChartErrorResponse, assertChartInfo } from "@tsconline/shared";
import { jsonToXml } from "../parse-settings";
import { NavigateFunction } from "react-router";
import { ErrorCodes, ErrorMessages } from "../../util/error-codes";
import DOMPurify from "dompurify";
import { ChartSettings } from "../../types";
import { cloneDeep } from "lodash";
import { getDatapackFromArray } from "../non-action-util";

export const handlePopupResponse = action("handlePopupResponse", (response: boolean, navigate: NavigateFunction) => {
  if (response) setDatapackTimeDefaults();
  fetchChartFromServer(navigate);
});

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
      fetchChartFromServer(navigate);
    }
  }
);

function areSettingsValidForGeneration() {
  if (!state.config.datapacks || state.config.datapacks.length === 0 || !state.settingsTabs.columns) {
    generalActions.pushError(ErrorCodes.NO_DATAPACKS_SELECTED);
    return false;
  }
  generalActions.removeError(ErrorCodes.NO_DATAPACKS_SELECTED);
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

export const resetChartTab = action("resetChartTab", () => {
  generalActions.setTab(3);
  generalActions.setChartMade(true);
  generalActions.setChartLoading(true);
  generalActions.setChartHash("");
  generalActions.setChartContent("");
  generalActions.setChartTabScale(1);
  generalActions.setChartTabZoomFitScale(1);
  generalActions.setChartTabResetMidX(0);
  generalActions.setChartTabZoomFitMidCoord(0);
  generalActions.setChartTabZoomFitMidCoordIsX(true);
});

export const fetchChartFromServer = action("fetchChartFromServer", async (navigate: NavigateFunction) => {
  // asserts column is not null
  if (!areSettingsValidForGeneration()) return;
  state.showSuggestedAgePopup = false;
  navigate("/chart");
  //set the loading screen and make sure the chart isn't up
  savePreviousSettings();
  resetChartTab();
  let body;
  try {
    const chartSettingsCopy: ChartSettings = cloneDeep(state.settings);
    const columnCopy: ColumnInfo = cloneDeep(state.settingsTabs.columns!);
    const xmlSettings = jsonToXml(columnCopy, state.settingsTabs.columnHashMap, chartSettingsCopy);
    const chartRequest: ChartRequest = {
      settings: xmlSettings,
      datapacks: state.config.datapacks,
      useCache: state.useCache
    };
    body = JSON.stringify(chartRequest);
  } catch (e) {
    console.error(e);
    generalActions.pushError(ErrorCodes.INVALID_DATAPACK_CONFIG);
    return;
  }
  console.log("Sending settings to server...");
  try {
    const response = await fetcher(`/chart`, {
      method: "POST",
      body,
      credentials: "include"
    });
    const answer = await response.json();
    if (response.status === 500) {
      assertChartErrorResponse(answer);
      let errorCode = ErrorCodes.INVALID_CHART_RESPONSE;
      switch (answer.errorCode) {
        case 100:
          errorCode = ErrorCodes.SERVER_FILE_METADATA_ERROR;
          break;
        case 1000:
          errorCode = ErrorCodes.INVALID_SETTINGS;
          break;
        case 1001:
          errorCode = ErrorCodes.NO_COLUMNS_SELECTED;
          break;
        case 400:
        case 1002:
        case 1003:
        case 1004:
        case 1005:
        case 2000:
        case 2001:
        case 2002:
        case 2003:
          errorCode = ErrorCodes.INTERNAL_ERROR;
          break;
      }
      displayServerError(answer, errorCode, ErrorMessages[errorCode]);
      generalActions.setChartLoading(false);
      return;
    }
    try {
      assertChartInfo(answer);
      generalActions.setChartHash(answer.hash);
      await generalActions.checkSVGStatus();
      const content = await (await fetcher(answer.chartpath)).text();
      const domPurifyConfig = {
        ADD_ATTR: [
          "docbase",
          "popuptext",
          "minY",
          "maxY",
          "vertScale",
          "topAge",
          "baseAge",
          "minX",
          "maxX",
          "baseLimit",
          "topLimit",
          "x1",
          "y1"
        ],
        ADD_URI_SAFE_ATTR: ["docbase", "popuptext"]
      };
      const sanitizedSVG = DOMPurify.sanitize(content, domPurifyConfig);
      // for download ONLY
      generalActions.setUnsafeChartContent(content);
      // the display version
      generalActions.setChartContent(sanitizedSVG);
      generalActions.setChartTimelineEnabled(state.chartTab.crossplot.isCrossPlot);
      generalActions.setChartTimelineLocked(false);
      generalActions.pushSnackbar("Successfully generated chart", "success");
    } catch (e) {
      let errorCode = ErrorCodes.INVALID_CHART_RESPONSE;
      switch (response.status) {
        case 408:
          errorCode = ErrorCodes.SERVER_TIMEOUT;
          break;
        case 503:
          errorCode = ErrorCodes.SERVER_BUSY;
          break;
      }
      displayServerError(answer, errorCode, ErrorMessages[errorCode]);
      return;
    }
  } catch (e) {
    console.error(e);
    displayServerError(null, ErrorCodes.SERVER_RESPONSE_ERROR, ErrorMessages[ErrorCodes.SERVER_RESPONSE_ERROR]);
  }
});

const savePreviousSettings = action("savePreviousSettings", () => {
  state.prevSettings = JSON.parse(JSON.stringify(state.settings));
  state.prevConfig = JSON.parse(JSON.stringify(state.config));
});
