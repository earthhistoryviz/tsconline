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
  settingsPath: string;
};

export type SettingsTabs = "time" | "column" | "font" | "mappoints" | "datapacks";

export type SnackbarInfo = {
  snackbarText: string;
  snackbarCount: number;
  severity: "success" | "info" | "warning";
};
export type TimeSettings = {
  [unit: string]: {
    selectedStage: string;
    topStageAge: number;
    topStageKey: string;
    baseStageAge: number;
    baseStageKey: string;
    unitsPerMY: number;
    skipEmptyColumns: boolean;
  };
};
export type ChartSettings = {
  timeSettings: TimeSettings;
  noIndentPattern: boolean;
  enableColumnBackground: boolean;
  enableChartLegend: boolean;
  enablePriority: boolean;
  enableHideBlockLabel: boolean;
  mouseOverPopupsEnabled: boolean;
  datapackContainsSuggAge: boolean;
  useDatapackSuggestedAge: boolean;
};

export function equalTimeSettings(a: TimeSettings, b: TimeSettings): boolean {
  return (
    Object.keys(a).length === Object.keys(b).length &&
    Object.keys(a).every((key) => {
      const aValue = a[key];
      const bValue = b[key];
      return (
        aValue.selectedStage === bValue.selectedStage &&
        aValue.topStageAge === bValue.topStageAge &&
        aValue.topStageKey === bValue.topStageKey &&
        aValue.baseStageAge === bValue.baseStageAge &&
        aValue.baseStageKey === bValue.baseStageKey &&
        aValue.unitsPerMY === bValue.unitsPerMY &&
        aValue.skipEmptyColumns === bValue.skipEmptyColumns
      );
    })
  );
}
export function equalChartSettings(a: ChartSettings, b: ChartSettings): boolean {
  return (
    equalTimeSettings(a.timeSettings, b.timeSettings) &&
    a.noIndentPattern === b.noIndentPattern &&
    a.enableColumnBackground === b.enableColumnBackground &&
    a.enableChartLegend === b.enableChartLegend &&
    a.enablePriority === b.enablePriority &&
    a.enableHideBlockLabel === b.enableHideBlockLabel &&
    a.mouseOverPopupsEnabled === b.mouseOverPopupsEnabled &&
    a.datapackContainsSuggAge === b.datapackContainsSuggAge &&
    a.useDatapackSuggestedAge === b.useDatapackSuggestedAge
  );
}
export function equalConfig(a: Config, b: Config): boolean {
  return (
    a.datapacks.length === b.datapacks.length && a.datapacks.every((aValue, index) => aValue === b.datapacks[index])
  );
}
