import { ChartSettings } from "./types";

export const dataminingIdentifiers = [
  "FAD",
  "LAD",
  "Combined Events",
  "Regression Analysis",
  "Minimum Value",
  "Maximum Value",
  "Average Value",
  "Rate of Change",
  "Overlay"
];

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
