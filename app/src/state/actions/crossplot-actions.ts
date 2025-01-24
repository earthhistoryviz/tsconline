import { action } from "mobx";
import { CrossPlotTimeSettings } from "../../types";
import { state } from "../state";
import { ErrorCodes, ErrorMessages } from "../../util/error-codes";
import {
  checkSVGStatus,
  pushError,
  pushSnackbar,
  removeError,
  setChartContent,
  setChartHash,
  setChartLoading,
  setChartTimelineEnabled,
  setChartTimelineLocked,
  setUnsafeChartContent
} from "./general-actions";
import { NavigateFunction } from "react-router";
import {
  ColumnInfo,
  CrossPlotChartRequest,
  FontsInfo,
  assertChartErrorResponse,
  assertChartInfo,
  defaultColumnRoot
} from "@tsconline/shared";
import { cloneDeep } from "lodash";
import { crossPlotJsonToXml, jsonToXml } from "../parse-settings";
import { fetcher } from "../../util";
import { displayServerError } from "./util-actions";
import DOMPurify from "dompurify";

export const setCrossPlotChartXTimeSettings = action((timeSettings: Partial<CrossPlotTimeSettings>) => {
  state.crossplotSettingsTabs.chartXTimeSettings = {
    ...state.crossplotSettingsTabs.chartXTimeSettings,
    ...timeSettings
  };
});
export const setCrossPlotChartYTimeSettings = action((timeSettings: Partial<CrossPlotTimeSettings>) => {
  state.crossplotSettingsTabs.chartYTimeSettings = {
    ...state.crossplotSettingsTabs.chartYTimeSettings,
    ...timeSettings
  };
});

function areSettingsValidForGeneration() {
  if (!state.crossplotSettingsTabs.chartX || !state.settingsTabs.columns) {
    pushError(ErrorCodes.NO_COLUMNS_SELECTED);
    return false;
  }
  const xSettings = state.crossplotSettingsTabs.chartXTimeSettings;
  const ySettings = state.crossplotSettingsTabs.chartYTimeSettings;
  if (!xSettings || !ySettings) return false;
  const xValid =
    xSettings.baseStageAge > xSettings.topStageAge || !isNaN(xSettings.topStageAge) || !isNaN(xSettings.baseStageAge);
  const yValid =
    ySettings.baseStageAge > ySettings.topStageAge || !isNaN(ySettings.topStageAge) || !isNaN(ySettings.baseStageAge);
  if (!xValid || !yValid) {
    pushError(ErrorCodes.IS_BAD_RANGE);
    return false;
  }
  removeError(ErrorCodes.IS_BAD_RANGE);
  if (
    !state.crossplotSettingsTabs.chartX?.children.some((child) => child.on) ||
    !state.crossplotSettingsTabs.chartY?.children.some((child) => child.on)
  ) {
    pushError(ErrorCodes.NO_COLUMNS_SELECTED);
    return false;
  }
  removeError(ErrorCodes.NO_COLUMNS_SELECTED);
  return true;
}

const createColumnHashMap = (column: ColumnInfo, hash: Map<string, ColumnInfo>) => {
  hash.set(column.name, column);
  if (column.children) {
    column.children.forEach((child) => createColumnHashMap(child, hash));
  }
  return hash;
};

export const fetchCrossPlotChart = action(async (navigate: NavigateFunction) => {
  if (!areSettingsValidForGeneration()) {
    return false;
  }
  navigate("/chart");
  try {
    const chartX = setCrossPlotChart(cloneDeep(state.crossplotSettingsTabs.chartX!));
    const chartXHash = createColumnHashMap(chartX, new Map<string, ColumnInfo>());
    const chartY = setCrossPlotChart(
      cloneDeep(state.crossplotSettingsTabs.chartY || state.crossplotSettingsTabs.chartX!)
    );
    const chartYHash = createColumnHashMap(chartY, new Map<string, ColumnInfo>());
    const settingsX = crossPlotJsonToXml(chartX, chartXHash, state.crossplotSettingsTabs.chartXTimeSettings);
    const settingsY = crossPlotJsonToXml(chartY, chartYHash, state.crossplotSettingsTabs.chartYTimeSettings);

    // this is to
    const columnCopy = cloneDeep(state.settingsTabs.columns!);
    const aggSettings = jsonToXml(columnCopy, state.settingsTabs.columnHashMap, cloneDeep(state.settings));

    const crossPlotChartRequest: CrossPlotChartRequest = {
      chartXSettings: settingsX,
      chartYSettings: settingsY,
      crossPlotSettings: aggSettings,
      datapacks: state.config.datapacks
    };
    const response = await fetcher(`/crossplot`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(crossPlotChartRequest),
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
      setChartLoading(false);
      return;
    }
    try {
      assertChartInfo(answer);
      setChartHash(answer.hash);
      await checkSVGStatus();
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
      setUnsafeChartContent(content);
      // the display version
      setChartContent(sanitizedSVG);
      setChartTimelineEnabled(state.chartTab.crossplot.isCrossPlot);
      setChartTimelineLocked(false);
      pushSnackbar("Successfully generated chart", "success");
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
const setCrossPlotChart = action((column: ColumnInfo) => {
  const columnRoot: ColumnInfo = cloneDeep(defaultColumnRoot);
  column.parent = columnRoot.name;
  columnRoot.children = [column];
  for (const opt in columnRoot.fontsInfo) {
    columnRoot.fontsInfo[opt as keyof FontsInfo].inheritable = true;
  }
  return columnRoot;
});
