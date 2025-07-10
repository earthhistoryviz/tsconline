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
  CrossPlotBounds,
  RenderColumnInfo
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
  Model,
  CommentType
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
    percent: number;
    stage: string;
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
    chartX: RenderColumnInfo | undefined;
    chartY: RenderColumnInfo | undefined;
    state: ChartTabState;
    crossPlotBounds?: CrossPlotBounds;
    loading: boolean;
    columns?: ColumnInfo;
    renderColumns?: RenderColumnInfo;
    datapacks: DatapackConfigForChartRequest[];
    columnHashMap: Map<string, RenderColumnInfo>;
    columnSelected: string | null;
    previousSettings: {
      chartXTimeSettings: CrossPlotTimeSettings;
      chartYTimeSettings: CrossPlotTimeSettings;
      chartX: RenderColumnInfo | undefined;
      chartY: RenderColumnInfo | undefined;
      columnHashMap: Map<string, RenderColumnInfo>;
      columns: ColumnInfo | undefined;
      renderColumns: RenderColumnInfo | undefined;
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
    renderColumns: RenderColumnInfo | undefined;
    columnHashMap: Map<string, RenderColumnInfo>;
    columnSearchTerm: string;
    showColumnSearchLoader: boolean;
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
    comments: CommentType[];
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
    state: cloneDeep(defaultChartTabState),
    percent: 0,
    stage: "Initializing"
  },
  crossPlot: observable(
    {
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
      columns: undefined,
      renderColumns: undefined,
      datapacks: [],
      columnHashMap: new Map<string, RenderColumnInfo>(),
      columnSelected: null,
      previousSettings: {
        chartXTimeSettings: cloneDeep(defaultCrossPlotSettings),
        chartYTimeSettings: cloneDeep(defaultCrossPlotSettings),
        chartX: undefined,
        chartY: undefined,
        columnHashMap: new Map<string, RenderColumnInfo>(),
        columns: undefined,
        renderColumns: undefined
      }
    },
    {
      columns: false,
      previousSettings: false
    }
  ),
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
    datapackImageVersion: 0,
    comments: []
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
  settingsTabs: observable(
    {
      selected: "time" as SettingsTabs,
      columns: undefined,
      renderColumns: undefined,
      columnHashMap: new Map<string, RenderColumnInfo>(),
      columnSearchTerm: "",
      showColumnSearchLoader: false,
      datapackDisplayType: "compact" as const,
      eventSearchTerm: "",
      groupedEvents: []
    },
    {
      columns: false
    }
  ),
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
    privateUserDatapacksLoading: true
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
