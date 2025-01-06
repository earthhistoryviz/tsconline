import { action, observable, runInAction, toJS } from "mobx";
import {
  SharedUser,
  ChartInfoTSC,
  ChartSettingsInfoTSC,
  TimescaleItem,
  assertSharedUser,
  assertChartInfoTSC,
  assertDatapackInfoChunk,
  DatapackMetadata,
  defaultColumnRoot,
  FontsInfo,
  Datapack,
  DatapackConfigForChartRequest,
  isUserDatapack,
  isOfficialDatapack,
  assertOfficialDatapack,
  assertDatapack,
  assertDatapackArray,
  DatapackUniqueIdentifier,
  isWorkshopDatapack
} from "@tsconline/shared";

import {
  type MapInfo,
  type ColumnInfo,
  type MapHierarchy,
  assertSuccessfulServerResponse,
  Presets,
  assertSVGStatus,
  assertPresets,
  assertPatterns
} from "@tsconline/shared";
import { state, State } from "../state";
import { executeRecaptcha, fetcher } from "../../util";
import {
  applyChartColumnSettings,
  applyRowOrder,
  handleDataMiningColumns,
  handleDualColCompColumns,
  initializeColumnHashMap,
  searchColumns,
  searchEvents
} from "./column-actions";
import { xmlToJson } from "../parse-settings";
import { displayServerError } from "./util-actions";
import { compareStrings } from "../../util/util";
import { ErrorCodes, ErrorMessages } from "../../util/error-codes";
import {
  EditableDatapackMetadata,
  SetDatapackConfigCompleteMessage,
  SetDatapackConfigMessage,
  SettingsTabs,
  equalChartSettings,
  equalConfig
} from "../../types";
import { settings, defaultTimeSettings } from "../../constants";
import { actions } from "..";
import { cloneDeep } from "lodash";
import {
  compareExistingDatapacks,
  doesDatapackAlreadyExist,
  getDatapackFromArray,
  isOwnedByUser
} from "../non-action-util";
import { fetchUserDatapack } from "./user-actions";
import { Workshop } from "../../Workshops";

const increment = 1;

export const fetchOfficialDatapack = action("fetchOfficialDatapack", async (datapack: string) => {
  try {
    const response = await fetcher(`/server/datapack/${encodeURIComponent(datapack)}`, {
      method: "GET"
    });
    const data = await response.json();
    if (response.ok) {
      assertOfficialDatapack(data);
      assertDatapack(data);
      return data;
    } else {
      displayServerError(
        data,
        ErrorCodes.INVALID_SERVER_DATAPACK_REQUEST,
        ErrorMessages[ErrorCodes.INVALID_SERVER_DATAPACK_REQUEST]
      );
    }
  } catch (e) {
    displayServerError(null, ErrorCodes.SERVER_RESPONSE_ERROR, ErrorMessages[ErrorCodes.SERVER_RESPONSE_ERROR]);
    console.error(e);
  }
  return null;
});

export const fetchFaciesPatterns = action("fetchFaciesPatterns", async () => {
  try {
    const response = await fetcher("/facies-patterns");
    const patternJson = await response.json();
    if (response.ok) {
      const { patterns } = patternJson;
      assertPatterns(patterns);
      state.mapPatterns = {
        patterns,
        sortedPatterns: Object.values(patterns).sort((a, b) => compareStrings(a.name, b.name))
      };
      console.log("Successfully fetched Map Patterns");
    } else {
      displayServerError(response, ErrorCodes.INVALID_PATTERN_INFO, ErrorMessages[ErrorCodes.INVALID_PATTERN_INFO]); // THIS IS THE CODE
    }
  } catch (e) {
    displayServerError(null, ErrorCodes.SERVER_RESPONSE_ERROR, ErrorMessages[ErrorCodes.SERVER_RESPONSE_ERROR]);
    console.error(e);
  }
});
export const removeDatapack = action("removeDatapack", (datapack: DatapackUniqueIdentifier) => {
  const index = state.datapacks.findIndex((d) => compareExistingDatapacks(d, datapack));
  if (index > -1) {
    state.datapacks.splice(index, 1); // Remove the matching datapack in place
  }
});
export const refreshPublicDatapacks = action("refreshPublicDatapacks", async () => {
  state.datapacks = observable(state.datapacks.filter((d) => !d.isPublic));
  fetchAllPublicDatapacks();
});
export const addDatapack = action("addDatapack", (datapack: Datapack) => {
  // we don't log since fetching datapacks could produce duplicates
  if (!doesDatapackAlreadyExist(datapack, state.datapacks)) {
    state.datapacks.push(observable(datapack));
  }
});
/**
 * Resets any user defined settings
 */
export const resetSettings = action("resetSettings", () => {
  state.settings = JSON.parse(JSON.stringify(settings));
});

export const fetchAllPublicDatapacks = action("fetchAllPublicDatapacks", async () => {
  let start = 0;
  let total = -1;
  try {
    while (total == -1 || start < total) {
      const response = await fetcher(`/public/datapacks?start=${start}&increment=${increment}`, {
        method: "GET"
      });
      const index = await response.json();
      try {
        assertDatapackInfoChunk(index);
        for (const dp of index.datapacks) {
          addDatapack(dp);
        }
        if (index.datapacks[0]?.type === "official") {
          setOfficialDatapacksLoading(false);
        }
        if (total == -1) total = index.totalChunks;
        start += increment;
      } catch (e) {
        displayServerError(index, ErrorCodes.INVALID_DATAPACK_INFO, ErrorMessages[ErrorCodes.INVALID_DATAPACK_INFO]);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    console.log("Datapacks loaded");
  } catch (e) {
    displayServerError(null, ErrorCodes.SERVER_RESPONSE_ERROR, ErrorMessages[ErrorCodes.SERVER_RESPONSE_ERROR]);
    console.error(e);
  } finally {
    setOfficialDatapacksLoading(false);
    setPublicDatapacksLoading(false);
  }
});
export const fetchPresets = action("fetchPresets", async () => {
  try {
    const response = await fetcher("/presets");
    const presets = await response.json();
    try {
      assertPresets(presets);
      loadPresets(presets);
      console.log("Presets loaded");
    } catch (e) {
      displayServerError(presets, ErrorCodes.INVALID_PRESET_INFO, ErrorMessages[ErrorCodes.INVALID_PRESET_INFO]);
    }
  } catch (e) {
    displayServerError(null, ErrorCodes.SERVER_RESPONSE_ERROR, ErrorMessages[ErrorCodes.SERVER_RESPONSE_ERROR]);
    console.error(e);
  } finally {
    setPresetsLoading(false);
  }
});

export const fetchPublicDatapacks = action("fetchPublicDatapacks", async () => {
  try {
    const response = await fetcher("/public/datapacks", {
      method: "GET"
    });
    const data = await response.json();
    try {
      assertDatapackArray(data);
      for (const dp of data) {
        addDatapack(dp);
      }
      console.log("Public Datapacks loaded");
    } catch (e) {
      console.error(e);
      displayServerError(data, ErrorCodes.INVALID_PUBLIC_DATAPACKS, ErrorMessages[ErrorCodes.INVALID_PUBLIC_DATAPACKS]);
    }
  } catch (e) {
    displayServerError(null, ErrorCodes.SERVER_RESPONSE_ERROR, ErrorMessages[ErrorCodes.SERVER_RESPONSE_ERROR]);
    console.error(e);
  }
});

/**
 * This will grab the user datapacks AND the server datapacks from the server
 */
export const fetchUserDatapacks = action("fetchUserDatapacks", async () => {
  try {
    const response = await fetcher(`/user/datapacks`, {
      method: "GET",
      credentials: "include"
    });
    const data = await response.json();
    try {
      assertDatapackArray(data);
      // this does not check for duplicate keys
      for (const dp in data) {
        addDatapack(data[dp]);
      }
      console.log("User Datapacks loaded");
    } catch (e) {
      displayServerError(data, ErrorCodes.INVALID_USER_DATAPACKS, ErrorMessages[ErrorCodes.INVALID_USER_DATAPACKS]);
      console.error(e);
    }
  } catch (e) {
    displayServerError(null, ErrorCodes.SERVER_RESPONSE_ERROR, ErrorMessages[ErrorCodes.SERVER_RESPONSE_ERROR]);
    console.error(e);
  } finally {
    setPrivateUserDatapacksLoading(false);
  }
});

export const uploadUserDatapack = action(
  "uploadUserDatapack",
  async (file: File, metadata: DatapackMetadata, datapackProfilePicture?: File) => {
    if (getDatapackFromArray(metadata, state.datapacks)) {
      pushError(ErrorCodes.DATAPACK_ALREADY_EXISTS);
      return;
    }
    const recaptcha = await getRecaptchaToken("uploadUserDatapack");
    if (!recaptcha) return;
    const formData = new FormData();
    const { title, description, authoredBy, contact, notes, date, references, tags } = metadata;
    formData.append("datapack", file);
    formData.append("title", title);
    formData.append("description", description);
    formData.append("references", JSON.stringify(references));
    formData.append("tags", JSON.stringify(tags));
    formData.append("authoredBy", authoredBy);
    if (datapackProfilePicture) formData.append("datapack-image", datapackProfilePicture);
    formData.append("isPublic", String(metadata.isPublic));
    formData.append("type", metadata.type);
    if (isUserDatapack(metadata)) formData.append("uuid", metadata.uuid);
    formData.append("isPublic", String(metadata.isPublic));
    if (notes) formData.append("notes", notes);
    if (date) formData.append("date", date);
    if (contact) formData.append("contact", contact);
    formData.append("priority", String(metadata.priority));
    try {
      const response = await fetcher(`/user/datapack`, {
        method: "POST",
        body: formData,
        credentials: "include",
        headers: {
          "recaptcha-token": recaptcha
        }
      });
      const data = await response.json();

      if (response.ok) {
        const datapack = await fetchUserDatapack(metadata.title);
        if (!datapack) {
          pushError(ErrorCodes.USER_FETCH_DATAPACK_FAILED);
          return;
        }
        addDatapack(datapack);
        if (metadata.isPublic) {
          refreshPublicDatapacks();
        }
        pushSnackbar("Successfully uploaded " + title + " datapack", "success");
      } else {
        if (response.status === 403) {
          pushError(ErrorCodes.REGULAR_USER_UPLOAD_DATAPACK_TOO_LARGE);
        } else {
          displayServerError(
            data,
            ErrorCodes.INVALID_DATAPACK_UPLOAD,
            ErrorMessages[ErrorCodes.INVALID_DATAPACK_UPLOAD]
          );
        }
      }
    } catch (e) {
      displayServerError(null, ErrorCodes.SERVER_RESPONSE_ERROR, ErrorMessages[ErrorCodes.SERVER_RESPONSE_ERROR]);
      console.error(e);
    }
  }
);

export const setLargeDataIndex = action(
  "setLargeDataIndex",
  async <T>(target: Record<string, T>, index: Record<string, T>) => {
    // This is to prevent the UI from lagging
    // we delete so we don't reassign
    Object.keys(index).forEach((key) => delete target[key]);
    for (const key in index) {
      runInAction(() => {
        target[key] = index[key];
      });
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
);
export const fetchTimescaleDataAction = action("fetchTimescaleData", async () => {
  try {
    const response = await fetcher("/timescale", { method: "GET" });
    const data = await response.json();
    if (response.ok) {
      const stages = data.timescaleData || [];
      const geologicalBaseStageAges = [...stages];
      const geologicalTopStageAges = [];

      for (let i = 0; i < stages.length; i++) {
        const item = stages[i];
        const value = i > 0 ? stages[i - 1].value : 0;
        geologicalTopStageAges.push({ ...item, value });
      }
      setGeologicalBaseStageAges(geologicalBaseStageAges);
      setGeologicalTopStageAges(geologicalTopStageAges);

      console.log("Time Scale Data Loaded");
    } else {
      displayServerError(data, ErrorCodes.INVALID_TIME_SCALE, ErrorMessages[ErrorCodes.INVALID_TIME_SCALE]);
    }
  } catch (error) {
    displayServerError(null, ErrorCodes.SERVER_RESPONSE_ERROR, ErrorMessages[ErrorCodes.SERVER_RESPONSE_ERROR]);
    console.error(error);
  }
});

export const applySettings = action("applySettings", async (settings: ChartInfoTSC) => {
  applyChartSettings(settings.settings);
  applyChartColumnSettings(settings["class datastore.RootColumn:Chart Root"]);
  handleDataMiningColumns();
  handleDualColCompColumns();
  await applyRowOrder(state.settingsTabs.columns, settings["class datastore.RootColumn:Chart Root"]);
});

const applyChartSettings = action("applyChartSettings", (settings: ChartSettingsInfoTSC) => {
  const {
    topAge,
    baseAge,
    unitsPerMY,
    skipEmptyColumns,
    doPopups,
    noIndentPattern,
    enChartLegend,
    enEventColBG,
    enHideBlockLable,
    enPriority
  } = settings;
  for (const unit of topAge) {
    if (!state.settings.timeSettings[unit.unit]) {
      state.settings.timeSettings[unit.unit] = JSON.parse(JSON.stringify(defaultTimeSettings));
    }
    if (unit.source === "stage" && unit.stage) {
      const result = state.geologicalTopStageAges.find((value) =>
        value.key.includes(unit.stage!.substring(0, unit.stage!.indexOf("(") - 1))
      );
      if (result) {
        setTopStageAge(result.value, unit.unit);
      }
    } else if (unit.source === "text" && unit.text !== undefined) {
      setTopStageAge(unit.text, unit.unit);
    } else {
      pushSnackbar(`${unit.unit} ${unit.source} not provided, using default`, "warning");
      state.settings.timeSettings[unit.unit] = JSON.parse(JSON.stringify(defaultTimeSettings));
    }
  }
  for (const unit of baseAge) {
    if (!state.settings.timeSettings[unit.unit]) {
      state.settings.timeSettings[unit.unit] = JSON.parse(JSON.stringify(defaultTimeSettings));
    }
    if (unit.source === "stage" && unit.stage) {
      const result = state.geologicalBaseStageAges.find((value) =>
        value.key.includes(unit.stage!.substring(0, unit.stage!.indexOf("(") - 1))
      );
      if (result) {
        setBaseStageAge(result.value, unit.unit);
      }
    } else if (unit.source === "text" && unit.text !== undefined) {
      setBaseStageAge(unit.text, unit.unit);
    } else {
      pushSnackbar(`${unit.unit} ${unit.source} not provided, using default`, "warning");
      state.settings.timeSettings[unit.unit] = JSON.parse(JSON.stringify(defaultTimeSettings));
    }
  }
  for (const unit of unitsPerMY) {
    if (!state.settings.timeSettings[unit.unit]) {
      state.settings.timeSettings[unit.unit] = JSON.parse(JSON.stringify(defaultTimeSettings));
    }
    setUnitsPerMY(unit.text / 30, unit.unit);
  }
  for (const unit of skipEmptyColumns) {
    if (!state.settings.timeSettings[unit.unit]) {
      state.settings.timeSettings[unit.unit] = JSON.parse(JSON.stringify(defaultTimeSettings));
    }
    setSkipEmptyColumns(unit.text, unit.unit);
  }
  setMouseOverPopupsEnabled(doPopups);
  setEnableChartLegend(enChartLegend);
  setEnablePriority(enPriority);
  setEnableColumnBackground(enEventColBG);
  setNoIndentPattern(noIndentPattern);
  setEnableHideBlockLabel(enHideBlockLable);
});

export const setIsProcessingDatapacks = action("setIsProcessingDatapacks", (isProcessingDatapacks: boolean) => {
  state.isProcessingDatapacks = isProcessingDatapacks;
});

export const setUnsavedDatapackConfig = action(
  "setUnsavedDatapackConfig",
  (newDatapacks: DatapackConfigForChartRequest[]) => {
    state.unsavedDatapackConfig = newDatapacks;
  }
);

const setEmptyDatapackConfig = action("setEmptyDatapackConfig", () => {
  resetSettings();
  const columnRoot: ColumnInfo = cloneDeep(defaultColumnRoot);
  // all chart root font options have inheritable on
  for (const opt in columnRoot.fontsInfo) {
    columnRoot.fontsInfo[opt as keyof FontsInfo].inheritable = true;
  }
  // throws warning if this isn't in its own action.
  runInAction(() => {
    state.settingsTabs.columns = columnRoot;
    state.settings.datapackContainsSuggAge = false;
    state.mapState.mapHierarchy = {};
    state.mapState.mapInfo = {};
    state.settingsTabs.columnHashMap = new Map();
    state.config.datapacks = [];
    state.settingsTabs.columnHashMap.set(columnRoot.name, columnRoot);
  });

  // we add Ma unit by default
  state.settings.timeSettings["Ma"] = JSON.parse(JSON.stringify(defaultTimeSettings));

  searchColumns(state.settingsTabs.columnSearchTerm);
  searchEvents(state.settingsTabs.eventSearchTerm);
  setUnsavedDatapackConfig([]);
});

export const processDatapackConfig = action(
  "processDatapackConfig",
  async (datapacks: DatapackConfigForChartRequest[], settingsPath?: string, force?: boolean) => {
    if (datapacks.length === 0) {
      setEmptyDatapackConfig();
      return;
    }
    if (!force && (state.isProcessingDatapacks || JSON.stringify(datapacks) == JSON.stringify(state.config.datapacks)))
      return;
    setIsProcessingDatapacks(true);
    const fetchSettings = async () => {
      if (settingsPath && settingsPath.length !== 0) {
        try {
          const settings = await fetchSettingsXML(settingsPath);
          if (settings) {
            removeError(ErrorCodes.INVALID_SETTINGS_RESPONSE);
            return JSON.parse(JSON.stringify(settings));
          }
        } catch (e) {
          console.error(e);
          pushError(ErrorCodes.INVALID_SETTINGS_RESPONSE);
        }
      }
      return null;
    };
    const chartSettings = await fetchSettings();
    try {
      await new Promise((resolve, reject) => {
        const setDatapackConfigWorker: Worker = new Worker(
          new URL("../../util/workers/set-datapack-config.ts", import.meta.url),
          {
            type: "module"
          }
        );

        const message: SetDatapackConfigMessage = {
          datapacks,
          stateCopy: toJS(state)
        };
        setDatapackConfigWorker.postMessage(message);

        setDatapackConfigWorker.onmessage = async function (e: MessageEvent<SetDatapackConfigCompleteMessage>) {
          const { status, value } = e.data;

          if (status === "success" && value) {
            try {
              await actions.setDatapackConfig(
                value.columnRoot,
                value.foundDefaultAge,
                value.mapHierarchy,
                value.mapInfo,
                value.datapacks,
                chartSettings
              );

              pushSnackbar("Datapack Config Updated", "success");
              setUnsavedDatapackConfig(datapacks);
              resolve("Datapack Config Updated successfully.");
            } catch (e) {
              reject(new Error("Failed to set datapack config with error " + e));
            }
          } else {
            reject(new Error("Setting Datapack Config Timed Out"));
          }
          setIsProcessingDatapacks(false);
          setDatapackConfigWorker.terminate();
        };

        setDatapackConfigWorker.onerror = function (error) {
          setDatapackConfigWorker.terminate();
          setIsProcessingDatapacks(false);
          reject(new Error("Webworker failed with error." + error.message));
        };
      });
    } catch (e) {
      console.error(e);
      setIsProcessingDatapacks(false);
      pushError(ErrorCodes.UNABLE_TO_PROCESS_DATAPACK_CONFIG);
      return false;
    }
    return true;
  }
);

export const setDatapackConfig = action(
  "setDatapackConfig",
  async (
    columnRoot: ColumnInfo,
    foundDefaultAge: boolean,
    mapHierarchy: MapHierarchy,
    mapInfo: MapInfo,
    datapacks: DatapackConfigForChartRequest[],
    chartSettings: ChartInfoTSC | null
  ): Promise<boolean> => {
    resetSettings();
    // throws warning if this isn't in its own action. may have other fix but left as is
    await runInAction(async () => {
      state.settingsTabs.columns = columnRoot;
      state.settings.datapackContainsSuggAge = foundDefaultAge;
      state.mapState.mapHierarchy = mapHierarchy;
      state.mapState.mapInfo = mapInfo;
      state.settingsTabs.columnHashMap = new Map();
      state.config.datapacks = datapacks;
      await initializeColumnHashMap(state.settingsTabs.columns);
    });
    // when datapacks is empty, setEmptyDatapackConfig() is called instead and Ma is added by default. So when datapacks is no longer empty we will delete that default Ma here
    if (datapacks.length !== 0) {
      delete state.settings.timeSettings["Ma"];
    }

    if (chartSettings !== null) {
      assertChartInfoTSC(chartSettings);
      await applySettings(chartSettings);
    } else {
      // set any new units in the time
      for (const chart of columnRoot.children) {
        if (!state.settings.timeSettings[chart.units]) {
          state.settings.timeSettings[chart.units] = JSON.parse(JSON.stringify(defaultTimeSettings));
        }
      }
    }
    searchColumns(state.settingsTabs.columnSearchTerm);
    searchEvents(state.settingsTabs.eventSearchTerm);
    return true;
  }
);

const fetchSettingsXML = async (settingsPath: string): Promise<ChartInfoTSC | null> => {
  const res = await fetcher(`/settingsXml/${encodeURIComponent(settingsPath)}`, {
    method: "GET"
  });
  let settingsXml;
  try {
    settingsXml = await res.text();
  } catch (e) {
    //couldn't get settings from server
    displayServerError(null, ErrorCodes.INVALID_SETTINGS_RESPONSE, ErrorMessages[ErrorCodes.INVALID_SETTINGS_RESPONSE]);
    return null;
  }
  try {
    const settingsJson = xmlToJson(settingsXml);
    return settingsJson;
  } catch (e) {
    //couldn't parse settings
    displayServerError(e, ErrorCodes.INVALID_SETTINGS_RESPONSE, "Error parsing xml settings file");
  }
  return null;
};

/**
 * Removes cache in public dir on server
 */
export const removeCache = action("removeCache", async () => {
  const response = await fetcher(`/removecache`, {
    method: "POST"
  });
  // check if we successfully removed cache
  const msg = await response.json();
  try {
    assertSuccessfulServerResponse(msg);
    console.log(`Server successfully deleted cache with message: ${msg.message}`);
    pushSnackbar("Successfully removed cache of recently generated charts", "success");
  } catch (e) {
    displayServerError(e, msg, "Server could not remove cache");
    return;
  }
});

/**
 * Resets state
 * Only implementation is used when we remove cache
 * If error from server, this is really bad. Will loop forever
 */
export const resetState = action("resetState", () => {
  setChartMade(true);
  setChartLoading(true);
  processDatapackConfig([]);
  setChartHash("");
  setChartContent("");
  setUseCache(true);
  setUsePreset(true);
  setTab(0);
  setSettingsTabsSelected("time");
  setSettingsColumns(undefined);
  setMapInfo({});
  state.columnMenu.columnSelected = null;
  state.columnMenu.tabValue = 0;
  state.columnMenu.tabs = ["General", "Font"];
  state.settingsXML = "";
});

export const loadPresets = action("loadPresets", (presets: Presets) => {
  state.presets = presets;
});

// Define settingOptions globally
export const settingOptions = [
  { name: "enablePopups", label: "Enable popups", stateName: "doPopups" },
  {
    name: "enablePriorityFiltering",
    label: "Enable priority filtering",
    stateName: "enPriority"
  },
  {
    name: "enableChartLegend",
    label: "Enable chart legend",
    stateName: "enChartLegend"
  },
  {
    name: "hideBlockLabelsIfCrowded",
    label: "If crowded, hide block labels",
    stateName: "enHideBlockLable"
  },
  {
    name: "skipEmptyColumns",
    label: "Skip empty columns",
    stateName: "skipEmptyColumns"
  }
];

/**
 * set the settings tab based on a string or number
 */
export const setSettingsTabsSelected = action((newtab: number | SettingsTabs) => {
  if (typeof newtab === "string") {
    state.settingsTabs.selected = newtab;
    return;
  }
  switch (newtab) {
    case 0:
      state.settingsTabs.selected = "time";
      break;
    case 1:
      state.settingsTabs.selected = "preferences";
      break;
    case 2:
      state.settingsTabs.selected = "column";
      break;
    case 3:
      state.settingsTabs.selected = "search";
      break;
    case 4:
      state.settingsTabs.selected = "font";
      break;
    case 5:
      state.settingsTabs.selected = "mappoints";
      break;
    case 6:
      state.settingsTabs.selected = "datapacks";
      break;
    default:
      console.log("WARNING: setSettingTabsSelected: received index number that is unknown: ", newtab);
      state.settingsTabs.selected = "time";
  }
});

/**
 * The tab name we want to switch to in settings based on a string translated to an index
 * @param tab the tab to be selected
 * @returns
 */
export function translateTabToIndex(tab: State["settingsTabs"]["selected"]) {
  switch (tab) {
    case "time":
      return 0;
    case "preferences":
      return 1;
    case "column":
      return 2;
    case "search":
      return 3;
    case "font":
      return 4;
    case "mappoints":
      return 5;
    case "datapacks":
      return 6;
    default:
      console.log("WARNING: translateTabToIndex: received unknown tab name: ", tab);
      return 0;
  }
}

/**
 * Constantly ping the server for the pdf status
 * TODO DEPRECATE FOR SVGS
 */
export const checkSVGStatus = action(async () => {
  let SVGReady = false;
  try {
    while (!SVGReady) {
      SVGReady = await fetchSVGStatus();
      if (!SVGReady) {
        // Wait for some time before checking again
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  } catch (e) {
    console.log(`Error fetching svg status: ${e}`);
    return;
  }
  setChartLoading(false);
});

/**
 * The request for pdf status
 * @returns
 */
async function fetchSVGStatus(): Promise<boolean> {
  if (state.chartHash === "") {
    return false;
  }
  const response = await fetcher(`/svgstatus/${state.chartHash}`, {
    method: "GET"
  });
  const data = await response.json();
  try {
    assertSVGStatus(data);
  } catch (e) {
    displayServerError(
      data,
      ErrorCodes.INVALID_SVG_READY_RESPONSE,
      ErrorMessages[ErrorCodes.INVALID_SVG_READY_RESPONSE]
    );
    const msg = `Error fetching SVG status with error ${e}`;
    throw new Error(msg);
  }
  return data.ready;
}

export const removeAllErrors = action("removeAllErrors", () => {
  state.errors.errorAlerts.clear();
});
export const removeError = action("removeError", (context: ErrorCodes) => {
  state.errors.errorAlerts.delete(context);
});
export const pushError = action("pushError", (context: ErrorCodes) => {
  if (state.errors.errorAlerts.has(context)) {
    state.errors.errorAlerts.get(context)!.errorCount += 1;
    return;
  }

  const error = {
    errorText: ErrorMessages[context],
    errorCount: 1
  };
  state.errors.errorAlerts.set(context, error);
});
export const removeSnackbar = action("removeSnackbar", (text: string) => {
  state.snackbars = state.snackbars.filter((info) => info.snackbarText !== text);
});
export const pushSnackbar = action("pushSnackbar", (text: string, severity: "success" | "info" | "warning") => {
  if (severity === "warning") console.warn(text);
  for (const snackbar of state.snackbars) {
    if (snackbar.snackbarText === text) {
      snackbar.snackbarCount += 1;
      return;
    }
  }
  state.snackbars.push({
    snackbarText: text,
    snackbarCount: 1,
    severity: severity
  });
});

export const fetchImage = action("fetchImage", async (datapack: DatapackConfigForChartRequest, imageName: string) => {
  const { title, storedFileName } = datapack;
  const response = await fetcher(`/images`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      datapackTitle: title,
      datapackFilename: storedFileName,
      imageName,
      uuid: isUserDatapack(datapack) ? datapack.uuid : isOfficialDatapack(datapack) ? "official" : "",
      isPublic: datapack.isPublic
    })
  });
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Image not found");
    } else if (response.status === 500) {
      throw new Error("Server error");
    } else {
      throw new Error("Unknown error");
    }
  }
  const image = await response.blob();
  return image;
});

export async function getRecaptchaToken(token: string) {
  try {
    const recaptchaToken = await executeRecaptcha(token);
    if (!recaptchaToken) {
      pushError(ErrorCodes.RECAPTCHA_FAILED);
      return null;
    }
    return recaptchaToken;
  } catch (error) {
    pushError(ErrorCodes.RECAPTCHA_FAILED);
    return null;
  }
}

export const requestDownload = action(async (datapack: Datapack, needEncryption: boolean) => {
  let route;
  if (!needEncryption) {
    route = `/user/datapack/download/${datapack.title}`;
  } else {
    route = `/user/datapack/download/${datapack.title}?needEncryption=${needEncryption}`;
  }
  const recaptchaToken = await getRecaptchaToken("downloadUserDatapacks");
  if (!recaptchaToken) return null;
  const response = await fetcher(route, {
    method: "GET",
    credentials: "include",
    headers: {
      "recaptcha-token": recaptchaToken
    }
  });
  if (!response.ok) {
    let errorCode = ErrorCodes.SERVER_RESPONSE_ERROR;
    switch (response.status) {
      case 404: {
        errorCode = ErrorCodes.USER_DATAPACK_FILE_NOT_FOUND_FOR_DOWNLOAD;
        break;
      }
      case 422: {
        errorCode = ErrorCodes.INCORRECT_ENCRYPTION_HEADER;
        break;
      }
      case 401: {
        errorCode = ErrorCodes.NOT_LOGGED_IN;
        break;
      }
    }
    displayServerError(response, errorCode, ErrorMessages[errorCode]);
    return;
  }
  const file = await response.blob();
  let fileURL = "";
  if (file) {
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      await new Promise((resolve, reject) => {
        reader.onloadend = resolve;
        reader.onerror = reject;
      });
      if (typeof reader.result !== "string") {
        throw new Error("Invalid file");
      }
      fileURL = reader.result;
      if (fileURL) {
        const aTag = document.createElement("a");
        aTag.href = fileURL;

        aTag.setAttribute("download", datapack.originalFileName);

        document.body.appendChild(aTag);
        aTag.click();
        aTag.remove();
      } else {
        pushError(ErrorCodes.UNABLE_TO_READ_FILE_OR_EMPTY_FILE);
      }
    } catch (error) {
      pushError(ErrorCodes.INVALID_PATH);
    }
  }
});

export const logout = action("logout", async () => {
  try {
    const response = await fetcher("/auth/logout", {
      method: "POST",
      credentials: "include"
    });
    if (response.ok) {
      setIsLoggedIn(false);
      setDefaultUserState();
      pushSnackbar("Successfully signed out", "success");
    } else {
      pushError(ErrorCodes.UNABLE_TO_LOGOUT);
    }
  } catch (error) {
    console.error("Failed to logout:", error);
    displayServerError(error, ErrorCodes.UNABLE_TO_LOGOUT, ErrorMessages[ErrorCodes.UNABLE_TO_LOGOUT]);
  }
});

export const sessionCheck = action("sessionCheck", async () => {
  const cookieConsentValue = localStorage.getItem("cookieConsent");
  state.cookieConsent = cookieConsentValue !== null ? cookieConsentValue === "true" : null;
  try {
    const response = await fetcher("/auth/session-check", {
      method: "POST",
      credentials: "include"
    });
    const data = await response.json();
    if (data.authenticated) {
      setIsLoggedIn(true);
      assertSharedUser(data.user);
      setUser(data.user);
      fetchUserDatapacks();
    } else {
      setIsLoggedIn(false);
    }
  } catch (error) {
    console.error("Failed to check session:", error);
  }
});

export const setDefaultUserState = action(() => {
  state.user = {
    username: "",
    email: "",
    pictureUrl: "",
    isAdmin: false,
    isGoogleUser: false,
    uuid: "",
    settings: {
      darkMode: false,
      language: "English"
    }
  };
  removeUnauthorizedDatapacks();
});
export const removeUnauthorizedDatapacks = action(() => {
  state.datapacks = observable(
    state.datapacks.filter((d) => isOwnedByUser(d, state.user.uuid) || (d.isPublic && !isWorkshopDatapack(d)))
  );
});

// This is a helper function to get the initial dark mode setting (checks for user preference and stored preference)
export const getInitialDarkMode = () => {
  const prefersDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const storedDarkMode = localStorage.getItem("darkMode");
  if (storedDarkMode !== null) {
    return storedDarkMode === "true";
  }
  return prefersDarkMode;
};

// This is a helper function to listen for system dark mode changes (if the user has not set a preference)
export const listenForSystemDarkMode = () => {
  const darkModeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const handleChange = () => {
    if (localStorage.getItem("darkMode") === null) {
      // this is external dark mode changing (not in our ui)
      runInAction(() => {
        state.user.settings.darkMode = darkModeMediaQuery.matches;
      });
    }
  };
  darkModeMediaQuery.addEventListener("change", handleChange);
  return () => {
    darkModeMediaQuery.removeEventListener("change", handleChange);
  };
};

export const setChartTimelineEnabled = action("setChartTimelineEnabled", (enabled: boolean) => {
  state.chartTab.chartTimelineEnabled = enabled;
});

export const setChartTimelineLocked = action("setChartTimelineLocked", (locked: boolean) => {
  state.chartTab.chartTimelineLocked = locked;
});

export const setUser = action("setUser", (user: SharedUser) => {
  assertSharedUser(user);
  state.user = { ...state.user, ...user };
});
export const setPictureUrl = action("setPictureUrl", (url: string) => {
  state.user.pictureUrl = url;
});
export const setDarkMode = action("setDarkMode", (newval: boolean) => {
  if (state.cookieConsent) {
    localStorage.setItem("darkMode", newval.toString());
  }
  state.user.settings.darkMode = newval;
});
export const setLanguage = action("setLanguage", (newval: string) => {
  state.user.settings.language = newval;
});
export const setIsLoggedIn = action("setIsLoggedIn", (newval: boolean) => {
  state.isLoggedIn = newval;
});
export const setuseDatapackSuggestedAge = action((isChecked: boolean) => {
  state.settings.useDatapackSuggestedAge = isChecked;
});
export const setTab = action("setTab", (newval: number) => {
  if (
    newval == 2 &&
    state.chartContent &&
    (!equalChartSettings(state.settings, state.prevSettings) || !equalConfig(state.config, state.prevConfig))
  ) {
    pushSnackbar("Chart settings are different from the displayed chart.", "warning");
  }
  state.tab = newval;
});
export const setSettingsColumns = action((temp?: ColumnInfo) => {
  state.settingsTabs.columns = temp;
});
export const setUseCache = action((temp: boolean) => {
  state.useCache = temp;
});
export const setUsePreset = action((temp: boolean) => {
  state.useCache = temp;
});
export const setChartContent = action("setChartContent", (chartContent: string) => {
  state.chartContent = chartContent;
});
export const setMapInfo = action("setMapInfo", (mapInfo: MapInfo) => {
  state.mapState.mapInfo = mapInfo;
});
export const setTopStageKey = action("setTopStageKey", (key: string, unit: string) => {
  if (!state.settings.timeSettings[unit]) {
    throw new Error(`Unit ${unit} not found in timeSettings`);
  }
  state.settings.timeSettings[unit].topStageKey = key;
});
export const setBaseStageKey = action("setBaseStageKey", (key: string, unit: string) => {
  if (!state.settings.timeSettings[unit]) {
    throw new Error(`Unit ${unit} not found in timeSettings`);
  }
  state.settings.timeSettings[unit].baseStageKey = key;
});
export const setSelectedStage = action("setSelectedStage", (key: string, unit: string) => {
  if (!state.settings.timeSettings[unit]) {
    throw new Error(`Unit ${unit} not found in timeSettings`);
  }
  state.settings.timeSettings[unit].selectedStage = key;
});
export const setGeologicalBaseStageAges = action("setGeologicalBaseStageAges", (key: TimescaleItem[]) => {
  state.geologicalBaseStageAges = key;
});
export const setGeologicalTopStageAges = action("setGeologicalTopStageAges", (key: TimescaleItem[]) => {
  state.geologicalTopStageAges = key;
});
export const setUnitsPerMY = action((units: number, unit: string) => {
  if (!state.settings.timeSettings[unit]) {
    throw new Error(`Unit ${unit} not found in timeSettings`);
  }
  state.settings.timeSettings[unit].unitsPerMY = units;
});

export const setMouseOverPopupsEnabled = action((checked: boolean) => {
  state.settings.mouseOverPopupsEnabled = checked;
});

export const setChartLoading = action((value: boolean) => {
  state.chartLoading = value;
});

export const setChartMade = action((value: boolean) => {
  state.madeChart = value;
});

export const setMapHierarchy = action("setMapHierarchy", (mapHierarchy: MapHierarchy) => {
  state.mapState.mapHierarchy = mapHierarchy;
});
export const setChartHash = action("setChartHash", (charthash: string) => {
  state.chartHash = charthash;
});
export const setDatapackProfilePageEditMode = action("setDatapackProfilePageEditMode", (editMode: boolean) => {
  state.datapackProfilePage.editMode = editMode;
});
export const setTopStageAge = action("setTopStageAge", (age: number, unit: string) => {
  if (!state.settings.timeSettings[unit]) {
    throw new Error(`Unit ${unit} not found in timeSettings`);
  }
  state.settings.timeSettings[unit].topStageAge = age;
  const correspondingKey = state.geologicalTopStageAges.find((item) => item.value === age);
  if (correspondingKey) {
    setTopStageKey(correspondingKey.key, unit);
  } else setTopStageKey("", unit);
});
export const setBaseStageAge = action("setBaseStageAge", (age: number, unit: string) => {
  if (!state.settings.timeSettings[unit]) {
    throw new Error(`Unit ${unit} not found in timeSettings`);
  }
  state.settings.timeSettings[unit].baseStageAge = age;
  const correspondingKey = state.geologicalBaseStageAges.find((item) => item.value === age);
  if (correspondingKey) {
    setBaseStageKey(correspondingKey.key, unit);
  } else setBaseStageKey("", unit);
});

export const settingsXML = action("settingsXML", (xml: string) => {
  state.settingsXML = xml;
});

export const setIsFullscreen = action("setIsFullscreen", (newval: boolean) => {
  state.isFullscreen = newval;
});

export const updatePresetColors = action("updatePresetColors", (newColor: string) => {
  let updatedColors = state.presetColors.filter((c) => c !== newColor);
  updatedColors.unshift(newColor);
  if (updatedColors.length > 10) {
    updatedColors = updatedColors.slice(0, 10);
  }
  state.presetColors = updatedColors;
  if (state.cookieConsent) {
    localStorage.setItem("savedColors", JSON.stringify(updatedColors));
  }
});

export const setSkipEmptyColumns = action("setSkipEmptyColumns", (newval: boolean, unit: string) => {
  if (!state.settings.timeSettings[unit]) {
    throw new Error(`Unit ${unit} not found in timeSettings`);
  }
  state.settings.timeSettings[unit].skipEmptyColumns = newval;
});
export const setNoIndentPattern = action("setNoIndentPattern", (newval: boolean) => {
  state.settings.noIndentPattern = newval;
});
export const setEnableColumnBackground = action("setEnableColumnBackground", (newval: boolean) => {
  state.settings.enableColumnBackground = newval;
});
export const setEnableChartLegend = action("setEnableChartLegend", (newval: boolean) => {
  state.settings.enableChartLegend = newval;
});
export const setEnablePriority = action("setEnablePriority", (newval: boolean) => {
  state.settings.enablePriority = newval;
});
export const setEnableHideBlockLabel = action("setEnableHideBlockLabel", (newval: boolean) => {
  state.settings.enableHideBlockLabel = newval;
});

export const setLoadSaveFilename = action("setLoadSaveFilename", (newval: string) => {
  state.loadSaveFilename = newval;
});

export const setDatapackDisplayType = action(
  "setDatapackDisplayType",
  (newval: State["settingsTabs"]["datapackDisplayType"]) => {
    state.settingsTabs.datapackDisplayType = newval;
  }
);
export const setCookies = action("setCookies", (newval: boolean) => {
  state.cookieConsent = newval;
  localStorage.setItem("cookieConsent", newval.toString());
});

export const setChartTabScale = action("setChartTabScale", (newval: number) => {
  state.chartTab.scale = newval;
});

export const setChartTabZoomFitScale = action("setChartTabZoomFitScale", (newval: number) => {
  state.chartTab.zoomFitScale = newval;
});
export const setChartTabResetMidX = action("setChartTabResetMidX", (newval: number) => {
  state.chartTab.resetMidX = newval;
});
export const setChartTabZoomFitMidCoord = action("setChartTabZoomFitMidCoord", (newval: number) => {
  state.chartTab.zoomFitMidCoord = newval;
});
export const setChartTabZoomFitMidCoordIsX = action("setChartTabZoomFitMidCoordIsX", (newval: boolean) => {
  state.chartTab.zoomFitMidCoordIsX = newval;
});
export const setChartTabDownloadFilename = action("setChartTabDownloadFilename", (newval: string) => {
  state.chartTab.downloadFilename = newval;
});

export const setChartTabDownloadFiletype = action("setChartTabDownloadFiletype", (newval: "svg" | "pdf" | "png") => {
  state.chartTab.downloadFiletype = newval;
});
export const setChartTabEnableScrollZoom = action("setChartTabEnableScrollZoom", (newval: boolean) => {
  state.chartTab.enableScrollZoom = newval;
});

export const setChartTabIsSavingChart = action((term: boolean) => {
  state.chartTab.isSavingChart = term;
});
export const setUnsafeChartContent = action((content: string) => {
  state.chartTab.unsafeChartContent = content;
});
export const resetEditableDatapackMetadata = action((metadata: EditableDatapackMetadata | null) => {
  setUnsavedChanges(false);
  if (!metadata) {
    state.datapackProfilePage.editableDatapackMetadata = null;
    return;
  }
  // so we don't include any extra fields (since destructuring includes all fields)
  state.datapackProfilePage.editableDatapackMetadata = {
    description: metadata.description,
    title: metadata.title,
    isPublic: metadata.isPublic,
    tags: metadata.tags,
    type: metadata.type,
    authoredBy: metadata.authoredBy,
    priority: metadata.priority,
    references: metadata.references
  };
});
export const setUnsavedChanges = action((unsavedChanges: boolean) => {
  state.datapackProfilePage.unsavedChanges = unsavedChanges;
});
export const updateEditableDatapackMetadata = action((metadata: Partial<EditableDatapackMetadata>) => {
  if (!state.datapackProfilePage.editableDatapackMetadata) {
    console.error("Editable datapack metadata is not initialized");
    return;
  }
  setUnsavedChanges(true);
  state.datapackProfilePage.editableDatapackMetadata = {
    ...state.datapackProfilePage.editableDatapackMetadata,
    ...metadata
  };
});

// TODO: Change this when the actual backend for rendering all workshops is implemented.
// Maybe similar to how we handled datapacks.
// For now, this just loads the selected dummy workshop into the state.
export const setWorkshopsArray = action((workshop: Workshop[]) => {
  state.workshops = workshop;
});

export const setPresetsLoading = action((loading: boolean) => {
  state.skeletonStates.presetsLoading = loading;
});

export const setOfficialDatapacksLoading = action((fetching: boolean) => {
  state.skeletonStates.officialDatapacksLoading = fetching;
});
export const setPublicDatapacksLoading = action((fetching: boolean) => {
  state.skeletonStates.publicUserDatapacksLoading = fetching;
});
export const setPrivateUserDatapacksLoading = action((fetching: boolean) => {
  state.skeletonStates.privateUserDatapacksLoading = fetching;
});

export const setTourOpen = action((openTour: boolean, tourName: string) => {
  switch (tourName) {
    case "qsg":
      state.guides.isQSGOpen = openTour;
      state.guides.isDatapacksTourOpen = false; // Close any other tours that might still be open to prevent multiple tours from running simultaneously.
      state.guides.isSettingsTourOpen = false; //  ensures that starting a new tour will not lead to overlapping tours,
      state.guides.isWorkshopsTourOpen = false;
      break;
    case "datapacks":
      state.guides.isDatapacksTourOpen = openTour;
      state.guides.isQSGOpen = false;
      state.guides.isSettingsTourOpen = false;
      state.guides.isWorkshopsTourOpen = false;
      break;
    case "settings":
      state.guides.isSettingsTourOpen = openTour;
      state.guides.isQSGOpen = false;
      state.guides.isDatapacksTourOpen = false;
      state.guides.isWorkshopsTourOpen = false;

      break;
    case "workshops":
      state.guides.isWorkshopsTourOpen = openTour;
      state.guides.isQSGOpen = false;
      state.guides.isDatapacksTourOpen = false;
      state.guides.isSettingsTourOpen = false;
      break;
    default:
      console.error("No such tour");
      state.guides.isQSGOpen = false;
      state.guides.isDatapacksTourOpen = false;
      state.guides.isSettingsTourOpen = false;
      state.guides.isWorkshopsTourOpen = false;
  }
});
