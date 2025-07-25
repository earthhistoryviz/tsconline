import { action, isObservable, observable, runInAction, toJS } from "mobx";
import {
  ChartSettings,
  CrossPlotBounds,
  CrossPlotTimeSettings,
  RenderColumnInfo,
  SetDatapackConfigReturnValue,
  assertColumnInfoRoot
} from "../../types";
import { state } from "../state";
import { ErrorCodes, ErrorMessages } from "../../util/error-codes";
import {
  addDatapack,
  clearSuccessSnackbars,
  processDatapackConfig,
  pushError,
  pushSnackbar,
  removeError,
  setChartTabState,
  setTab,
  updateChartLoadingProgress,
  uploadUserDatapack
} from "./general-actions";
import { NavigateFunction } from "react-router";
import {
  ColumnInfo,
  FontsInfo,
  defaultColumnRoot,
  ChartRequest,
  assertDatapackArray,
  Marker,
  Model,
  AutoPlotRequest,
  assertAutoPlotResponse,
  ConvertCrossPlotRequest,
  assertDatapack,
  assertTempDatapack,
  DatapackMetadata
} from "@tsconline/shared";
import { cloneDeep } from "lodash";
import { jsonToXml } from "../parse-settings";
import { displayServerError } from "./util-actions";
import {
  initiateChartGeneration,
  resetChartTabStateForGeneration,
  sendChartRequestToServer
} from "./generate-chart-actions";
import {
  CROSSPLOT_DOT_HEIGHT,
  MARKER_PADDING,
  CROSSPLOT_DOT_WIDTH,
  ageToCoord,
  getDotRect,
  getLine
} from "../../components/TSCCrossPlotSVGComponent";
import { downloadFile, formatDateForDatapack, getDatapackFromArray, getDotSizeFromScale } from "../non-action-util";
import { fetcher } from "../../util";
import dayjs from "dayjs";
import { getChildRenderColumns } from "../../util/util";
import { convertColumnInfoToRenderColumnInfo } from "./column-actions";
export const checkValidityOfNewModel = action((model: { x: number; y: number } | { age: number; depth: number }) => {
  const models = state.crossPlot.models;
  if (models.length === 0) {
    return true;
  }
  if (state.crossPlot.crossPlotBounds === undefined) {
    return false;
  }
  const { scaleX, topAgeX, scaleY, topAgeY, minX, minY, maxX, maxY } = state.crossPlot.crossPlotBounds;
  const x = "x" in model ? model.x : ageToCoord(model.age, minX, maxX, topAgeX, scaleX);
  const y = "y" in model ? model.y : ageToCoord(model.depth, minY, maxY, topAgeY, scaleY);
  const tempModels = [...models.slice().map((m) => ({ x: m.x, y: m.y })), { x, y }];
  tempModels.sort((a, b) => a.x - b.x || a.y - b.y);
  return tempModels.every((model, index) => {
    if (index === 0) {
      return true;
    }
    const prevModel = tempModels[index - 1];
    return model.x >= prevModel.x && model.y >= prevModel.y;
  });
});

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

export const setCrossPlotModelMode = action((modelMode: boolean) => {
  if (modelMode) {
    state.crossPlot.markerMode = false;
  }
  state.crossPlot.modelMode = modelMode;
});

export const setCrossPlotMarkerMode = action((markerMode: boolean) => {
  if (markerMode) {
    state.crossPlot.modelMode = false;
  }
  state.crossPlot.markerMode = markerMode;
});

const getBaseFadLineValues = action((marker: Marker) => {
  const markerHeight = getDotSizeFromScale(CROSSPLOT_DOT_HEIGHT, state.crossPlot.state.chartZoomSettings.scale);
  const markerWidth = getDotSizeFromScale(CROSSPLOT_DOT_WIDTH, state.crossPlot.state.chartZoomSettings.scale);
  const markerPadding = getDotSizeFromScale(MARKER_PADDING, state.crossPlot.state.chartZoomSettings.scale);
  return {
    x1: marker.x - markerWidth / 2 - markerPadding,
    x2: marker.x + markerWidth / 2 + markerPadding,
    y1: marker.y + markerHeight / 2 + markerPadding,
    y2: marker.y + markerHeight / 2 + markerPadding
  };
});
const getTopLadLineValues = action((marker: Marker) => {
  const markerHeight = getDotSizeFromScale(CROSSPLOT_DOT_HEIGHT, state.crossPlot.state.chartZoomSettings.scale);
  const markerWidth = getDotSizeFromScale(CROSSPLOT_DOT_WIDTH, state.crossPlot.state.chartZoomSettings.scale);
  const markerPadding = getDotSizeFromScale(MARKER_PADDING, state.crossPlot.state.chartZoomSettings.scale);
  return {
    x1: marker.x - markerWidth / 2 - markerPadding,
    x2: marker.x + markerWidth / 2 + markerPadding,
    y1: marker.y - markerHeight / 2 - markerPadding,
    y2: marker.y - markerHeight / 2 - markerPadding
  };
});

export const adjustScaleOfMarkers = action((scale: number) => {
  state.crossPlot.markers.forEach((marker) => {
    const newWidth = getDotSizeFromScale(CROSSPLOT_DOT_WIDTH, scale);
    const newHeight = getDotSizeFromScale(CROSSPLOT_DOT_HEIGHT, scale);
    marker.element.setAttribute("x", (marker.x - newWidth / 2).toString());
    marker.element.setAttribute("y", (marker.y - newHeight / 2).toString());
    marker.element.setAttribute("width", newWidth.toString());
    marker.element.setAttribute("height", newHeight.toString());
    if (marker.type !== "Rect") {
      marker.element.setAttribute("rx", "50%");
      marker.element.setAttribute("ry", "50%");
    }
    if (marker.type === "TOP(LAD)") {
      const { x1, x2, y1, y2 } = getTopLadLineValues(marker);
      marker.line.setAttribute("y1", y1.toString());
      marker.line.setAttribute("y2", y2.toString());
      marker.line.setAttribute("x1", x1.toString());
      marker.line.setAttribute("x2", x2.toString());
    } else if (marker.type === "BASE(FAD)") {
      const { x1, x2, y1, y2 } = getBaseFadLineValues(marker);
      marker.line.setAttribute("y1", y1.toString());
      marker.line.setAttribute("y2", y2.toString());
      marker.line.setAttribute("x1", x1.toString());
      marker.line.setAttribute("x2", x2.toString());
    }
  });
});

export const adjustScaleOfModels = action((scale: number) => {
  state.crossPlot.models.forEach((model) => {
    const newWidth = getDotSizeFromScale(CROSSPLOT_DOT_WIDTH, scale);
    const newHeight = getDotSizeFromScale(CROSSPLOT_DOT_HEIGHT, scale);
    model.element.setAttribute("x", (model.x - newWidth / 2).toString());
    model.element.setAttribute("y", (model.y - newHeight / 2).toString());
    model.element.setAttribute("width", newWidth.toString());
    model.element.setAttribute("height", newHeight.toString());
    if (model.type !== "Rect") {
      model.element.setAttribute("rx", "50%");
      model.element.setAttribute("ry", "50%");
    }
  });
});

export const addCrossPlotMarker = action((temp: Marker) => {
  state.crossPlot.markers.push(observable(temp));
});
export const addCrossPlotModel = action((temp: Model) => {
  state.crossPlot.models.push(observable(temp));
  sortModels();
});
export const removeCrossPlotModel = action((modelId: string) => {
  const removedCrossPlotModel = state.crossPlot.models.find((m) => m.id === modelId);
  if (!removedCrossPlotModel) return;
  removedCrossPlotModel.element.remove();
  state.crossPlot.models = state.crossPlot.models.filter((m) => m.id !== modelId);
  sortModels();
});
export const sortModels = action(() => {
  const models = state.crossPlot.models.slice().sort((a, b) => {
    if (a.age !== b.age) {
      return a.age - b.age;
    }
    return a.depth - b.depth;
  });
  state.crossPlot.models = observable(models);
});
export const removeCrossPlotMarkers = action((id: string) => {
  const removedCrossPlotMarker = state.crossPlot.markers.find((m) => m.id === id);
  if (!removedCrossPlotMarker) return;
  removedCrossPlotMarker.element.remove();
  removedCrossPlotMarker.line.remove();
  state.crossPlot.markers = state.crossPlot.markers.filter((m) => m.id !== id);
});

export const resetCrossPlotModels = action(() => {
  state.crossPlot.models.forEach((model) => {
    model.element.remove();
  });
  state.crossPlot.models = [];
});

export const resetCrossPlotMarkers = action(() => {
  state.crossPlot.markers.forEach((marker) => {
    marker.element.remove();
    marker.line.remove();
  });
  state.crossPlot.markers = [];
});

export const editCrossPlotModel = action((model: Model, partial: Partial<Model>) => {
  if (!isObservable(model)) {
    throw new Error("Model is not observable");
  }
  if (state.crossPlot.crossPlotBounds === undefined) {
    throw new Error("CrossPlotBounds is undefined");
  }
  if (partial.selected !== undefined) {
    model.selected = partial.selected;
  }
  const { scaleX, topAgeX, scaleY, topAgeY, minX, minY, maxX, maxY } = state.crossPlot.crossPlotBounds;
  if (partial.color !== undefined) {
    model.color = partial.color;
    model.element.setAttribute("fill", partial.color);
  }
  if (partial.comment !== undefined) {
    model.comment = partial.comment;
  }
  if (partial.age !== undefined) {
    const markerWidth = getDotSizeFromScale(CROSSPLOT_DOT_WIDTH, state.crossPlot.state.chartZoomSettings.scale);
    model.age = partial.age;
    const coord = ageToCoord(partial.age, minX, maxX, topAgeX, scaleX);
    model.x = coord;
    model.element.setAttribute("x", (coord - markerWidth / 2).toString());
  }
  if (partial.depth !== undefined) {
    const markerHeight = getDotSizeFromScale(CROSSPLOT_DOT_HEIGHT, state.crossPlot.state.chartZoomSettings.scale);
    model.depth = partial.depth;
    const coord = ageToCoord(partial.depth, minY, maxY, topAgeY, scaleY);
    model.y = coord;
    model.element.setAttribute("y", (coord - markerHeight / 2).toString());
  }
  if (partial.type !== undefined) {
    model.type = partial.type;
    switch (partial.type) {
      case "Rect": {
        model.element.setAttribute("rx", "0");
        model.element.setAttribute("ry", "0");
        break;
      }
      case "Circle": {
        model.element.setAttribute("rx", "50%");
        model.element.setAttribute("ry", "50%");
        break;
      }
    }
  }
});
export const editCrossPlotMarker = action((marker: Marker, partial: Partial<Marker>) => {
  if (!isObservable(marker)) {
    throw new Error("Marker is not observable");
  }
  if (state.crossPlot.crossPlotBounds === undefined) {
    throw new Error("CrossPlotBounds is undefined");
  }
  if (partial.selected !== undefined) {
    marker.selected = partial.selected;
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
    const markerWidth = getDotSizeFromScale(CROSSPLOT_DOT_WIDTH, state.crossPlot.state.chartZoomSettings.scale);
    marker.age = partial.age;
    const coord = ageToCoord(partial.age, minX, maxX, topAgeX, scaleX);
    marker.x = coord;
    marker.element.setAttribute("x", (coord - markerWidth / 2).toString());
    // x is the same for both base and top
    const { x1, x2 } = getBaseFadLineValues(marker);
    marker.line.setAttribute("x1", x1.toString());
    marker.line.setAttribute("x2", x2.toString());
  }
  if (partial.depth !== undefined) {
    const markerHeight = getDotSizeFromScale(CROSSPLOT_DOT_HEIGHT, state.crossPlot.state.chartZoomSettings.scale);
    marker.depth = partial.depth;
    const coord = ageToCoord(partial.depth, minY, maxY, topAgeY, scaleY);
    marker.y = coord;
    marker.element.setAttribute("y", (coord - markerHeight / 2).toString());
    switch (marker.type) {
      case "BASE(FAD)": {
        const { y1, y2 } = getBaseFadLineValues(marker);
        marker.line.setAttribute("y1", y1.toString());
        marker.line.setAttribute("y2", y2.toString());
        break;
      }
      case "TOP(LAD)": {
        const { y1, y2 } = getTopLadLineValues(marker);
        marker.line.setAttribute("y1", y1.toString());
        marker.line.setAttribute("y2", y2.toString());
        break;
      }
    }
  }
  if (partial.type !== undefined) {
    marker.type = partial.type;
    setCrossPlotMarkerType(marker, partial.type);
  }
});

export const setCrossPlotMarkerType = action((marker: Marker, type: string) => {
  switch (type) {
    case "Rect": {
      marker.element.setAttribute("rx", "0");
      marker.element.setAttribute("ry", "0");
      marker.line.setAttribute("opacity", "0");
      break;
    }
    case "Circle": {
      marker.element.setAttribute("rx", "50%");
      marker.element.setAttribute("ry", "50%");
      marker.line.setAttribute("opacity", "0");
      break;
    }
    case "BASE(FAD)": {
      const { x1, x2, y1, y2 } = getBaseFadLineValues(marker);
      marker.element.setAttribute("rx", "50%");
      marker.element.setAttribute("ry", "50%");
      marker.line.setAttribute("x1", x1.toString());
      marker.line.setAttribute("x2", x2.toString());
      marker.line.setAttribute("y1", y1.toString());
      marker.line.setAttribute("y2", y2.toString());
      marker.line.setAttribute("opacity", "1");
      break;
    }
    case "TOP(LAD)": {
      const { x1, x2, y1, y2 } = getTopLadLineValues(marker);
      marker.element.setAttribute("rx", "50%");
      marker.element.setAttribute("ry", "50%");
      marker.line.setAttribute("x1", x1.toString());
      marker.line.setAttribute("x2", x2.toString());
      marker.line.setAttribute("y1", y1.toString());
      marker.line.setAttribute("y2", y2.toString());
      marker.line.setAttribute("opacity", "1");
      break;
    }
  }
});
export const sendCrossPlotConversionRequest = action(
  async (action: ConvertCrossPlotRequest["action"], navigate: NavigateFunction) => {
    try {
      if (!state.crossPlot.chartY) {
        pushError(ErrorCodes.INVALID_CROSSPLOT_CONVERSION);
        return;
      }
      if (!state.crossPlot.state.matchesSettings) {
        pushError(ErrorCodes.CROSSPLOT_SETTINGS_MISMATCH);
        return;
      }
      if (state.crossPlot.models.length <= 1) {
        pushError(ErrorCodes.NO_MODELS);
        return;
      }
      assertColumnInfoRoot(state.crossPlot.chartY.columnRef);
      const datapacks = state.crossPlot.chartY.columnRef.datapackUniqueIdentifiers.map((id) =>
        getDatapackFromArray(id, state.datapacks)
      );
      if (datapacks.length === 0 || datapacks.some((datapack) => !datapack)) {
        pushError(ErrorCodes.INVALID_CROSSPLOT_CONVERSION);
        return;
      }
      assertDatapackArray(datapacks);
      const columnRoot = cloneDeep(defaultColumnRoot);
      for (const datapack of datapacks) {
        if (datapack.ageUnits.toLowerCase() === "ma") {
          pushError(ErrorCodes.INVALID_CROSSPLOT_UNITS);
          return;
        }
        columnRoot.children.push(datapack.columnInfo);
      }
      const columnCopy = cloneDeep(columnRoot);
      const chartSettingsCopy: ChartSettings = cloneDeep({
        timeSettings: {
          [state.crossPlot.chartX!.units]: {
            selectedStage: "",
            topStageAge: state.crossPlot.chartXTimeSettings.topStageAge,
            topStageKey: "",
            baseStageAge: state.crossPlot.chartXTimeSettings.baseStageAge,
            baseStageKey: "",
            unitsPerMY: state.crossPlot.chartXTimeSettings.unitsPerMY,
            skipEmptyColumns: true
          },
          [state.crossPlot.chartY!.units]: {
            selectedStage: "",
            topStageAge: state.crossPlot.chartYTimeSettings.topStageAge,
            topStageKey: "",
            baseStageAge: state.crossPlot.chartYTimeSettings.baseStageAge,
            baseStageKey: "",
            unitsPerMY: state.crossPlot.chartYTimeSettings.unitsPerMY,
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
      });
      const xmlSettings = jsonToXml(columnCopy, state.crossPlot.columnHashMap, chartSettingsCopy);
      const body: ConvertCrossPlotRequest = {
        datapackUniqueIdentifiers: state.crossPlot.chartY.columnRef.datapackUniqueIdentifiers,
        models: state.crossPlot.models
          .map((model) => `${model.x}\t${model.y}\t${model.age}\t${model.depth}\t${model.color}\t${model.comment}`)
          .join("\n"),
        settings: xmlSettings,
        action
      };
      const response = await fetcher("/crossplot/convert", {
        method: "POST",
        body: JSON.stringify(body),
        headers: {
          "Content-Type": "application/json"
        }
      });
      if (!response.ok) {
        displayServerError(
          await response.json(),
          ErrorCodes.SERVER_RESPONSE_ERROR,
          ErrorMessages[ErrorCodes.SERVER_RESPONSE_ERROR]
        );
        return;
      }
      if (action === "file") {
        pushSnackbar("Successfully converted datapack", "success");
        return await response.blob();
      } else {
        const datapack = await response.json();
        assertDatapack(datapack);
        assertTempDatapack(datapack);
        addDatapack(datapack);
        await processDatapackConfig([datapack]);
        clearSuccessSnackbars();
        initiateChartGeneration(navigate, "/crossplot");
      }
    } catch (e) {
      console.error(e);
      pushError(ErrorCodes.CROSSPLOT_CONVERSION_FAILED);
    }
  }
);

export const removeCrossPlotMarker = action((marker: Marker) => {
  state.crossPlot.markers = state.crossPlot.markers.filter((m) => m !== marker);
});

export const setCrossPlotChartX = action((chart?: RenderColumnInfo) => {
  setCrossPlotChartMatchesSettings(false);
  state.crossPlot.chartX = chart;
});
export const setCrossPlotChartY = action((chart?: RenderColumnInfo) => {
  setCrossPlotChartMatchesSettings(false);
  state.crossPlot.chartY = chart;
});
// set this before you set the actual changes so it remembers the previous settings
export const setCrossPlotChartMatchesSettings = action((matchesSettings: boolean) => {
  if (state.crossPlot.state.matchesSettings) {
    state.crossPlot.previousSettings = toJS({
      chartX: state.crossPlot.chartX,
      chartY: state.crossPlot.chartY,
      chartXTimeSettings: state.crossPlot.chartXTimeSettings,
      chartYTimeSettings: state.crossPlot.chartYTimeSettings,
      columnHashMap: state.crossPlot.columnHashMap,
      columns: state.crossPlot.columns,
      renderColumns: state.crossPlot.renderColumns
    });
  }
  state.crossPlot.state.matchesSettings = matchesSettings;
});
export const setCrossPlotChartXTimeSettings = action((timeSettings: Partial<CrossPlotTimeSettings>) => {
  setCrossPlotChartMatchesSettings(false);
  state.crossPlot.chartXTimeSettings = {
    ...state.crossPlot.chartXTimeSettings,
    ...timeSettings
  };
});
export const revertCrossPlot = action(() => {
  state.crossPlot.chartX = cloneDeep(state.crossPlot.previousSettings.chartX);
  state.crossPlot.chartY = state.crossPlot.previousSettings.chartY;
  state.crossPlot.chartXTimeSettings = state.crossPlot.previousSettings.chartXTimeSettings;
  state.crossPlot.chartYTimeSettings = state.crossPlot.previousSettings.chartYTimeSettings;
  state.crossPlot.columnHashMap = observable.map(state.crossPlot.previousSettings.columnHashMap);
  state.crossPlot.columns = state.crossPlot.previousSettings.columns;
  state.crossPlot.renderColumns = state.crossPlot.previousSettings.renderColumns;
  state.crossPlot.state.matchesSettings = true;
});
export const setCrossPlotChartYTimeSettings = action((timeSettings: Partial<CrossPlotTimeSettings>) => {
  setCrossPlotChartMatchesSettings(false);
  state.crossPlot.chartYTimeSettings = {
    ...state.crossPlot.chartYTimeSettings,
    ...timeSettings
  };
});
const setLoading = action((loading: boolean) => {
  state.crossPlot.loading = loading;
});

export const saveConvertedDatapack = action(
  "saveConvertedDatapack",
  async (navigate: NavigateFunction, filename: string) => {
    try {
      setLoading(true);
      const blob = await sendCrossPlotConversionRequest("file", navigate);
      if (!blob) {
        return;
      }
      //TODO change this to a user generated name from the form
      await downloadFile(blob, `${filename}.txt`);
    } finally {
      setLoading(false);
    }
  }
);
export const generateConvertedCrossPlotChart = action(
  "generateConvertedCrossPlotChart",
  async (navigate: NavigateFunction) => {
    try {
      setLoading(true);
      await sendCrossPlotConversionRequest("chart", navigate);
    } finally {
      setLoading(false);
    }
  }
);
export const uploadConvertedDatapackToProfile = action(
  "uploadConvertedDatapackToProfile",
  async (navigate: NavigateFunction, title: string) => {
    if (!state.isLoggedIn) {
      pushError(ErrorCodes.NOT_LOGGED_IN);
      return;
    }
    const tempMetadata: DatapackMetadata = {
      title,
      description: "temporary crossplot conversion",
      originalFileName: "CrossplotConversion.txt",
      storedFileName: "CrossplotConversion.txt",
      date: formatDateForDatapack(dayjs()),
      size: "0",
      authoredBy: state.user.username,
      references: [],
      tags: [],
      notes: "",
      type: "user",
      isPublic: false,
      priority: 1,
      uuid: state.user.uuid,
      hasFiles: false
    };
    let file: File;
    try {
      try {
        const blob = await sendCrossPlotConversionRequest("file", navigate);
        if (!blob) {
          return;
        }
        file = new File([blob], "CrossplotConversion.txt", {
          type: "text/plain"
        });
      } catch (e) {
        console.error(e);
        pushError(ErrorCodes.CROSSPLOT_CONVERSION_FAILED);
        return;
      }
      // remove the success snackbar if it exists
      clearSuccessSnackbars();
      try {
        await uploadUserDatapack(file, tempMetadata);
      } catch (e) {
        console.error(e);
        pushError(ErrorCodes.REGULAR_USER_UPLOAD_DATAPACK_TOO_LARGE);
      }
    } finally {
      setLoading(false);
    }
  }
);

function areSettingsValidForGeneration() {
  // check if columns EXIST
  if (!state.crossPlot.chartX || !state.crossPlot.columns) {
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
    !getChildRenderColumns(state.crossPlot.chartX, state.crossPlot.columnHashMap).some((child) => child.on) ||
    !getChildRenderColumns(state.crossPlot.chartY, state.crossPlot.columnHashMap).some((child) => child.on)
  ) {
    pushError(ErrorCodes.NO_COLUMNS_SELECTED);
    return false;
  }
  removeError(ErrorCodes.NO_COLUMNS_SELECTED);
  return true;
}

const createColumnHashMap = (column: RenderColumnInfo, hash: Map<string, RenderColumnInfo>) => {
  hash.set(column.name, column);
  getChildRenderColumns(column, state.crossPlot.columnHashMap).forEach((child) => createColumnHashMap(child, hash));
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
    resetCrossPlotModels();
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
      const json = jsonToXml(columnCopy.columnRef, columnHashMap, crossPlotChartSettings);

      const crossPlotChartRequest: ChartRequest = {
        isCrossPlot: true,
        settings: json,
        datapacks: state.crossPlot.datapacks,
        useCache: state.useCache
      };

      const response = await sendChartRequestToServer(crossPlotChartRequest);
      updateChartLoadingProgress(0, "Initializing");
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
const combineCrossPlotColumns = action((columnOne: RenderColumnInfo, columnTwo: RenderColumnInfo) => {
  const columnRoot: ColumnInfo = cloneDeep(defaultColumnRoot);
  columnOne.parent = columnRoot.name;
  columnRoot.children = [columnOne.columnRef];
  columnRoot.fontOptions = columnOne.fontOptions;
  for (const opt in columnRoot.fontsInfo) {
    columnRoot.fontsInfo[opt as keyof FontsInfo].inheritable = true;
  }
  if (columnOne.units === columnTwo.units) {
    return convertColumnInfoToRenderColumnInfo(columnRoot);
  }
  columnTwo.parent = columnRoot.name;
  columnRoot.children.push(columnTwo.columnRef);
  columnRoot.fontOptions = Array.from(new Set([...columnOne.fontOptions, ...columnTwo.fontOptions]));
  return convertColumnInfoToRenderColumnInfo(columnRoot);
});

export const autoPlotCrossPlot = action(async () => {
  try {
    if (!state.crossPlot.chartY) {
      pushError(ErrorCodes.INVALID_CROSSPLOT_CONVERSION);
      return;
    }
    if (!state.crossPlot.state.matchesSettings) {
      pushError(ErrorCodes.CROSSPLOT_SETTINGS_MISMATCH);
      return;
    }
    if (state.crossPlot.chartY.units.toLowerCase() === "ma") {
      pushError(ErrorCodes.INVALID_CROSSPLOT_UNITS);
      return;
    }
    const chartY = state.crossPlot.chartY.columnRef;
    const chartX = state.crossPlot.chartX?.columnRef;
    assertColumnInfoRoot(chartY);
    assertColumnInfoRoot(chartX);
    const datapacks = [
      ...chartY.datapackUniqueIdentifiers.map((id) => getDatapackFromArray(id, state.datapacks)),
      ...chartX.datapackUniqueIdentifiers.map((id) => getDatapackFromArray(id, state.datapacks))
    ];
    if (datapacks.length === 0 || datapacks.some((datapack) => !datapack)) {
      pushError(ErrorCodes.INVALID_CROSSPLOT_CONVERSION);
      return;
    }
    assertDatapackArray(datapacks);
    const columnRoot = cloneDeep(defaultColumnRoot);
    columnRoot.children = [chartX, chartY];
    const columnCopy = cloneDeep(columnRoot);
    const chartSettingsCopy = cloneDeep(
      createCrossPlotChartSettings(state.crossPlot.chartXTimeSettings, state.crossPlot.chartYTimeSettings)
    );
    const xmlSettings = jsonToXml(columnCopy, state.crossPlot.columnHashMap, chartSettingsCopy);
    const body: AutoPlotRequest = {
      datapackUniqueIdentifiers: [...chartY.datapackUniqueIdentifiers, ...chartX.datapackUniqueIdentifiers],
      settings: xmlSettings
    };
    const response = await fetcher("/crossplot/autoplot", {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json"
      }
    });
    if (!response.ok) {
      throw new Error("Failed to autoplot");
    }
    const responseJson = await response.json();
    assertAutoPlotResponse(responseJson);
    const { markers } = responseJson;
    markers.forEach((marker) => {
      if (state.crossPlot.markers.some((m) => m.id === marker.id)) {
        return;
      }
      const { minX, minY, maxX, maxY, scaleX, scaleY, topAgeX, topAgeY } = state.crossPlot.crossPlotBounds!;
      const x = ageToCoord(marker.age, minX, maxX, topAgeX, scaleX);
      const y = ageToCoord(marker.depth, minY, maxY, topAgeY, scaleY);
      const crossPlotMarker = {
        ...marker,
        x,
        y,
        element: getDotRect(
          marker.id,
          {
            x,
            y
          },
          state.crossPlot.state.chartZoomSettings.scale,
          marker.color
        ),
        line: getLine(marker.id)
      };
      addCrossPlotMarker(crossPlotMarker);
      setCrossPlotMarkerType(crossPlotMarker, marker.type);
    });
    pushSnackbar("Successfully autoplotted", "success");
  } catch (e) {
    displayServerError(e, ErrorCodes.SERVER_RESPONSE_ERROR, ErrorMessages[ErrorCodes.SERVER_RESPONSE_ERROR]);
  }
});

export const setCrossPlotDatapackConfig = action(
  "setCrossPlotDatapackConfig",
  async (message: SetDatapackConfigReturnValue) => {
    state.crossPlot.columns = message.columnRoot;
    state.crossPlot.renderColumns = convertColumnInfoToRenderColumnInfo(message.columnRoot);
    state.crossPlot.datapacks = message.datapacks;
    await initializeColumnHashMap(message.columnRoot);

    runInAction(() => {
      for (const child of state.crossPlot.columns!.children) {
        if (child.units.toLowerCase() === "ma") {
          state.crossPlot.chartX = state.crossPlot.columnHashMap.get(child.name);
          break;
        }
      }
      if (!state.crossPlot.chartX)
        state.crossPlot.chartX = state.crossPlot.columnHashMap.get(state.crossPlot.columns!.children[0].name);
      state.crossPlot.chartY = state.crossPlot.columnHashMap.get(state.crossPlot.columns!.children[0].name);
      state.crossPlot.state.matchesSettings = true;
    });
  }
);
const initializeColumnHashMap = action("initializeColumnHashmap", async (root: ColumnInfo) => {
  const tempMap = new Map<string, RenderColumnInfo>();
  const stack: ColumnInfo[] = [root];

  while (stack.length > 0) {
    const current = stack.pop()!;
    const renderColumn = convertColumnInfoToRenderColumnInfo(current);
    tempMap.set(renderColumn.name, renderColumn);

    for (const child of current.children) {
      stack.push(child);
    }
  }
  for (const column of state.settingsTabs.columnHashMap.values()) {
    column.dispose();
  }
  state.crossPlot.columnHashMap = tempMap;
});

export const setCrossPlotColumnSelected = action((column: string | null) => {
  const previouslySelectedColumn = state.crossPlot.columnSelected
    ? state.crossPlot.columnHashMap.get(state.crossPlot.columnSelected)
    : null;
  if (previouslySelectedColumn) {
    previouslySelectedColumn.isSelected = false;
    const parentColumn = previouslySelectedColumn.parent
      ? state.crossPlot.columnHashMap.get(previouslySelectedColumn.parent)
      : null;
    if (parentColumn) parentColumn.hasSelectedChildren = false;
  }
  state.crossPlot.columnSelected = column;
});
