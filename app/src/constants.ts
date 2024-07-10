import { ChartSettings } from "./types";

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
  datapackContainsSuggAge: false,
  useDatapackSuggestedAge: true
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

export const sequenceStyle = "stroke-width: 0; fill: rgb(64, 191, 233);";
export const trendStyle = "stroke-width: 1; stroke: black; fill: rgb(64, 191, 233);";
