import { observable } from "mobx";

import { ChartSettings, ErrorAlert, FaciesOptions, MapHistory } from "../types";
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
  Patterns,
  ChartInfoTSC
} from "@tsconline/shared";
import { ErrorCodes } from "../util/error-codes";

export type State = {
  chartLoading: boolean;
  tab: number;
  madeChart: boolean;
  showSuggestedAgePopup: boolean;
  isFullscreen: boolean;
  showPresetInfo: boolean;
  geologicalTopStageAges: TimescaleItem[];
  geologicalBaseStageAges: TimescaleItem[];
  settingsTabs: {
    selected: "time" | "font" | "column" | "mappoints" | "datapacks";
    columns: ColumnInfo | undefined;
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
  chartContent: string;
  chartHash: string;
  settingsXML: string;
  settingsTSC: ChartInfoTSC;
  settings: ChartSettings;
  useCache: boolean;
  usePreset: boolean;
  openSnackbar: boolean;
  errors: {
    errorAlerts: Map<ErrorCodes, ErrorAlert>;
  };
};

export const state = observable<State>({
  chartLoading: false,
  madeChart: false,
  tab: 0,
  showSuggestedAgePopup: false,
  isFullscreen: false,
  showPresetInfo: false,
  geologicalTopStageAges: [],
  geologicalBaseStageAges: [],
  settingsTabs: {
    selected: "time",
    columns: undefined,
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
  chartContent: "",
  chartHash: "",
  settingsXML: "",
  settingsTSC: {},
  settings: {
    selectedStage: "",
    topStageAge: 0,
    topStageKey: "",
    baseStageAge: 0,
    baseStageKey: "",
    unitsPerMY: 2,
    mouseOverPopupsEnabled: false,
    datapackContainsSuggAge: false,
    useDatapackSuggestedAge: true,
    selectedBaseStage: "",
    selectedTopStage: ""
  },
  useCache: true,
  usePreset: true,
  openSnackbar: false,
  errors: {
    errorAlerts: new Map<ErrorCodes, ErrorAlert>()
  }
});
