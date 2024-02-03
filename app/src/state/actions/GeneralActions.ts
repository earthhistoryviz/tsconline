import { action, runInAction } from "mobx";
import {
  type ChartConfig,
  type MapInfo,
  type ColumnInfo,
  type MapHierarchy,
  type Facies,
  type GeologicalStages,
  assertChartInfo,
  assertSuccessfulServerResponse,
  isServerResponseError,
  assertDatapackResponse,
  Presets,
} from "@tsconline/shared";
import { state, State } from "../state";
import { fetcher, devSafeUrl } from "../../util";
import { initializeColumnHashMap } from "./ColumnActions";

/**
 * Resets any user defined settings
 */
export const resetSettings = action("resetSettings", () => {
  state.settings = {
    topStageKey: "",
    baseStageKey: "",
    unitsPerMY: 2,
    useDefaultAge: false,
  };
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
    state.config.datapacks = datapacks;
    //process decrypted file
    const res = await fetcher(`/datapackinfo/${datapacks.join(":")}`, {
      method: "GET",
    });
    // get the columns and map info
    const reply = await res.json();
    // console.log("reply of mapInfo: ", JSON.stringify(reply.mapInfo, null, 2))
    try {
      assertDatapackResponse(reply);
      setMapInfo(reply.mapInfo);
      setSettingsColumns(reply.columnInfo);
      //fill in hashmap with column info for easier & faster access
      initializeColumnHashMap(state.settingsTabs.columns!);
      setFacies(reply.facies);
      setMapHierarchy(reply.mapHierarchy);
    } catch (e) {
      if (isServerResponseError(reply)) {
        console.log(
          "Server failed to send datapack info with error: ",
          reply.error
        );
      } else {
        console.log("Failed to fetch datapack info with error: ", e);
      }
      // THIS LOOPS FOREVER
      // resetState();
      return false;
    }
    state.config.settingsPath = settingsPath;
    // Grab the settings for this chart if there are any:
    if (settingsPath && settingsPath.length > 0) {
      const res = await fetcher(
        `/settingsJson/${encodeURIComponent(settingsPath)}`,
        {
          method: "GET",
        }
      );
      try {
        const settingsJson = JSON.parse(await res.text());
        console.log("recieved settings JSON object at set Chart", settingsJson);
        runInAction(() => (state.settingsJSON = settingsJson)); // Save the parsed JSON to the state.settingsJSON
      } catch (e) {
        if (isServerResponseError(await res.json())) {
          console.log(`Server error: ${e} while getting settings`);
        } else {
          console.log(`error fetching from server with error: ${e}`);
        }
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
export const setGeologicalStages = action(
  "setGeologicalStages",
  (stages: GeologicalStages) => {
    let top = stages["TOP"];
    let geologicalTopStages: GeologicalStages = { Present: 0 };
    Object.keys(stages).map((key) => {
      geologicalTopStages[key] = top;
      top = stages[key];
    });
    delete stages["TOP"];
    delete geologicalTopStages["TOP"];
    state.settingsTabs.geologicalTopStages = geologicalTopStages;
    state.settingsTabs.geologicalBaseStages = stages;
  }
);

/**
 * Removes cache in public dir on server
 */
export const removeCache = action("removeCache", async () => {
  const response = await fetcher(`/removecache`, {
    method: "POST",
  });
  // check if we successfully removed cache
  try {
    assertSuccessfulServerResponse(response);
    console.log(
      `Server successfully deleted cache with message: ${response.message}`
    );
  } catch (e) {
    if (isServerResponseError(response)) {
      console.log("Server could not remove cache with error: ", response.error);
    } else {
      console.log("Server responded with an unknown response with error: ", e);
    }
  }
});

/**
 * Resets state
 * Only implementation is used when we remove cache
 * If error from server, this is really bad. Will loop forever
 */
export const resetState = action("resetState", () => {
  setChartLoading(true);
  setDatapackConfig([], "");
  setChartHash("");
  setChartPath("");
  setAllTabs(false);
  setUseCache(true);
  setUsePreset(true);
  setTab(0);
  setShowPresetInfo(false);
  setSettingsTabsSelected("time");
  setSettingsColumns(null);
  setMapInfo({});
  state.settingsTabs.columnSelected = null;
  state.settingsXML = "";
  state.settingsJSON = {};
});

export const generateChart = action("generateChart", async () => {
  //set the loading screen and make sure the chart isn't up
  setTab(1);
  setAllTabs(true);
  setChartLoading(true);
  setChartHash("");
  setChartPath("");
  //let xmlSettings = jsonToXml(state.settingsJSON); // Convert JSON to XML using jsonToXml function
  // console.log("XML Settings:", xmlSettings); // Log the XML settings to the console
  const body = JSON.stringify({
    settings: JSON.stringify(state.settingsJSON),
    columnSettings: JSON.stringify(state.settingsTabs.columns),
    datapacks: state.config.datapacks,
  });
  console.log("Sending settings to server...");
  // console.log(state.settings.useDefaultAge);
  const response = await fetcher(
    `/charts/${state.useCache}/${state.settings.useDefaultAge}`,
    {
      method: "POST",
      body,
    }
  );
  const answer = await response.json();
  // will check if pdf is loaded
  try {
    assertChartInfo(answer);
    setChartHash(answer.hash);
    setChartPath(devSafeUrl(answer.chartpath));
    await checkSVGStatus();
    state.openSnackbar = true
  } catch (e: any) {
    if (isServerResponseError(answer)) {
      console.log(
        "ERROR failed to fetch chart with the settings.  Error response from server was: ",
        answer
      );
      return;
    }
    console.log(
      "ERROR: unknown error in fetching chart with settings.  Response from server was: ",
      answer,
      ", Error was: ",
      e
    );
    return;
  }
});

export const loadPresets = action("loadPresets", (presets: Presets) => {
  state.presets = presets;
  setDatapackConfig([], "");
});
//update
//TODO: need to overhaul
export const updateSettings = action("updateSettings", () => {
  const { topStageKey, baseStageKey, unitsPerMY } = state.settings;
  // Validate the user input
  if (isNaN(unitsPerMY)) {
    // Handle invalid input, show error message, etc.
    return;
  }
  state.settingsJSON["settingsTabs"] = state.settingsTabs;
  const jsonSettings = state.settingsJSON;
  // if ("settings" in jsonSettings) {
  //   const settings = jsonSettings.settings as any;
  //   settings["topAge"]["stage"] = state.settingsTabs.columns[topStageKey];
  //   settings["baseAge"]["stage"] = state.settingsTabs.columns[baseStageKey];
  //   settings["unitsPerMY"] = (unitsPerMY * 30).toString();
  // }
  if ("settingsTabs" in jsonSettings) {
    const settingsTabs = jsonSettings as any;
  }
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
    stateName: "enPriority",
  },
  {
    name: "enableChartLegend",
    label: "Enable chart legend",
    stateName: "enChartLegend",
  },
  {
    name: "hideBlockLabelsIfCrowded",
    label: "If crowded, hide block labels",
    stateName: "enHideBlockLable",
  },
  {
    name: "skipEmptyColumns",
    label: "Skip empty columns",
    stateName: "skipEmptyColumns",
  },
];

// Combined function to update the checkbox settings and individual action functions
export const updateCheckboxSetting = action(
  (stateName: string, checked: boolean) => {
    // Check if the stateName is a valid setting option
    const settingOption = settingOptions.find(
      (option) => option.stateName === stateName
    );
    if (!settingOption) return;

    // Update the checkbox setting in state.settings
    (state.settings as any)[stateName] = checked;

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
  }
);

/**
 * set the settings tab based on a string or number
 */
export const setSettingsTabsSelected = action(
  (newtab: number | State["settingsTabs"]["selected"]) => {
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
      default:
        console.log(
          "WARNING: setSettingTabsSelected: received index number that is unknown: ",
          newtab
        );
        state.settingsTabs.selected = "time";
    }
  }
);

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
  }
}

/**
 * Constantly ping the server for the pdf status
 * TODO DEPRECATE FOR SVGS
 */
export const checkSVGStatus = action(async () => {
  let SVGReady = false;
  while (!SVGReady) {
    SVGReady = await fetchSVGStatus();
    if (!SVGReady) {
      // Wait for some time before checking again
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
  setChartLoading(false);
});

/**
 * The request for pdf status
 * @returns
 */
async function fetchSVGStatus(): Promise<boolean> {
  try {
    if (state.chartHash === "") {
      return false;
    }
    const response = await fetcher(`/svgstatus/${state.chartHash}`, {
      method: "GET",
    });
    const data = await response.json();
    return data.ready;
  } catch (error) {
    console.error("Error checking SVG status", error);
    return false;
  }
}

export const handleCloseSnackbar = action((event: React.SyntheticEvent | Event, reason?: string) => {
  if (reason === 'clickaway') {
      return;
    }
  state.openSnackbar = false
});

export const setUseDefaultAge = action((isChecked: boolean) => {
  state.settings.useDefaultAge = isChecked;
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

export const setUnitsPerMY = action((units: number) => {
  state.settings.unitsPerMY = units;
});
export const setChartLoading = action((value: boolean) => {
  state.chartLoading = value;
});
export const setMapHierarchy = action(
  "setMapHierarchy",
  (mapHierarchy: MapHierarchy) => {
    state.mapState.mapHierarchy = mapHierarchy;
  }
);
export const setChartHash = action("setChartHash", (charthash: string) => {
  state.chartHash = charthash;
});

export const settingsXML = action("settingsXML", (xml: string) => {
  state.settingsXML = xml;
});
export const setAllTabs = action("setAllTabs", (newval: boolean) => {
  state.showAllTabs = newval;
});
export const setSelectedPreset = action(
  "setSelectedPreset",
  (newval: ChartConfig | null) => {
    state.selectedPreset = newval;
  }
);
const setFacies = action("setFacies", (newval: Facies) => {
  state.mapState.facies = newval;
});
export const setShowPresetInfo = action(
  "setShowPresetInfo",
  (newval: boolean) => {
    state.showPresetInfo = newval;
  }
);
