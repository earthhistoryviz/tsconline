import { observable } from "mobx";

import { ErrorAlert, FaciesOptions, MapHistory } from "../types";
import { TimescaleItem } from "@tsconline/shared";
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
  showPresetInfo: boolean;
  geologicalTopStageAges: TimescaleItem[];
  geologicalBaseStageAges: TimescaleItem[];
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
  settings: {
    selectedStage: string;
    topStageAge: number;
    topStageKey: string;
    baseStageAge: number;
    baseStageKey: string;
    unitsPerMY: number;
    useDatapackSuggestedAge: boolean;
    mouseOverPopupsEnabled: boolean;
    datapackContainsSuggAge: boolean;
    selectedBaseStage: string;
    selectedTopStage: string;
  };
  useCache: boolean;
  usePreset: boolean;
  openSnackbar: boolean;
  errors: {
    errorAlerts: Map<string, ErrorAlert>;
  };
};

export const state = observable<State>({
  chartLoading: false,
  madeChart: false,
  tab: 0,
  showSuggestedAgePopup: false,
  useSuggestedAge: true,
  isFullscreen: false,
  showPresetInfo: false,
  geologicalTopStageAges: [],
  geologicalBaseStageAges: [],
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
    selectedStage: "",
    topStageAge: 0,
    topStageKey: "",
    baseStageAge: 0,
    baseStageKey: "",
    unitsPerMY: 2,
    mouseOverPopupsEnabled: false,
    datapackContainsSuggAge: false,
    useDatapackSuggestedAge: false,
    selectedBaseStage: "",
    selectedTopStage: ""
  },
  useCache: true,
  usePreset: true,
  openSnackbar: false,
  errors: {
    errorAlerts: new Map<string, ErrorAlert>()
  }
});
