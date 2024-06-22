import { action, runInAction } from "mobx";
import {
  SharedUser,
  ChartInfoTSC,
  ChartSettingsInfoTSC,
  DatapackIndex,
  FontsInfo,
  MapPackIndex,
  TimescaleItem,
  assertSharedUser,
  assertChartInfoTSC,
  assertDatapackInfoChunk,
  assertMapPackInfoChunk
} from "@tsconline/shared";

import {
  type MapInfo,
  type ColumnInfo,
  type MapHierarchy,
  assertSuccessfulServerResponse,
  Presets,
  assertSVGStatus,
  IndexResponse,
  assertMapHierarchy,
  assertColumnInfo,
  assertMapInfo,
  defaultFontsInfo,
  assertIndexResponse,
  assertPresets,
  assertPatterns
} from "@tsconline/shared";
import { state, State } from "../state";
import { fetcher } from "../../util";
import { applyChartColumnSettings, applyRowOrder, initializeColumnHashMap } from "./column-actions";
import { xmlToJson } from "../parse-settings";
import { displayServerError } from "./util-actions";
import { compareStrings } from "../../util/util";
import { ErrorCodes, ErrorMessages } from "../../util/error-codes";
import { SettingsTabs, equalChartSettings, equalConfig } from "../../types";
import { settings, defaultTimeSettings } from "../../constants";
import { snackbarTextLengthLimit } from "../../util/constant";
import { cloneDeep } from "lodash";

const increment = 1;

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
/**
 * Resets any user defined settings
 */
export const resetSettings = action("resetSettings", () => {
  state.settings = JSON.parse(JSON.stringify(settings));
});

export const fetchDatapackIndex = action("fetchDatapackIndex", async () => {
  let start = 0;
  let total = -1;
  const datapackIndex: DatapackIndex = {};
  try {
    while (total == -1 || start < total) {
      const response = await fetcher(`/datapack-index?start=${start}&increment=${increment}`, {
        method: "GET"
      });
      const index = await response.json();
      try {
        assertDatapackInfoChunk(index);
        Object.assign(datapackIndex, index.datapackIndex);
        if (total == -1) total = index.totalChunks;
        start += increment;
      } catch (e) {
        displayServerError(index, ErrorCodes.INVALID_DATAPACK_INFO, ErrorMessages[ErrorCodes.INVALID_DATAPACK_INFO]);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    setDatapackIndex(datapackIndex);
    console.log("Datapacks loaded");
  } catch (e) {
    displayServerError(null, ErrorCodes.SERVER_RESPONSE_ERROR, ErrorMessages[ErrorCodes.SERVER_RESPONSE_ERROR]);
    console.error(e);
  }
});

export const fetchMapPackIndex = action("fetchMapPackIndex", async () => {
  let start = 0;
  let total = -1;
  const mapPackIndex: MapPackIndex = {};
  try {
    while (total == -1 || start < total) {
      const response = await fetcher(`/map-pack-index?start=${start}&increment=${increment}`, {
        method: "GET"
      });
      const index = await response.json();
      try {
        assertMapPackInfoChunk(index);
        Object.assign(mapPackIndex, index.mapPackIndex);
        if (total == -1) total = index.totalChunks;
        start += increment;
      } catch (e) {
        displayServerError(index, ErrorCodes.INVALID_MAPPACK_INFO, ErrorMessages[ErrorCodes.INVALID_MAPPACK_INFO]);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    setMapPackIndex(mapPackIndex);
    console.log("MapPacks loaded");
  } catch (e) {
    displayServerError(null, ErrorCodes.SERVER_RESPONSE_ERROR, ErrorMessages[ErrorCodes.SERVER_RESPONSE_ERROR]);
    console.error(e);
  }
});

/**
 * This is not used to prioritize chunk loading to prevent ui lag
 * however, this will technichally load faster with the current datapacks 5/4/2024
 */
export const fetchAllIndexes = action("fetchAllIndexes", async () => {
  try {
    const response = await fetcher("/datapackinfoindex", {
      method: "GET"
    });
    const indexResponse = await response.json();
    try {
      assertIndexResponse(indexResponse);
      loadIndexResponse(indexResponse);
      console.log("Indexes loaded");
    } catch (e) {
      displayServerError(
        indexResponse,
        ErrorCodes.INVALID_DATAPACK_INFO,
        ErrorMessages[ErrorCodes.INVALID_DATAPACK_INFO]
      );
    }
  } catch (e) {
    displayServerError(null, ErrorCodes.SERVER_RESPONSE_ERROR, ErrorMessages[ErrorCodes.SERVER_RESPONSE_ERROR]);
    console.error(e);
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
  }
});

/**
 * This will grab the user datapacks AND the server datapacks from the server
 */
export const fetchUserDatapacks = action("fetchUserDatapacks", async () => {
  try {
    const response = await fetcher(`/user-datapacks`, {
      method: "GET",
      credentials: "include"
    });
    const data = await response.json();
    try {
      assertIndexResponse(data);
      const { mapPackIndex, datapackIndex } = data;
      setMapPackIndex(mapPackIndex);
      setDatapackIndex(datapackIndex);
      console.log("User Datapacks loaded");
    } catch (e) {
      if (response.status != 404) {
        displayServerError(data, ErrorCodes.INVALID_USER_DATAPACKS, ErrorMessages[ErrorCodes.INVALID_USER_DATAPACKS]);
      } else {
        fetchDatapackIndex();
        fetchMapPackIndex();
      }
    }
  } catch (e) {
    displayServerError(null, ErrorCodes.SERVER_RESPONSE_ERROR, ErrorMessages[ErrorCodes.SERVER_RESPONSE_ERROR]);
    console.error(e);
  }
});

export const uploadDatapack = action("uploadDatapack", async (file: File, name: string) => {
  if (state.datapackIndex[file.name]) {
    pushError(ErrorCodes.DATAPACK_ALREADY_EXISTS);
    return;
  }
  const formData = new FormData();
  formData.append("file", file);
  try {
    const response = await fetcher(`/upload`, {
      method: "POST",
      body: formData,
      credentials: "include"
    });
    const data = await response.json();
    if (response.ok) {
      console.log("Successfully uploaded datapack");
      fetchUserDatapacks();
      pushSnackbar("Successfully uploaded " + name + " datapack", "success");
    } else {
      displayServerError(data, ErrorCodes.INVALID_DATAPACK_UPLOAD, ErrorMessages[ErrorCodes.INVALID_DATAPACK_UPLOAD]);
    }
  } catch (e) {
    displayServerError(null, ErrorCodes.SERVER_RESPONSE_ERROR, ErrorMessages[ErrorCodes.SERVER_RESPONSE_ERROR]);
    console.error(e);
  }
});

export const setMapPackIndex = action("setMapPackIndex", async (mapPackIndex: MapPackIndex) => {
  // This is to prevent the UI from lagging
  state.mapPackIndex = {};
  for (const key in mapPackIndex) {
    state.mapPackIndex[key] = mapPackIndex[key];
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
});

export const setDatapackIndex = action("setDatapackIndex", async (datapackIndex: DatapackIndex) => {
  // This is to prevent the UI from lagging
  state.datapackIndex = {};
  for (const key in datapackIndex) {
    runInAction(() => {
      state.datapackIndex[key] = datapackIndex[key];
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
});

export const loadIndexResponse = action("loadIndexResponse", async (response: IndexResponse) => {
  setDatapackIndex(response.datapackIndex);
  setMapPackIndex(response.mapPackIndex);
});
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
  }
});

export const applySettings = action("applySettings", async (settings: ChartInfoTSC) => {
  applyChartSettings(settings.settings);
  applyChartColumnSettings(settings["class datastore.RootColumn:Chart Root"]);
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

const setPreviousDatapackConfig = action("setPreviousDatapackConfig", (datapacks: string[]) => {
  if (!state.datapackCachedConfiguration.has(state.config.datapacks.join(","))) {
    return;
  }
  const cachedConfig = state.datapackCachedConfiguration.get(state.config.datapacks.join(","))!;
  state.config.datapacks = datapacks;
  state.settingsTabs.columns = cachedConfig.columns;
  state.settingsTabs.columnHashMap = cachedConfig.columnHashMap;
  state.mapState.mapInfo = cachedConfig.mapInfo;
  state.mapState.mapHierarchy = cachedConfig.mapHierarchy;
  state.settings.datapackContainsSuggAge = cachedConfig.datapackContainsSuggAge;
  // add new units
  for (const unit of cachedConfig.units) {
    if (!state.settings.timeSettings[unit]) {
      state.settings.timeSettings[unit] = JSON.parse(JSON.stringify(defaultTimeSettings));
    }
  }
  // remove old units
  for (const unit of Object.keys(state.settings.timeSettings)) {
    if (!cachedConfig.units.includes(unit)) {
      delete state.settings.timeSettings[unit];
    }
  }
});

/**
 * Rests the settings, sets the tabs to 0
 * sets chart to newval and requests info on the datapacks from the server
 * If attributed settings, load them.
 */
export const setDatapackConfig = action(
  "setDatapackConfig",
  async (datapacks: string[], settingsPath?: string): Promise<boolean> => {
    if (state.datapackCachedConfiguration.has(datapacks.join(","))) {
      setPreviousDatapackConfig(datapacks);
      return true;
    }
    const unitMap: Map<string, ColumnInfo> = new Map();
    let mapInfo: MapInfo = {};
    let mapHierarchy: MapHierarchy = {};
    let columnRoot: ColumnInfo;
    let chartSettings: ChartInfoTSC | null = null;
    let foundDefaultAge = false;
    try {
      if (settingsPath && settingsPath.length > 0) {
        await fetchSettingsXML(settingsPath)
          .then((settings) => {
            if (settings) {
              removeError(ErrorCodes.INVALID_SETTINGS_RESPONSE);
              chartSettings = JSON.parse(JSON.stringify(settings));
            } else {
              return false;
            }
          })
          .catch((e) => {
            console.error(e);
            pushError(ErrorCodes.INVALID_SETTINGS_RESPONSE);
            return false;
          });
      }
      // the default overarching variable for the columnInfo
      columnRoot = {
        name: "Chart Root", // if you change this, change parse-datapacks.ts :69
        editName: "Chart Root",
        fontsInfo: JSON.parse(JSON.stringify(defaultFontsInfo)),
        fontOptions: ["Column Header"],
        popup: "",
        on: true,
        width: 100,
        enableTitle: true,
        rgb: {
          r: 255,
          g: 255,
          b: 255
        },
        minAge: Number.MAX_VALUE,
        maxAge: Number.MIN_VALUE,
        children: [],
        parent: null,
        units: "",
        columnDisplayType: "RootColumn",
        show: true,
        expanded: true
      };
      // all chart root font options have inheritable on
      for (const opt in columnRoot.fontsInfo) {
        columnRoot.fontsInfo[opt as keyof FontsInfo].inheritable = true;
      }
      // add everything together
      // uses preparsed data on server start and appends items together
      for (const datapack of datapacks) {
        await new Promise((resolve) => setTimeout(resolve, 0));
        if (!datapack || !state.datapackIndex[datapack])
          throw new Error(`File requested doesn't exist on server: ${datapack}`);
        const datapackParsingPack = state.datapackIndex[datapack]!;
        if (
          ((datapackParsingPack.topAge || datapackParsingPack.topAge === 0) &&
            (datapackParsingPack.baseAge || datapackParsingPack.baseAge === 0)) ||
          datapackParsingPack.verticalScale
        )
          foundDefaultAge = true;
        if (unitMap.has(datapackParsingPack.ageUnits)) {
          const existingUnitColumnInfo = unitMap.get(datapackParsingPack.ageUnits)!;
          const newUnitChart = datapackParsingPack.columnInfo;
          // slice off the existing unit column
          const columnsToAdd = cloneDeep(newUnitChart.children.slice(1));
          for (const child of columnsToAdd) {
            child.parent = existingUnitColumnInfo.name;
          }
          existingUnitColumnInfo.children = existingUnitColumnInfo.children.concat(columnsToAdd);
        } else {
          const columnInfo = cloneDeep(datapackParsingPack.columnInfo);
          columnInfo.parent = columnRoot.name;
          unitMap.set(datapackParsingPack.ageUnits, columnInfo);
        }
        const mapPack = state.mapPackIndex[datapack]!;
        if (!mapInfo) mapInfo = mapPack.mapInfo;
        else Object.assign(mapInfo, mapPack.mapInfo);
        if (!mapHierarchy) mapHierarchy = mapPack.mapHierarchy;
        else Object.assign(mapHierarchy, mapPack.mapHierarchy);
      }
      // makes sure things are named correctly for users and for the hash map to not have collisions
      for (const [unit, column] of unitMap) {
        await new Promise((resolve) => setTimeout(resolve, 0));
        if (unit !== "Ma" && column.name === "Chart Title") {
          column.name = column.name + " in " + unit;
          column.editName = unit;
          for (const child of column.children) {
            child.parent = column.name;
          }
        }
        columnRoot.fontOptions = Array.from(new Set([...columnRoot.fontOptions, ...column.fontOptions]));
        columnRoot.children.push(column);
      }
      assertMapHierarchy(mapHierarchy);
      assertColumnInfo(columnRoot);
      assertMapInfo(mapInfo);
    } catch (e) {
      console.error(e);
      pushError(ErrorCodes.INVALID_DATAPACK_CONFIG);
      chartSettings = null;
      return false;
    }
    resetSettings();
    state.settingsTabs.columns = columnRoot;
    state.settings.datapackContainsSuggAge = foundDefaultAge;
    state.mapState.mapHierarchy = mapHierarchy;
    state.mapState.mapInfo = mapInfo;
    state.settingsTabs.columnHashMap = new Map();
    // throws warning if this isn't in its own action. may have other fix but left as is
    runInAction(() => {
      state.config.datapacks = datapacks;
    });
    // this is for app start up or when all datapacks are removed
    if (datapacks.length === 0) {
      state.settings.timeSettings["Ma"] = JSON.parse(JSON.stringify(defaultTimeSettings));
    }
    await initializeColumnHashMap(state.settingsTabs.columns);
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
    state.datapackCachedConfiguration.set(datapacks.join(","), {
      columns: columnRoot,
      columnHashMap: state.settingsTabs.columnHashMap,
      mapInfo,
      mapHierarchy,
      datapackContainsSuggAge: state.settings.datapackContainsSuggAge,
      units: Object.keys(state.settings.timeSettings)
    });
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
  setDatapackConfig([], "");
  setChartHash("");
  setChartContent("");
  setUseCache(true);
  setUsePreset(true);
  setTab(0);
  setSettingsTabsSelected("time");
  setSettingsColumns(undefined);
  setMapInfo({});
  state.settingsTabs.columnSelected = null;
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
      state.settingsTabs.selected = "column";
      break;
    case 2:
      state.settingsTabs.selected = "font";
      break;
    case 3:
      state.settingsTabs.selected = "mappoints";
      break;
    case 4:
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
    case "column":
      return 1;
    case "font":
      return 2;
    case "mappoints":
      return 3;
    case "datapacks":
      return 4;
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
  if (text.length > snackbarTextLengthLimit) {
    console.error("The length of snackbar text must be less than 70");
    return;
  }
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

export const fetchImage = action("fetchImage", async (datapackName: string, imageName: string) => {
  const response = await fetcher(`/images/${datapackName}/${imageName}`, {
    method: "GET"
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

export const requestDownload = action(async (filename: string, needEncryption: boolean) => {
  let route;
  if (!needEncryption) {
    route = `/download/user-datapacks/${filename}`;
  } else {
    route = `/download/user-datapacks/${filename}?needEncryption=${needEncryption}`;
  }
  const response = await fetcher(route, {
    method: "GET",
    credentials: "include"
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

        aTag.setAttribute("download", filename);

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
      fetchDatapackIndex();
      fetchMapPackIndex();
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
    settings: {
      darkMode: false,
      language: "en"
    }
  };
});

export const setChartTimelineEnabled = action("setChartTimelineEnabled", (enabled: boolean) => {
  state.chartTimelineEnabled = enabled;
});

export const setChartTimelineLocked = action("setChartTimelineLocked", (locked: boolean) => {
  state.chartTimelineLocked = locked;
});

export const setUser = action("setUser", (user: SharedUser) => {
  assertSharedUser(user);
  state.user = user;
});
export const setPictureUrl = action("setPictureUrl", (url: string) => {
  state.user.pictureUrl = url;
});
export const setDarkMode = action("setDarkMode", (newval: boolean) => {
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
    newval == 1 &&
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
  localStorage.setItem("savedColors", JSON.stringify(updatedColors));
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
