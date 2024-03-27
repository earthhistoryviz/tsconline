import { action, runInAction } from "mobx";
import { TimescaleItem } from "@tsconline/shared";

import {
  type MapInfo,
  type ColumnInfo,
  type MapHierarchy,
  type GeologicalStages,
  assertSuccessfulServerResponse,
  Presets,
  assertSVGStatus,
  IndexResponse,
  assertDatapackAgeInfo,
  assertMapHierarchy,
  assertColumnInfo,
  assertMapInfo,
  DatapackAgeInfo,
  defaultFontsInfo,
  assertIndexResponse,
  assertPresets,
  assertPatterns
} from "@tsconline/shared";
import { state, State } from "../state";
import { fetcher } from "../../util";
import { initializeColumnHashMap } from "./column-actions";
import { xmlToJson } from "../parse-settings";
import { displayServerError } from "./util-actions";
import { Settings } from "../../types";
import { compareStrings } from "../../util/util";
import { ErrorCodes, ErrorMessages } from "../../util/error-codes";

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
  state.settings = {
    selectedStage: "",
    topStageAge: 0,
    topStageKey: "",
    baseStageAge: 0,
    baseStageKey: "",
    unitsPerMY: 2,
    useDatapackSuggestedAge: false,
    mouseOverPopupsEnabled: false,
    datapackContainsSuggAge: false,
    selectedBaseStage: "",
    selectedTopStage: ""
  };
});

export const fetchDatapackInfo = action("fetchDatapackInfo", async () => {
  try {
    const response = await fetcher("/datapackinfoindex", {
      method: "GET"
    });
    const indexResponse = await response.json();
    try {
      assertIndexResponse(indexResponse);
      loadIndexResponse(indexResponse);
      console.log("Datapacks loaded");
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

export const fetchUserDatapacks = action("fetchUserDatapacks", async (username: string) => {
  try {
    const response = await fetcher(`/user-datapacks/${username}`, {
      method: "GET"
    });
    const data = await response.json();
    try {
      assertIndexResponse(data);
      const { mapPackIndex, datapackIndex } = data;
      Object.assign(state.mapPackIndex, mapPackIndex);
      Object.assign(state.datapackIndex, datapackIndex);
      console.log("User Datapacks loaded");
    } catch (e) {
      displayServerError(data, ErrorCodes.INVALID_USER_DATAPACKS, ErrorMessages[ErrorCodes.INVALID_USER_DATAPACKS]);
    }
  } catch (e) {
    displayServerError(null, ErrorCodes.SERVER_RESPONSE_ERROR, ErrorMessages[ErrorCodes.SERVER_RESPONSE_ERROR]);
    console.error(e);
  }
});

export const uploadDatapack = action("uploadDatapack", async (file: File, username: string) => {
  const formData = new FormData();
  formData.append("file", file);
  try {
    const response = await fetcher(`/upload/${username}`, {
      method: "POST",
      body: formData
    });
    const data = await response.json();
    if (response.ok) {
      console.log("Successfully uploaded datapack");
      fetchUserDatapacks(username);
    } else {
      displayServerError(data, ErrorCodes.INVALID_DATAPACK_UPLOAD, ErrorMessages[ErrorCodes.INVALID_DATAPACK_UPLOAD]);
    }
  } catch (e) {
    displayServerError(null, ErrorCodes.SERVER_RESPONSE_ERROR, ErrorMessages[ErrorCodes.SERVER_RESPONSE_ERROR]);
    console.error(e);
  }
});
export const loadIndexResponse = action("loadIndexResponse", (response: IndexResponse) => {
  state.mapPackIndex = response.mapPackIndex;
  state.datapackIndex = response.datapackIndex;
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

/**
 * Rests the settings, sets the tabs to 0
 * sets chart to newval and requests info on the datapacks from the server
 * If attributed settings, load them.
 */
export const setDatapackConfig = action(
  "setChart",
  async (datapacks: string[], settingsPath: string): Promise<boolean> => {
    resetSettings();
    //set the settings tab back to time
    setSettingsTabsSelected(0);
    let datapackAgeInfo: DatapackAgeInfo = {
      datapackContainsSuggAge: false
    };
    let mapInfo: MapInfo = {};
    let mapHierarchy: MapHierarchy = {};
    let columnInfo: ColumnInfo;
    try {
      // the default overarching variable for the columnInfo
      columnInfo = {
        name: "Root", // if you change this, change parse-datapacks.ts :69
        editName: "Chart Title",
        fontsInfo: JSON.parse(JSON.stringify(defaultFontsInfo)),
        popup: "",
        on: true,
        width: 100,
        enableTitle: true,
        rgb: {
          r: 255,
          g: 255,
          b: 255
        },
        minAge: state.settings.topStageAge,
        maxAge: state.settings.baseStageAge,
        children: [
          {
            name: "Ma",
            editName: "Ma",
            fontsInfo: JSON.parse(JSON.stringify(defaultFontsInfo)),
            on: true,
            width: 100,
            enableTitle: true,
            rgb: {
              r: 255,
              g: 255,
              b: 255
            },
            popup: "",
            children: [],
            parent: "Root", // if you change this, change parse-datapacks.ts :69
            minAge: state.settings.topStageAge, //tbd
            maxAge: state.settings.baseStageAge //tbd
          }
        ],
        parent: null
      };
      // add everything together
      // uses preparsed data on server start and appends items together
      for (const datapack of datapacks) {
        if (!datapack || !state.datapackIndex[datapack] || !state.mapPackIndex[datapack])
          throw new Error(`File requested doesn't exist on server: ${datapack}`);
        const datapackParsingPack = state.datapackIndex[datapack]!;
        // concat the children array of root to the array created in preparsed array
        // we can't do Object.assign here because it will overwrite the array rather than concat it
        columnInfo.children = columnInfo.children.concat(datapackParsingPack.columnInfoArray);
        // concat datapackAgeInfo objects together
        if (!datapackAgeInfo) datapackAgeInfo = datapackParsingPack.datapackAgeInfo;
        else Object.assign(datapackAgeInfo, datapackParsingPack.datapackAgeInfo);

        const mapPack = state.mapPackIndex[datapack]!;
        if (!mapInfo) mapInfo = mapPack.mapInfo;
        else Object.assign(mapInfo, mapPack.mapInfo);
        if (!mapHierarchy) mapHierarchy = mapPack.mapHierarchy;
        else Object.assign(mapHierarchy, mapPack.mapHierarchy);
      }
      assertDatapackAgeInfo(datapackAgeInfo);
      assertMapHierarchy(mapHierarchy);
      assertColumnInfo(columnInfo);
      assertMapInfo(mapInfo);
    } catch (e) {
      pushError(ErrorCodes.INVALID_DATAPACK_CONFIG);
      return false;
    }
    state.settings.datapackContainsSuggAge = datapackAgeInfo.datapackContainsSuggAge;
    state.mapState.mapHierarchy = mapHierarchy;
    state.settingsTabs.columns = columnInfo;
    state.mapState.mapInfo = mapInfo;
    state.config.datapacks = datapacks;
    state.config.settingsPath = settingsPath;
    initializeColumnHashMap(columnInfo);
    // Grab the settings for this chart if there are any:
    if (settingsPath && settingsPath.length > 0) {
      const res = await fetcher(`/settingsXml/${encodeURIComponent(settingsPath)}`, {
        method: "GET"
      });
      try {
        const settingsXml = await res.text();
        console.log("recieved settings Xml string at setDatapackConfig");
        const settingsJson = xmlToJson(settingsXml);
        runInAction(() => (state.settingsJSON = settingsJson)); // Save the parsed JSON to the state.settingsJSON
      } catch (e) {
        displayServerError(
          null,
          ErrorCodes.INVALID_SETTINGS_RESPONSE,
          ErrorMessages[ErrorCodes.INVALID_SETTINGS_RESPONSE]
        );
        return false;
      }
    } else {
      state.settingsJSON = null;
    }
    return true;
  }
);

/**
 * Sets the geological top stages and the base stages
 * Assuming the given stages includes the stages[TOP] = 0
 */
export const setGeologicalStages = action("setGeologicalStages", (stages: GeologicalStages) => {
  let top = stages["TOP"];
  const geologicalTopStages: GeologicalStages = { Present: 0 };
  Object.keys(stages).map((key) => {
    geologicalTopStages[key] = top;
    top = stages[key];
  });
  delete stages["TOP"];
  delete geologicalTopStages["TOP"];
  state.settingsTabs.geologicalTopStages = geologicalTopStages;
  state.settingsTabs.geologicalBaseStages = stages;
});

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
  setChartPath("");
  setUseCache(true);
  setUsePreset(true);
  setTab(0);
  setSettingsTabsSelected("time");
  setSettingsColumns(null);
  setMapInfo({});
  state.settingsTabs.columnSelected = null;
  state.settingsXML = "";
  state.settingsJSON = {};
});

export const loadPresets = action("loadPresets", (presets: Presets) => {
  state.presets = presets;
  setDatapackConfig([], "");
});
//update
//TODO: need to overhaul
export const updateSettings = action("updateSettings", () => {
  const { unitsPerMY } = state.settings;
  // Validate the user input
  if (isNaN(unitsPerMY)) {
    // Handle invalid input, show error message, etc.
    return;
  }
  state.settingsJSON["settingsTabs"] = state.settingsTabs;
  // const jsonSettings = state.settingsJSON;
  // if ("settings" in jsonSettings) {
  //   const settings = jsonSettings.settings as any;
  //   settings["topAge"]["stage"] = state.settingsTabs.columns[topStageKey];
  //   settings["baseAge"]["stage"] = state.settingsTabs.columns[baseStageKey];
  //   settings["unitsPerMY"] = (unitsPerMY * 30).toString();
  // }
  // if ("settingsTabs" in jsonSettings) {
  //   const settingsTabs = jsonSettings as any;
  // }
  // uncomment later
  // const xmlSettings = jsonToXml(jsonSettings); // Convert JSON to XML using jsonToXml function

  //console.log("Updated settingsXML:\n", xmlSettings); // Print the updated XML

  // state.settingsXML = xmlSettings;
});

//update the checkboxes
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

// Combined function to update the checkbox settings and individual action functions
export const updateCheckboxSetting = action((stateName: string, checked: boolean) => {
  // Check if the stateName is a valid setting option
  const settingOption = settingOptions.find((option) => option.stateName === stateName);
  if (!settingOption) return;

  // Update the checkbox setting in state.settings
  if (
    state.settings[stateName as keyof Settings] !== undefined &&
    typeof state.settings[stateName as keyof Settings] === "boolean"
  ) {
    // @ts-expect-error: This cannot index by stateName key for some reason so we ignore with error
    state.settings[`${stateName as keyof Settings}`] = checked;
  }

  // Update the checkbox setting in jsonSettings['settings'] if available
  if (state.settingsJSON["settings"]) {
    const settings = state.settingsJSON["settings"];
    // Check if the current setting is already equal to the new value
    if (settings[stateName] !== checked) {
      settings[stateName] = checked;
    }
  }

  // Log the updated setting
  console.log(`Updated setting "${stateName}" to ${checked}`);
});

/**
 * set the settings tab based on a string or number
 */
export const setSettingsTabsSelected = action((newtab: number | State["settingsTabs"]["selected"]) => {
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

export const handleCloseSnackbar = action(
  "handleCloseSnackbar",
  (event: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === "clickaway") {
      return;
    }
    state.openSnackbar = false;
  }
);

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

export const setuseDatapackSuggestedAge = action((isChecked: boolean) => {
  state.settings.datapackContainsSuggAge = isChecked;
});
export const setTab = action("setTab", (newval: number) => {
  state.tab = newval;
});
export const setSettingsColumns = action((temp: ColumnInfo | null) => {
  state.settingsTabs.columns = temp;
});
export const setUseCache = action((temp: boolean) => {
  state.useCache = temp;
});
export const setUsePreset = action((temp: boolean) => {
  state.useCache = temp;
});

export const setChartPath = action("setChartPath", (chartpath: string) => {
  state.chartPath = chartpath;
});
export const setMapInfo = action("setMapInfo", (mapInfo: MapInfo) => {
  state.mapState.mapInfo = mapInfo;
});
export const setTopStageKey = action("setTopStageKey", (key: string) => {
  state.settings.topStageKey = key;
});
export const setBaseStageKey = action("setBottomStageKey", (key: string) => {
  state.settings.baseStageKey = key;
});
export const setSelectedTopStage = action("setSelectedTopStage", (key: string) => {
  state.settings.topStageKey = key;
});
export const setSelectedBaseStage = action("setSelectedBaseStage", (key: string) => {
  state.settings.baseStageKey = key;
});
export const setSelectedStage = action("setSelectedStage", (key: string) => {
  state.settings.selectedStage = key;
});
export const setGeologicalBaseStageAges = action("setGeologicalBaseStageAges", (key: TimescaleItem[]) => {
  state.geologicalBaseStageAges = key;
});
export const setGeologicalTopStageAges = action("setGeologicalTopStageAges", (key: TimescaleItem[]) => {
  state.geologicalTopStageAges = key;
});
export const setUnitsPerMY = action((units: number) => {
  state.settings.unitsPerMY = units;
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
export const setTopStageAge = action("setTopStageAge", (age: number) => {
  state.settings.topStageAge = age;
});
export const setBaseStageAge = action("setBaseStageAge", (age: number) => {
  state.settings.baseStageAge = age;
});

export const settingsXML = action("settingsXML", (xml: string) => {
  state.settingsXML = xml;
});
export const setOpenSnackbar = action("setOpenSnackbar", (show: boolean) => {
  state.openSnackbar = show;
});
export const setIsFullscreen = action("setIsFullscreen", (newval: boolean) => {
  state.isFullscreen = newval;
});
