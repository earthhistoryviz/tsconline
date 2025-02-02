import { ChartSettings, CrossPlotTimeSettings } from "./types";

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
