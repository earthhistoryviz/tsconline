import { observable } from "mobx";

import { ErrorAlert, FaciesOptions, MapHistory, Settings } from "../types";
import type {
  MapHierarchy,
  MapInfo,
  ChartConfig,
  ColumnInfo,
  GeologicalStages,
  Presets,
  DatapackIndex,
  MapPackIndex,
  Patterns
} from "@tsconline/shared";

export type State = {
  chartLoading: boolean;
  tab: number;
  madeChart: boolean;
  showSuggestedAgePopup: boolean;
  useSuggestedAge: boolean;
  isFullscreen: boolean;
  settingsTabs: {
    selected: "time" | "font" | "column" | "mappoints";
    columns: ColumnInfo | null;
    columnSelected: string | null;
    geologicalTopStages: GeologicalStages;
    geologicalBaseStages: GeologicalStages;
    columnHashMap: Map<string, ColumnInfo>;
  };
  mapState: {
    mapInfo: MapInfo;
    mapHierarchy: MapHierarchy;
    currentFaciesOptions: FaciesOptions;
    selectedMap: string | null;
    isLegendOpen: boolean;
    isMapViewerOpen: boolean;
    isFacies: boolean;
    selectedMapAgeRange: {
      minAge: number;
      maxAge: number;
    };
    mapHistory: MapHistory;
  };
  config: {
    datapacks: string[]; // the datapacks used on the server
    settingsPath: string; // the path to the settings file on the server
  };
  presets: Presets;
  datapackIndex: DatapackIndex;
  mapPackIndex: MapPackIndex;
  mapPatterns: {
    patterns: Patterns;
    sortedPatterns: Patterns[string][];
  };
  selectedPreset: ChartConfig | null;
  chartPath: string;
  chartHash: string;
  settingsXML: string;
  settingsJSON: any;
  settings: Settings;
  useCache: boolean;
  usePreset: boolean;
  openSnackbar: boolean;
  errorAlerts: ErrorAlert[];
};

export const state = observable<State>({
  chartLoading: false,
  madeChart: false,
  tab: 0,
  showSuggestedAgePopup: false,
  useSuggestedAge: true,
  isFullscreen: false,
  settingsTabs: {
    selected: "time",
    columns: null,
    columnSelected: null,
    geologicalTopStages: {},
    geologicalBaseStages: {},
    columnHashMap: new Map<string, ColumnInfo>()
  },
  mapState: {
    mapInfo: {},
    mapHierarchy: {},
    currentFaciesOptions: {
      faciesAge: 0,
      dotSize: 1,
      presentRockTypes: new Set<string>()
    },
    selectedMap: null,
    isLegendOpen: false,
    isMapViewerOpen: false,
    isFacies: false,
    selectedMapAgeRange: {
      minAge: 0,
      maxAge: 0
    },
    mapHistory: {
      savedHistory: {},
      accessHistory: []
    }
  },
  config: {
    datapacks: [],
    settingsPath: ""
  },
  presets: {},
  datapackIndex: {},
  mapPackIndex: {},
  mapPatterns: {
    patterns: {},
    sortedPatterns: []
  },
  selectedPreset: null,
  chartPath: "",
  chartHash: "",
  settingsXML: "",
  settingsJSON: {},
  settings: {
    topStageAge: 0,
    topStageKey: "",
    baseStageAge: 0,
    baseStageKey: "",
    unitsPerMY: 2,
    mouseOverPopupsEnabled: false,
    datapackContainsSuggAge: false
  },
  useCache: true,
  usePreset: true,
  openSnackbar: false,
  errorAlerts: []
});
