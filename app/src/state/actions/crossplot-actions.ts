import { action } from "mobx";
import { ChartSettings, CrossPlotTimeSettings } from "../../types";
import { state } from "../state";
import { ErrorCodes, ErrorMessages } from "../../util/error-codes";
import { pushError, removeError, setChartTabState, setTab } from "./general-actions";
import { NavigateFunction } from "react-router";
import { ColumnInfo, FontsInfo, defaultColumnRoot, ChartRequest } from "@tsconline/shared";
import { cloneDeep } from "lodash";
import { jsonToXml } from "../parse-settings";
import { displayServerError } from "./util-actions";
import { resetChartTabStateForGeneration, sendChartRequestToServer } from "./generate-chart-actions";

export const setCrossPlotLockX = action((lockX: boolean) => {
  state.crossPlot.lockX = lockX;
});
export const setCrossPlotLockY = action((lockY: boolean) => {
  state.crossPlot.lockY = lockY;
});

export const setCrossPlotChartX = action((chart?: ColumnInfo) => {
  state.crossPlot.chartX = chart;
});
export const setCrossPlotChartY = action((chart?: ColumnInfo) => {
  state.crossPlot.chartY = chart;
});
export const setCrossPlotChartXTimeSettings = action((timeSettings: Partial<CrossPlotTimeSettings>) => {
  state.crossPlot.chartXTimeSettings = {
    ...state.crossPlot.chartXTimeSettings,
    ...timeSettings
  };
});
export const setCrossPlotChartYTimeSettings = action((timeSettings: Partial<CrossPlotTimeSettings>) => {
  state.crossPlot.chartYTimeSettings = {
    ...state.crossPlot.chartYTimeSettings,
    ...timeSettings
  };
});

function areSettingsValidForGeneration() {
  // check if columns EXIST
  if (!state.crossPlot.chartX || !state.settingsTabs.columns) {
    pushError(ErrorCodes.NO_COLUMNS_SELECTED);
    return false;
  }
  const xSettings = state.crossPlot.chartXTimeSettings;
  const ySettings = state.crossPlot.chartYTimeSettings;
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
    !state.crossPlot.chartX?.children.some((child) => child.on) ||
    !state.crossPlot.chartY?.children.some((child) => child.on)
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
export const compileCrossPlotChartRequest = action(
  "compileCrossPlotChartRequest",
  async (navigate: NavigateFunction) => {
    if (!areSettingsValidForGeneration()) {
      return false;
    }
    resetChartTabStateForGeneration(state.crossPlot.state);
    setTab(0);
    navigate("/crossplot");
    try {
      const columnCopy = combineCrossPlotColumns(
        cloneDeep(state.crossPlot.chartX!),
        cloneDeep(state.crossPlot.chartY!)
      );
      const columnHashMap = createColumnHashMap(columnCopy, new Map());
      const crossPlotChartSettings = cloneDeep(
        createCrossPlotChartSettings(state.crossPlot.chartXTimeSettings, state.crossPlot.chartYTimeSettings)
      );
      const json = jsonToXml(columnCopy, columnHashMap, crossPlotChartSettings);

      const crossPlotChartRequest: ChartRequest = {
        isCrossPlot: true,
        settings: json,
        datapacks: state.config.datapacks,
        useCache: state.useCache
      };

      const response = await sendChartRequestToServer(crossPlotChartRequest);
      if (!response) {
        // error SHOULD already displayed
        return;
      }
      setChartTabState(state.crossPlot.state, {
        chartContent: response.chartContent,
        chartHash: response.hash,
        madeChart: true,
        unsafeChartContent: response.unsafeChartContent,
        chartTimelineEnabled: true
      });
    } catch (e) {
      console.error(e);
      displayServerError(null, ErrorCodes.SERVER_RESPONSE_ERROR, ErrorMessages[ErrorCodes.SERVER_RESPONSE_ERROR]);
    } finally {
      setChartTabState(state.crossPlot.state, { chartLoading: false });
    }
  }
);
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
  if (!state.crossPlot.chartX || !state.crossPlot.chartY) {
    throw new Error("No columns selected for crossplot");
  }
  const xUnit = state.crossPlot.chartX.units;
  const yUnit =
    state.crossPlot.chartY.units === xUnit ? prependCrossPlotUnitPrefixOnDupe(xUnit) : state.crossPlot.chartY.units;
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
