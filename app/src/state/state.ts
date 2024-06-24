import { observable } from "mobx";

import {
  SnackbarInfo,
  ChartSettings,
  ErrorAlert,
  FaciesOptions,
  MapHistory,
  Config,
  SettingsTabs,
  CachedConfig
} from "../types";
import { TimescaleItem } from "@tsconline/shared";
import type {
  MapHierarchy,
  MapInfo,
  ChartConfig,
  ColumnInfo,
  Presets,
  DatapackIndex,
  MapPackIndex,
  Patterns,
  SharedUser
} from "@tsconline/shared";
import { ErrorCodes } from "../util/error-codes";
import { defaultColors } from "../util/constant";
import { settings } from "../constants";

export type State = {
  chartTab: {
    chartTimelineEnabled: boolean;
    chartTimelineLocked: boolean;
    scale: number;
    zoomFitScale: number;
    resetMidX: number;
    zoomFitMidX: number;
    downloadFilename: string;
    downloadFiletype: "svg" | "pdf" | "png";
    enableScrollZoom: boolean;
  };
  loadSaveFilename: string;
  cookieConsent: boolean | null;
  isLoggedIn: boolean;
  user: SharedUser;
  chartLoading: boolean;
  tab: number;
  madeChart: boolean;
  showSuggestedAgePopup: boolean;
  isFullscreen: boolean;
  showPresetInfo: boolean;
  geologicalTopStageAges: TimescaleItem[];
  geologicalBaseStageAges: TimescaleItem[];
  settingsTabs: {
    selected: SettingsTabs;
    columns: ColumnInfo | undefined;
    columnSelected: string | null;
    columnHashMap: Map<string, ColumnInfo>;
    columnSearchTerm: string;
    datapackDisplayType: "rows" | "cards";
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
  config: Config;
  prevConfig: Config;
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
  settings: ChartSettings;
  prevSettings: ChartSettings;
  useCache: boolean;
  usePreset: boolean;
  errors: {
    errorAlerts: Map<ErrorCodes, ErrorAlert>;
  };
  snackbars: SnackbarInfo[];
  presetColors: string[];
  datapackCachedConfiguration: Map<string, CachedConfig>;
};

export const state = observable<State>({
  chartTab: {
    chartTimelineEnabled: false,
    chartTimelineLocked: false,
    scale: 1,
    zoomFitScale: 1,
    resetMidX: 0,
    zoomFitMidX: 0,
    downloadFilename: "chart",
    downloadFiletype: "svg",
    enableScrollZoom: false
  },
  loadSaveFilename: "settings", //name without extension (.tsc)
  cookieConsent: null,
  isLoggedIn: false,
  user: {
    username: "",
    email: "",
    pictureUrl: "",
    isGoogleUser: false,
    isAdmin: false,
    settings: {
      darkMode: true,
      language: "English"
    }
  },
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
    columnHashMap: new Map<string, ColumnInfo>(),
    columnSearchTerm: "",
    datapackDisplayType: "rows"
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
  prevConfig: {
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
  settings: JSON.parse(JSON.stringify(settings)),
  prevSettings: JSON.parse(JSON.stringify(settings)),
  useCache: true,
  usePreset: true,
  errors: {
    errorAlerts: new Map<ErrorCodes, ErrorAlert>()
  },
  presetColors: JSON.parse(localStorage.getItem("savedColors") || JSON.stringify(defaultColors)),
  snackbars: [],
  datapackCachedConfiguration: new Map<string, CachedConfig>()
});
