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

export type SnackbarInfo = {
  snackbarText: string;
  snackbarCount: number;
}
export type ChartSettings = {
  selectedStage: string;
  topStageAge: number;
  topStageKey: string;
  baseStageAge: number;
  baseStageKey: string;
  unitsPerMY: number;
  mouseOverPopupsEnabled: boolean;
  datapackContainsSuggAge: boolean;
  useDatapackSuggestedAge: boolean;
  selectedBaseStage: string;
  selectedTopStage: string;
};
