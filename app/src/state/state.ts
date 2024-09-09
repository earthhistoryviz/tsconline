import { configure, observable } from "mobx";

import {
  SnackbarInfo,
  ChartSettings,
  ErrorAlert,
  FaciesOptions,
  MapHistory,
  Config,
  SettingsTabs,
  User,
  GroupedEventSearchInfo
} from "../types";
import { TimescaleItem } from "@tsconline/shared";
import type {
  MapHierarchy,
  MapInfo,
  ChartConfig,
  ColumnInfo,
  Presets,
  DatapackIndex,
  Patterns,
  AdminSharedUser,
  DatapackConfigForChartRequest,
  Workshop,
  ServerDatapackIndex,
  PrivateUserDatapackIndex,
  PublicUserDatapackIndex,
  WorkshopDatapackIndex
} from "@tsconline/shared";
import { ErrorCodes } from "../util/error-codes";
import { defaultColors } from "../util/constant";
import { settings } from "../constants";
import { getInitialDarkMode } from "./actions";
configure({ enforceActions: "observed" });

export type State = {
  chartTab: {
    chartTimelineEnabled: boolean;
    chartTimelineLocked: boolean;
    scale: number;
    zoomFitScale: number;
    resetMidX: number;
    zoomFitMidCoord: number;
    zoomFitMidCoordIsX: boolean;
    downloadFilename: string;
    downloadFiletype: "svg" | "pdf" | "png";
    isSavingChart: boolean;
    enableScrollZoom: boolean;
    unsafeChartContent: string;
  };
  loadSaveFilename: string;
  cookieConsent: boolean | null;
  isLoggedIn: boolean;
  user: User;
  chartLoading: boolean;
  tab: number;
  madeChart: boolean;
  showSuggestedAgePopup: boolean;
  isFullscreen: boolean;
  showPresetInfo: boolean;
  geologicalTopStageAges: TimescaleItem[];
  geologicalBaseStageAges: TimescaleItem[];
  columnMenu: {
    columnSelected: string | null;
    tabs: string[];
    tabValue: number;
  };
  settingsTabs: {
    selected: SettingsTabs;
    columns: ColumnInfo | undefined;
    columnHashMap: Map<string, ColumnInfo>;
    columnSearchTerm: string;
    datapackDisplayType: "rows" | "cards" | "compact";
    eventSearchTerm: string;
    groupedEvents: GroupedEventSearchInfo[];
  };
  admin: {
    displayedUsers: AdminSharedUser[];
    displayedUserDatapacks: { [uuid: string]: DatapackIndex };
    workshops: Map<string, Workshop>;
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
  datapackCollection: {
    serverDatapackIndex: ServerDatapackIndex;
    privateUserDatapackIndex: PrivateUserDatapackIndex;
    publicUserDatapackIndex: PublicUserDatapackIndex;
    workshopDatapackIndex: WorkshopDatapackIndex;
  };
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
  isProcessingDatapacks: boolean;
  unsavedDatapackConfig: DatapackConfigForChartRequest[];
};

export const state = observable<State>({
  chartTab: {
    chartTimelineEnabled: false,
    chartTimelineLocked: false,
    scale: 1,
    zoomFitScale: 1,
    resetMidX: 0,
    zoomFitMidCoord: 0,
    zoomFitMidCoordIsX: true,
    downloadFilename: "chart",
    downloadFiletype: "svg",
    isSavingChart: false,
    enableScrollZoom: false,
    unsafeChartContent: "" // this is used to store the chart content for download which is vulnerable to XSS
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
      darkMode: getInitialDarkMode(),
      language: "English"
    }
  },
  admin: {
    displayedUsers: [],
    displayedUserDatapacks: {},
    workshops: new Map<string, Workshop>()
  },
  chartLoading: false,
  madeChart: false,
  tab: 0,
  showSuggestedAgePopup: false,
  isFullscreen: false,
  showPresetInfo: false,
  geologicalTopStageAges: [],
  geologicalBaseStageAges: [],
  columnMenu: {
    columnSelected: null,
    tabs: ["General", "Font"],
    tabValue: 0
  },
  settingsTabs: {
    selected: "time",
    columns: undefined,
    columnHashMap: new Map<string, ColumnInfo>(),
    columnSearchTerm: "",
    datapackDisplayType: "compact",
    eventSearchTerm: "",
    groupedEvents: []
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
  datapackCollection: {
    serverDatapackIndex: {},
    privateUserDatapackIndex: {},
    publicUserDatapackIndex: {},
    workshopDatapackIndex: {}
  },
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
  isProcessingDatapacks: false,
  unsavedDatapackConfig: []
});
