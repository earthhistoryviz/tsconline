import { ChartSettings, ChartTabState, ChartZoomSettings, CrossPlotTimeSettings } from "./types";

export const settings: ChartSettings = {
  timeSettings: {
    Ma: {
      selectedStage: "",
      topStageAge: 0,
      topStageKey: "",
      baseStageAge: 10,
      baseStageKey: "",
      unitsPerMY: 2,
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
export const defaultTimeSettings = {
  selectedStage: "",
  topStageAge: 0,
  topStageKey: "",
  baseStageAge: 10,
  baseStageKey: "",
  unitsPerMY: 2,
  skipEmptyColumns: true
};

export const defaultCrossPlotSettings: CrossPlotTimeSettings = {
  topStageAge: 0,
  baseStageAge: 10,
  unitsPerMY: 2
};
export const isDevServer = window.location.hostname === "www.dev.timescalecreator.org" || "www.pr-preview.geolex.org";

export const defaultChartZoomSettings: ChartZoomSettings = {
  zoomFitScale: 1,
  zoomFitMidCoord: 0,
  zoomFitMidCoordIsX: true,
  resetMidX: 0,
  scale: 1,
  enableScrollZoom: false
};

export const defaultChartTabState: ChartTabState = {
  chartHash: "",
  chartContent: "",
  chartTimelineEnabled: false,
  chartZoomSettings: defaultChartZoomSettings,
  downloadFilename: "chart",
  downloadFiletype: "svg",
  isSavingChart: false,
  unsafeChartContent: "",
  madeChart: false,
  chartLoading: false
};
