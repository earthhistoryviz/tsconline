import { action } from "mobx";
import { ChartSettings, CrossPlotTimeSettings } from "../../types";
import { state } from "../state";
import { ErrorCodes, ErrorMessages } from "../../util/error-codes";
import {
  pushError,
  removeError
} from "./general-actions";
import { NavigateFunction } from "react-router";
import {
  ColumnInfo,
  FontsInfo,
  defaultColumnRoot,
  ChartRequest
} from "@tsconline/shared";
import { cloneDeep } from "lodash";
import { jsonToXml } from "../parse-settings";
import { displayServerError } from "./util-actions";
import { sendChartRequestToServer } from "./generate-chart-actions";

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
  // check if columns EXIST
  if (!state.crossplotSettingsTabs.chartX || !state.settingsTabs.columns) {
    pushError(ErrorCodes.NO_COLUMNS_SELECTED);
    return false;
  }
  const xSettings = state.crossplotSettingsTabs.chartXTimeSettings;
  const ySettings = state.crossplotSettingsTabs.chartYTimeSettings;
  if (!xSettings || !ySettings) return false;
  // verify validity of time settings being within logical range
  const xValid =
    xSettings.baseStageAge > xSettings.topStageAge || !isNaN(xSettings.topStageAge) || !isNaN(xSettings.baseStageAge);
  const yValid =
    ySettings.baseStageAge > ySettings.topStageAge || !isNaN(ySettings.topStageAge) || !isNaN(ySettings.baseStageAge);
  if (!xValid || !yValid) {
    pushError(ErrorCodes.IS_BAD_RANGE);
    return false;
  }
  removeError(ErrorCodes.IS_BAD_RANGE);
  // check if columns are selected
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

/**
 * Fetch the crossplot chart from the server
 */
export const compileCrossPlotChartRequest = action("compileCrossPlotChartRequest", async (navigate: NavigateFunction) => {
  if (!areSettingsValidForGeneration()) {
    return false;
  }
  navigate("/chart");
  try {
    const columnCopy = cloneDeep(
      combineCrossPlotColumns(state.crossplotSettingsTabs.chartX!, state.crossplotSettingsTabs.chartY!)
    );
    const columnHashMap = createColumnHashMap(columnCopy, new Map());
    const crossPlotChartSettings = cloneDeep(
      createCrossPlotChartSettings(
        state.crossplotSettingsTabs.chartXTimeSettings,
        state.crossplotSettingsTabs.chartYTimeSettings
      )
    );
    const json = jsonToXml(columnCopy, columnHashMap, crossPlotChartSettings);

    const crossPlotChartRequest: ChartRequest = {
      isCrossPlot: true,
      settings: json,
      datapacks: state.config.datapacks,
      useCache: state.useCache
    };

    await sendChartRequestToServer(crossPlotChartRequest);
  } catch (e) {
    console.error(e);
    displayServerError(null, ErrorCodes.SERVER_RESPONSE_ERROR, ErrorMessages[ErrorCodes.SERVER_RESPONSE_ERROR]);
  }
});
/**
 * when both crossplot columns have the same unit, prepend this string to the unit
 * @param unit
 * @returns
 */
const prependCrossPlotUnitPrefixOnDupe = (unit: string) => {
  return "custom-cross-plot-unit: " + unit;
};

/**
 * Take the only two units (or one) and create a chart settings object
 * @param xSettings
 * @param ySettings
 * @returns
 */
const createCrossPlotChartSettings = (
  xSettings: CrossPlotTimeSettings,
  ySettings: CrossPlotTimeSettings
): ChartSettings => {
  if (!state.crossplotSettingsTabs.chartX || !state.crossplotSettingsTabs.chartY) {
    throw new Error("No columns selected for crossplot");
  }
  const xUnit = state.crossplotSettingsTabs.chartX.units;
  const yUnit =
    state.crossplotSettingsTabs.chartY.units === xUnit
      ? prependCrossPlotUnitPrefixOnDupe(xUnit)
      : state.crossplotSettingsTabs.chartY.units;
  return {
    timeSettings: {
      [xUnit]: {
        selectedStage: "",
        topStageAge: xSettings.topStageAge,
        topStageKey: "",
        baseStageAge: xSettings.baseStageAge,
        baseStageKey: "",
        unitsPerMY: xSettings.unitsPerMY,
        skipEmptyColumns: true
      },
      [yUnit]: {
        selectedStage: "",
        topStageAge: ySettings.topStageAge,
        topStageKey: "",
        baseStageAge: ySettings.baseStageAge,
        baseStageKey: "",
        unitsPerMY: ySettings.unitsPerMY,
        skipEmptyColumns: true
      }
    },
    noIndentPattern: false,
    enableColumnBackground: false,
    enableChartLegend: false,
    enablePriority: false,
    enableHideBlockLabel: false,
    mouseOverPopupsEnabled: false,
    datapackContainsSuggAge: false
  };
};

/**
 * Create a master columninfo with both columns
 */
const combineCrossPlotColumns = action((columnOne: ColumnInfo, columnTwo: ColumnInfo) => {
  const columnRoot: ColumnInfo = cloneDeep(defaultColumnRoot);
  columnOne.parent = columnRoot.name;
  columnRoot.children = [columnOne];
  columnRoot.fontOptions = columnOne.fontOptions;
  for (const opt in columnRoot.fontsInfo) {
    columnRoot.fontsInfo[opt as keyof FontsInfo].inheritable = true;
  }
  if (columnOne.units === columnTwo.units) {
    return columnRoot;
  }
  columnTwo.parent = columnRoot.name;
  columnRoot.children.push(columnTwo);
  columnRoot.fontOptions = Array.from(new Set([...columnOne.fontOptions, ...columnTwo.fontOptions]));
  return columnRoot;
});
