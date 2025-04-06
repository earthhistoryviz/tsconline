import {
  ColumnInfo,
  DataMiningPointDataType,
  Datapack,
  DatapackConfigForChartRequest,
  DatapackMetadata,
  DatapackUniqueIdentifier,
  MapHierarchy,
  MapInfo,
  SharedUser,
  assertColumnInfo,
  assertDatapackConfigForChartRequest,
  assertDatapackUniqueIdentifier,
  assertMapHierarchy,
  assertMapInfo,
  throwError
} from "@tsconline/shared";
import React from "react";

export type DatapackFetchParams = {
  isPublic: boolean;
} & DatapackUniqueIdentifier;

export type EditableDatapackMetadata = Omit<
  DatapackMetadata,
  "originalFileName" | "storedFileName" | "size" | "datapackImage"
>;

export type UploadDatapackMethodType = (
  file: File,
  metadata: DatapackMetadata,
  datapackProfilePicture?: File,
  pdfFiles?: File[]
) => Promise<void>;

export type User = SharedUser & {
  settings: {
    darkMode: boolean;
    language: string;
  };
};

export type Reference = {
  id: number;
  reference: string;
};

export type WindowStats = {
  windowStart: number;
  windowEnd: number;
  value: number;
};
export type ColumnInfoRoot = ColumnInfo & {
  datapackUniqueIdentifiers: DatapackUniqueIdentifier[];
};

export type DownloadPdfMessage = {
  imgURI: string;
  height: number;
  width: number;
};

export type DownloadPdfCompleteMessage = {
  status: "success" | "failure";
  value: Blob | undefined;
};

export type ChartTabState = {
  chartTimelineEnabled: boolean;
  downloadFilename: string;
  downloadFiletype: "svg" | "pdf" | "png";
  isSavingChart: boolean;
  unsafeChartContent: string;
  madeChart: boolean;
  chartLoading: boolean;
  chartContent: string;
  chartZoomSettings: ChartZoomSettings;
  chartHash: string;
  matchesSettings: boolean;
};
export type ChartContextType = {
  chartTabState: ChartTabState;
  stateChartOptions?: {
    icon: React.ReactNode;
    label: string;
    onChange: (boolean: boolean) => void;
    value: boolean;
  }[];
  actionChartOptions?: {
    icon: React.ReactNode;
    label: string;
    onChange: () => void;
  }[];
};

export type SetDatapackConfigMessage = {
  datapacks: DatapackConfigForChartRequest[];
  datapacksArray: Datapack[];
};

export type SetDatapackConfigCompleteMessage = {
  status: "success" | "failure";
  value: SetDatapackConfigReturnValue | undefined;
};
export type SetDatapackConfigReturnValue = {
  columnRoot: ColumnInfo;
  foundDefaultAge: boolean;
  mapHierarchy: MapHierarchy;
  mapInfo: MapInfo;
  datapacks: DatapackConfigForChartRequest[];
};

//id: unique id among search results
//columnName: name of column that event/column is under
//columnPath: path of edit names up until chart root for display
//unit: unit of time (ex. Ma) for "in context" feature
//age: undefined = no age, topAge and baseAge can be the same
//type: type for events
//notes: popup included with event and any other info
export type EventSearchInfo = {
  id: number;
  columnName: string;
  columnPath: string[];
  unit: string;
  age?: { topAge: number; baseAge: number };
  type?: string;
  notes?: string;
};

export type GroupedEventSearchInfo = {
  key: string;
  info: EventSearchInfo[];
};

export type DataMiningStatisticApproach = "average" | "minimum" | "maximum" | "rateOfChange" | "frequency";

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
  datapacks: DatapackConfigForChartRequest[];
  settingsPath: string;
};

export const CrossPlotSettingsTabs = {
  xAxis: "xAxis",
  yAxis: "yAxis",
  column: "Column"
};

export type ChartZoomSettings = {
  scale: number;
  zoomFitScale: number;
  zoomFitMidCoord: number;
  zoomFitMidCoordIsX: boolean;
  resetMidX: number;
  enableScrollZoom: boolean;
};

export type CrossPlotSettingsTabs = keyof typeof CrossPlotSettingsTabs;

export const SettingsMenuOptionLabels = {
  time: "Time",
  preferences: "Preferences",
  column: "Column",
  search: "Search",
  font: "Font",
  mappoints: "Map Points",
  datapacks: "Datapacks",
  loadsave: "Load/Save"
};

export type SettingsTabs = keyof typeof SettingsMenuOptionLabels;

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
export type CrossPlotTimeSettings = {
  topStageAge: number;
  baseStageAge: number;
  unitsPerMY: number;
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
};

export type EditableUserProperties = {
  isAdmin: boolean;
  accountType: string;
};

export type CrossPlotBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  topLimitX: number;
  topLimitY: number;
  baseLimitX: number;
  baseLimitY: number;
  scaleX: number;
  scaleY: number;
  topAgeX: number;
  topAgeY: number;
};

export function assertColumnInfoRoot(o: any): asserts o is ColumnInfoRoot {
  if (!o || typeof o !== "object") throw new Error("ColumnInfoRoot must be a non-null object");
  for (const datapackUniqueIdentifier of o.datapackUniqueIdentifiers) {
    assertDatapackUniqueIdentifier(datapackUniqueIdentifier);
  }
  assertColumnInfo(o);
}

export function assertDatapackFetchParams(o: any): asserts o is DatapackFetchParams {
  if (!o || typeof o !== "object") throw new Error("DatapackFetchParams must be a non-null object");
  if (typeof o.isPublic !== "boolean") throwError("DatapackFetchParams", "isPublic", "boolean", o.isPublic);
  assertDatapackUniqueIdentifier(o);
}

export function assertSetDatapackConfigReturnValue(o: any): asserts o is SetDatapackConfigReturnValue {
  if (!o || typeof o !== "object") throw new Error("SetDatapackConfigReturnValue must be a non-null object");
  if (!o.datapacks || !Array.isArray(o.datapacks))
    throw new Error("SetDatapackConfigReturnValue datapacks must be an array");
  if (typeof o.foundDefaultAge !== "boolean")
    throwError("SetDatapackConfigReturnValue", "foundDefaultAge", "boolean", o.foundDefaultAge);
  for (const datapack of o.datapacks) {
    assertDatapackConfigForChartRequest(datapack);
  }
  assertMapHierarchy(o.mapHierarchy);
  assertMapInfo(o.mapInfo);
  assertColumnInfo(o.columnRoot);
}

export function convertDataMiningPointDataTypeToDataMiningStatisticApproach(
  value: DataMiningPointDataType
): DataMiningStatisticApproach {
  switch (value) {
    case "Average Value":
      return "average";
    case "Minimum Value":
      return "minimum";
    case "Maximum Value":
      return "maximum";
    case "Rate of Change":
      return "rateOfChange";
    case "Frequency":
      return "frequency";
    default:
      throw new Error(`Invalid DataMiningPointDataType: ${value}`);
  }
}

export function equalTimeSettings(a: TimeSettings, b: TimeSettings): boolean {
  return (
    Object.keys(a).length === Object.keys(b).length &&
    Object.keys(a).every((key) => {
      const aValue = a[key];
      const bValue = b[key];
      if (bValue === undefined || aValue === undefined) return false;
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
export function assertDataMiningStatisticApproach(value: string): asserts value is DataMiningStatisticApproach {
  if (/^(average|minimum|maximum|rateOfChange|frequency)$/.test(value) === false) {
    throw new Error(`Invalid statistic: ${value}`);
  }
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
    a.datapackContainsSuggAge === b.datapackContainsSuggAge
  );
}
export function equalConfig(a: Config, b: Config): boolean {
  return (
    a.datapacks.length === b.datapacks.length && a.datapacks.every((aValue, index) => aValue === b.datapacks[index])
  );
}

export function assertSettingsTabs(value: string): asserts value is SettingsTabs {
  if (!(value in SettingsMenuOptionLabels)) {
    throw new Error(`Invalid settings tab: ${value}`);
  }
}
