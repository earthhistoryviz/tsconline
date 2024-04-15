export type FaciesOptions = {
  faciesAge: number;
  dotSize: number;
  presentRockTypes: Set<string>;
};
export type MapHistory = {
  // saved history only concerns the facies
  // we only push to saved and access saved history
  // if the map is currently in facies mode
  savedHistory: {
    [name: string]: {
      faciesOptions: FaciesOptions;
    };
  };
  accessHistory: {
    isFacies: boolean;
    name: string;
  }[];
};
export type LegendItem = {
  color: string;
  label: string;
  icon: React.ElementType<any>;
};
export type ErrorAlert = {
  errorText: string;
  errorCount: number;
};
export type Config = {
  datapacks: string[];
};

export type SnackbarInfo = {
  snackbarText: string;
  snackbarCount: number;
  severity: "success" | "info" | "warning";
};
export type ChartSettings = {
  selectedStage: string;
  topStageAge: number;
  topStageKey: string;
  baseStageAge: number;
  baseStageKey: string;
  unitsPerMY: number;
  skipEmptyColumns: boolean;
  noIndentPattern: boolean;
  enableColumnBackground: boolean;
  enableChartLegend: boolean;
  enablePriority: boolean;
  enableHideBlockLabel: boolean;
  mouseOverPopupsEnabled: boolean;
  datapackContainsSuggAge: boolean;
  useDatapackSuggestedAge: boolean;
  selectedBaseStage: string;
  selectedTopStage: string;
  unit: string;
};

export function equalChartSettings(a: ChartSettings, b: ChartSettings): boolean {
  return (
    a.selectedStage === b.selectedStage &&
    a.topStageAge === b.topStageAge &&
    a.topStageKey === b.topStageKey &&
    a.baseStageAge === b.baseStageAge &&
    a.baseStageKey === b.baseStageKey &&
    a.unitsPerMY === b.unitsPerMY &&
    a.mouseOverPopupsEnabled === b.mouseOverPopupsEnabled &&
    a.datapackContainsSuggAge === b.datapackContainsSuggAge &&
    a.useDatapackSuggestedAge === b.useDatapackSuggestedAge &&
    a.selectedBaseStage === b.selectedBaseStage &&
    a.selectedTopStage === b.selectedTopStage
  );
}
export function equalConfig(a: Config, b: Config): boolean {
  return (
    a.datapacks.length === b.datapacks.length && a.datapacks.every((aValue, index) => aValue === b.datapacks[index])
  );
}
