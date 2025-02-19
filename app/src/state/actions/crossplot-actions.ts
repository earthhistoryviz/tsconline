import { action, isObservable, observable } from "mobx";
import { ChartSettings, CrossPlotBounds, CrossPlotTimeSettings, Marker } from "../../types";
import { state } from "../state";
import { ErrorCodes, ErrorMessages } from "../../util/error-codes";
import { pushError, removeError, setChartTabState, setTab } from "./general-actions";
import { NavigateFunction } from "react-router";
import { ColumnInfo, FontsInfo, defaultColumnRoot, ChartRequest } from "@tsconline/shared";
import { cloneDeep } from "lodash";
import { jsonToXml } from "../parse-settings";
import { displayServerError } from "./util-actions";
import { resetChartTabStateForGeneration, sendChartRequestToServer } from "./generate-chart-actions";
import { MARKER_HEIGHT, MARKER_PADDING, MARKER_WIDTH, ageToCoord } from "../../components/TSCCrossPlotSVGComponent";

export const setCrossPlotBounds = action((bounds: CrossPlotBounds) => {
  state.crossPlot.crossPlotBounds = bounds;
});
export const setCrossPlotShowTooltips = action((showTooltips: boolean) => {
  state.crossPlot.showTooltips = showTooltips;
});
export const setCrossPlotLockX = action((lockX: boolean) => {
  state.crossPlot.lockX = lockX;
});
export const setCrossPlotLockY = action((lockY: boolean) => {
  state.crossPlot.lockY = lockY;
});

export const setCrossPlotMarkerMode = action((markerMode: boolean) => {
  state.crossPlot.markerMode = markerMode;
});

export const adjustScaleOfMarkers = action((scale: number) => {
  state.crossPlot.markers.forEach((marker) => {
    const newWidth = getMarkerSizeFromScale(MARKER_WIDTH, scale);
    const newHeight = getMarkerSizeFromScale(MARKER_HEIGHT, scale);
    const newPadding = getMarkerSizeFromScale(MARKER_PADDING, scale);
    marker.element.setAttribute("x", (marker.x - newWidth / 2).toString());
    marker.element.setAttribute("y", (marker.y - newHeight / 2).toString());
    marker.element.setAttribute("width", newWidth.toString());
    marker.element.setAttribute("height", newHeight.toString());
    if (marker.type !== "Rect") {
      marker.element.setAttribute("rx", (newWidth / 2).toString());
      marker.element.setAttribute("ry", (newHeight / 2).toString());
    }
    marker.line.setAttribute("y1", (marker.y - newWidth / 2 - newPadding).toString());
    marker.line.setAttribute("y2", (marker.y - newHeight / 2 - newPadding).toString());
  });
});

export const addCrossPlotMarker = action((temp: Marker) => {
  state.crossPlot.markers.push(observable(temp));
});
export const removeCrossPlotMarkers = action((id: string) => {
  const removedCrossPlotMarker = state.crossPlot.markers.find((m) => m.id === id);
  if (!removedCrossPlotMarker) return;
  removedCrossPlotMarker.element.remove();
  removedCrossPlotMarker.line.remove();
  state.crossPlot.markers = state.crossPlot.markers.filter((m) => m.id !== id);
});

export const resetCrossPlotMarkers = action(() => {
  state.crossPlot.markers.forEach((marker) => {
    marker.element.remove();
    marker.line.remove();
  });
  state.crossPlot.markers = [];
});

export const getMarkerSizeFromScale = (size: number, scale: number) => {
  return Math.min(size * Math.pow(scale, -0.8), 3 * size);
};
export const editCrossPlotMarker = action((marker: Marker, partial: Partial<Marker>) => {
  if (!isObservable(marker)) {
    throw new Error("Marker is not observable");
  }
  if (state.crossPlot.crossPlotBounds === undefined) {
    throw new Error("CrossPlotBounds is undefined");
  }
  const { scaleX, topAgeX, scaleY, topAgeY, minX, minY, maxX, maxY } = state.crossPlot.crossPlotBounds;
  if (partial.color !== undefined) {
    marker.color = partial.color;
    marker.element.setAttribute("fill", partial.color);
  }
  if (partial.comment !== undefined) {
    marker.comment = partial.comment;
  }
  if (partial.age !== undefined) {
    const markerWidth = getMarkerSizeFromScale(MARKER_WIDTH, state.crossPlot.state.chartZoomSettings.scale);
    const markerPadding = getMarkerSizeFromScale(MARKER_PADDING, state.crossPlot.state.chartZoomSettings.scale);
    marker.age = partial.age;
    const age = ageToCoord(partial.age, minX, maxX, topAgeX, scaleX);
    marker.x = age;
    marker.element.setAttribute("x", (age - markerWidth / 2).toString());
    marker.line.setAttribute("x1", (age - markerWidth / 2 - markerPadding).toString());
    marker.line.setAttribute("x2", (age + markerWidth / 2 + markerPadding).toString());
  }
  if (partial.depth !== undefined) {
    const markerHeight = getMarkerSizeFromScale(MARKER_HEIGHT, state.crossPlot.state.chartZoomSettings.scale);
    const markerPadding = getMarkerSizeFromScale(MARKER_PADDING, state.crossPlot.state.chartZoomSettings.scale);
    marker.depth = partial.depth;
    const depth = ageToCoord(partial.depth, minY, maxY, topAgeY, scaleY);
    marker.y = depth;
    marker.element.setAttribute("y", (depth - markerHeight / 2).toString());
    switch (marker.type) {
      case "BASE(FAD)":
        marker.line.setAttribute("y1", (depth + markerHeight / 2 + markerPadding).toString());
        marker.line.setAttribute("y2", (depth + markerHeight / 2 + markerPadding).toString());
        break;
      case "TOP(LAD)":
        marker.line.setAttribute("y1", (depth - markerHeight / 2 - markerPadding).toString());
        marker.line.setAttribute("y2", (depth - markerHeight / 2 - markerPadding).toString());
        break;
    }
  }
  if (partial.type !== undefined) {
    const { x, y } = marker;
    const markerWidth = getMarkerSizeFromScale(MARKER_WIDTH, state.crossPlot.state.chartZoomSettings.scale);
    const markerHeight = getMarkerSizeFromScale(MARKER_HEIGHT, state.crossPlot.state.chartZoomSettings.scale);
    const markerPadding = getMarkerSizeFromScale(MARKER_PADDING, state.crossPlot.state.chartZoomSettings.scale);
    marker.type = partial.type;
    switch (partial.type) {
      case "Rect":
        marker.element.setAttribute("rx", "0");
        marker.element.setAttribute("ry", "0");
        marker.line.setAttribute("opacity", "0");
        break;
      case "Circle":
        marker.element.setAttribute("rx", "50%");
        marker.element.setAttribute("ry", "50%");
        marker.line.setAttribute("opacity", "0");
        break;
      case "BASE(FAD)":
        marker.element.setAttribute("rx", "50%");
        marker.element.setAttribute("ry", "50%");
        marker.line.setAttribute("x1", (x - markerWidth / 2 - markerPadding).toString());
        marker.line.setAttribute("x2", (x + markerWidth / 2 + markerPadding).toString());
        marker.line.setAttribute("y1", (y + markerHeight / 2 + markerPadding).toString());
        marker.line.setAttribute("y2", (y + markerHeight / 2 + markerPadding).toString());
        marker.line.setAttribute("opacity", "1");
        break;
      case "TOP(LAD)":
        marker.element.setAttribute("rx", "50%");
        marker.element.setAttribute("ry", "50%");
        marker.line.setAttribute("x1", (x - markerWidth / 2 - markerPadding).toString());
        marker.line.setAttribute("x2", (x + markerWidth / 2 + markerPadding).toString());
        marker.line.setAttribute("y1", (y - markerHeight / 2 - markerPadding).toString());
        marker.line.setAttribute("y2", (y - markerHeight / 2 - markerPadding).toString());
        marker.line.setAttribute("opacity", "1");
        break;
    }
  }
});

export const removeCrossPlotMarker = action((marker: Marker) => {
  state.crossPlot.markers = state.crossPlot.markers.filter((m) => m !== marker);
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
    xSettings.baseStageAge > xSettings.topStageAge && !isNaN(xSettings.topStageAge) && !isNaN(xSettings.baseStageAge);
  const yValid =
    ySettings.baseStageAge > ySettings.topStageAge && !isNaN(ySettings.topStageAge) && !isNaN(ySettings.baseStageAge);
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
export const compileAndSendCrossPlotChartRequest = action(
  "compileCrossPlotChartRequest",
  async (navigate: NavigateFunction) => {
    if (!areSettingsValidForGeneration()) {
      return false;
    }
    resetChartTabStateForGeneration(state.crossPlot.state);
    resetCrossPlotMarkers();
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
