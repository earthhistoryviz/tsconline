import { configure, observable, reaction, toJS } from "mobx";

import {
  SnackbarInfo,
  ChartSettings,
  ErrorAlert,
  FaciesOptions,
  MapHistory,
  Config,
  SettingsTabs,
  User,
  GroupedEventSearchInfo,
  EditableDatapackMetadata,
  CrossPlotTimeSettings,
  ChartTabState,
  CrossPlotBounds
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
  SharedWorkshop,
  Datapack,
  DatapackPriorityChangeRequest,
  DatapackMetadata,
  Marker,
  Model
} from "@tsconline/shared";
import { ErrorCodes } from "../util/error-codes";
import { defaultColors } from "../util/constant";
import { defaultChartTabState, defaultCrossPlotSettings, settings } from "../constants";
import { adjustScaleOfMarkers, adjustScaleOfModels, getInitialDarkMode } from "./actions";
import { cloneDeep } from "lodash";
configure({ enforceActions: "observed" });

export type State = {
  chartTab: {
    chartTimelineLocked: boolean;
    state: ChartTabState;
  };
  crossPlot: {
    lockX: boolean;
    lockY: boolean;
    markers: Marker[];
    markerMode: boolean;
    modelMode: boolean;
    models: Model[];
    showTooltips: boolean;
    chartXTimeSettings: CrossPlotTimeSettings;
    chartYTimeSettings: CrossPlotTimeSettings;
    chartX: ColumnInfo | undefined;
    chartY: ColumnInfo | undefined;
    state: ChartTabState;
    crossPlotBounds?: CrossPlotBounds;
    loading: boolean;
    columns?: ColumnInfo;
    datapacks: DatapackConfigForChartRequest[];
    columnHashMap: Map<string, ColumnInfo>;
    columnSelected: string | null;
    previousSettings: {
      chartXTimeSettings: CrossPlotTimeSettings;
      chartYTimeSettings: CrossPlotTimeSettings;
      chartX: ColumnInfo | undefined;
      chartY: ColumnInfo | undefined;
      columnHashMap: Map<string, ColumnInfo>;
      columns: ColumnInfo | undefined;
    };
  };
  loadSaveFilename: string;
  cookieConsent: boolean | null;
  isLoggedIn: boolean;
  user: User;
  tab: number;
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
  addCustomColumnMenu: {
    open: boolean;
    columnType: "Data Mining" | "Overlay";
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
    datapackPriorityLoading: boolean;
    datapackConfig: {
      tempRowData: DatapackMetadata[] | null;
      rowPriorityUpdates: DatapackPriorityChangeRequest[];
    };
  };
  workshops: SharedWorkshop[];
  datapackProfilePage: {
    editMode: boolean;
    editableDatapackMetadata: EditableDatapackMetadata | null;
    unsavedChanges: boolean;
    editRequestInProgress: boolean;
    datapackImageVersion: number;
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
  config: Config; // the active datapacks
  prevConfig: Config;
  presets: Presets;
  loadingDatapacks: boolean;
  datapackMetadata: DatapackMetadata[]; // all datapacks on the server, loaded on page load
  datapacks: Datapack[]; // all datapacks on the server, not loaded on page load
  skeletonStates: {
    presetsLoading: boolean;
    publicOfficialDatapacksLoading: boolean;
    privateOfficialDatapacksLoading: boolean;
    publicUserDatapacksLoading: boolean;
    privateUserDatapacksLoading: boolean;
    treatiseDatapackLoading: boolean;
  };
  mapPatterns: {
    patterns: Patterns;
    sortedPatterns: Patterns[string][];
  };
  selectedPreset: ChartConfig | null;
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
  guides: {
    isQSGOpen: boolean;
    isDatapacksTourOpen: boolean;
    isSettingsTourOpen: boolean;
    isWorkshopsTourOpen: boolean;
  };
  commentInput: string;
};

export const state = observable<State>({
  chartTab: {
    chartTimelineLocked: false,
    state: cloneDeep(defaultChartTabState)
  },
  crossPlot: {
    lockX: false,
    lockY: false,
    markers: [],
    markerMode: false,
    modelMode: true,
    models: [],
    showTooltips: true,
    chartXTimeSettings: cloneDeep(defaultCrossPlotSettings),
    chartYTimeSettings: cloneDeep(defaultCrossPlotSettings),
    chartX: undefined,
    chartY: undefined,
    state: cloneDeep(defaultChartTabState),
    crossPlotBounds: undefined,
    loading: false,
    datapacks: [],
    columnHashMap: new Map<string, ColumnInfo>(),
    columnSelected: null,
    previousSettings: {
      chartXTimeSettings: cloneDeep(defaultCrossPlotSettings),
      chartYTimeSettings: cloneDeep(defaultCrossPlotSettings),
      chartX: undefined,
      chartY: undefined,
      columnHashMap: new Map<string, ColumnInfo>(),
      columns: undefined
    }
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
    accountType: "",
    uuid: "",
    workshopIds: [],
    settings: {
      darkMode: getInitialDarkMode(),
      language: "English"
    },
    historyEntries: []
  },
  admin: {
    displayedUsers: [],
    displayedUserDatapacks: {},
    datapackPriorityLoading: false,
    datapackConfig: {
      tempRowData: null,
      rowPriorityUpdates: []
    }
  },
  workshops: [],
  datapackProfilePage: {
    editMode: false,
    editableDatapackMetadata: null,
    unsavedChanges: false,
    editRequestInProgress: false,
    datapackImageVersion: 0
  },
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
  addCustomColumnMenu: {
    open: false,
    columnType: "Data Mining"
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
  loadingDatapacks: false,
  datapackMetadata: [],
  datapacks: [],
  skeletonStates: {
    presetsLoading: true,
    publicOfficialDatapacksLoading: true,
    privateOfficialDatapacksLoading: true,
    publicUserDatapacksLoading: true,
    privateUserDatapacksLoading: true,
    treatiseDatapackLoading: true
  },
  mapPatterns: {
    patterns: {},
    sortedPatterns: []
  },
  selectedPreset: null,
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
  unsavedDatapackConfig: [],
  guides: {
    isQSGOpen: false,
    isDatapacksTourOpen: false,
    isSettingsTourOpen: false,
    isWorkshopsTourOpen: false
  },
  commentInput: ""
});

reaction(
  () => state.crossPlot.state.chartZoomSettings.scale,
  (scale: number) => {
    adjustScaleOfMarkers(scale);
    adjustScaleOfModels(scale);
  }
);
reaction(
  () => [toJS(state.config.datapacks), toJS(state.settings), toJS(state.settingsTabs.columns)],
  () => {
    if (state.chartTab.state.madeChart === false) return;
    state.chartTab.state.matchesSettings = false;
  }
);
