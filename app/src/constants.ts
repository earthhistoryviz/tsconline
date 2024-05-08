import { ChartSettings, SettingsTabs } from "./types";

export const settings: ChartSettings = {
  timeSettings: {
    Ma: {
      selectedStage: "",
      topStageAge: 0,
      topStageKey: "",
      baseStageAge: 0,
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
  baseStageAge: 0,
  baseStageKey: "",
  unitsPerMY: 2,
  skipEmptyColumns: true
};
