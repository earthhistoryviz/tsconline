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
  assertSVGStatus,
  IndexResponse,
  assertDatapackAgeInfo,
  assertFacies,
  assertMapHierarchy,
  assertColumnInfo,
  assertMapInfo,
  DatapackAgeInfo,
  type FontsInfo,
} from "@tsconline/shared";
import { state, State } from "../state";
import { fetcher, devSafeUrl } from "../../util";
import { initializeColumnHashMap } from "./ColumnActions";
import { jsonToXml } from "../parseSettings";

/**
 * Resets any user defined settings
 */
export const resetSettings = action("resetSettings", () => {
  state.settings = {
    topStageAge: 0,
    topStageKey: "",
    baseStageAge: 0,
    baseStageKey: "",
    unitsPerMY: 2,
    useDatapackSuggestedAge: false,
  };
});

export const uploadDatapack = action("uploadDatapack", (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  fetcher("/upload", {
    method: "POST",
    body: formData,
  });
});
export const loadIndexResponse = action(
  "loadIndexResponse",
  (response: IndexResponse) => {
    state.mapPackIndex = response.mapPackIndex;
    state.datapackIndex = response.datapackIndex;
  }
);

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
    let facies: Facies = {
      locations: {},
      minAge: 0,
      maxAge: 0,
      aliases: {},
    };
    let datapackAgeInfo: DatapackAgeInfo = {
      useDatapackSuggestedAge: false,
    };
    let mapInfo: MapInfo = {};
    let mapHierarchy: MapHierarchy = {};
    let columnInfo: ColumnInfo;
    let fontsInfo: FontsInfo = {
      "Age Label": {
        bold: false,
        color: "",
        fontFace: "Arial",
        inheritable: false,
        italic: false,
        size: 6,
      },
      "Column Header": {
        bold: false,
        color: "#000000",
        fontFace: "Arial",
        inheritable: false,
        italic: false,
        size: 14,
      },
      "Event Column Label": {
        bold: false,
        color: "#000000",
        fontFace: "Arial",
        inheritable: false,
        italic: false,
        size: 11,
      },
      "Legend Column Name": { inheritable: false },
      "Legend Column Source": { inheritable: false },
      "Legend Title": { inheritable: false },
      "Point Column Scale Label": { inheritable: false },
      "Popup Body": { inheritable: false },
      "Range Box Label": { inheritable: false },
      "Range Label": {
        bold: false,
        color: "#000000",
        fontFace: "Arial",
        inheritable: false,
        italic: false,
        size: 12,
      },
      "Ruler Label": { inheritable: false },
      "Ruler Tick Mark Label": { inheritable: false },
      "Sequence Column Label": { inheritable: false },
      "Uncertainty Label": {
        bold: false,
        color: "#000000",
        fontFace: "Arial",
        inheritable: false,
        italic: false,
        size: 5,
      },
      "Zone Column Label": {
        bold: false,
        color: "#000000",
        fontFace: "Arial",
        inheritable: false,
        italic: false,
        size: 12,
      },
    };
    try {
      // the default overarching variable for the columnInfo
      columnInfo = {
        name: "Root", // if you change this, change parse-datapacks.ts :69
        editName: "Chart Title",
        fontsInfo: fontsInfo,
        info: "",
        on: true,
        children: [
          {
            name: "Ma",
            editName: "Ma",
            fontsInfo: fontsInfo,
            on: true,
            info: "",
            children: [],
            parent: "Root", // if you change this, change parse-datapacks.ts :69
          },
        ],
        parent: null,
      };
      // add everything together
      // uses preparsed data on server start and appends items together
      for (const datapack of datapacks) {
        if (
          !datapack ||
          !state.datapackIndex[datapack] ||
          !state.mapPackIndex[datapack]
        )
          throw new Error(
            `File requested doesn't exist on server: ${datapack}`
          );
        const datapackParsingPack = state.datapackIndex[datapack]!;
        // concat the children array of root to the array created in preparsed array
        // we can't do Object.assign here because it will overwrite the array rather than concat it
        columnInfo.children = columnInfo.children.concat(
          datapackParsingPack.columnInfoArray
        );
        // concat all facies
        if (!facies) facies = datapackParsingPack.facies;
        // TODO: correctly fix this so that facies are not replacing max/min on multiple datapacks
        else Object.assign(facies, datapackParsingPack.facies);
        // concat datapackAgeInfo objects together
        if (!datapackAgeInfo)
          datapackAgeInfo = datapackParsingPack.datapackAgeInfo;
        else
          Object.assign(datapackAgeInfo, datapackParsingPack.datapackAgeInfo);

        const mapPack = state.mapPackIndex[datapack]!;
        if (!mapInfo) mapInfo = mapPack.mapInfo;
        else Object.assign(mapInfo, mapPack.mapInfo);
        if (!mapHierarchy) mapHierarchy = mapPack.mapHierarchy;
        else Object.assign(mapHierarchy, mapPack.mapHierarchy);
      }
      assertFacies(facies);
      assertDatapackAgeInfo(datapackAgeInfo);
      assertMapHierarchy(mapHierarchy);
      assertColumnInfo(columnInfo);
      assertMapInfo(mapInfo);
    } catch (e) {
      displayError(e, null, `Error occured while changing datapack information on the website: ${e} with datapacks ${datapacks}`)
      return false;
    }
    state.mapState.facies = facies;
    state.settings.useDatapackSuggestedAge =
      datapackAgeInfo.useDatapackSuggestedAge;
    state.mapState.mapHierarchy = mapHierarchy;
    state.settingsTabs.columns = columnInfo;
    state.mapState.mapInfo = mapInfo;
    state.config.datapacks = datapacks;
    state.config.settingsPath = settingsPath;
    initializeColumnHashMap(columnInfo);
    await fetcher(`/mapimages/${datapacks.join(":")}`, {
      method: "POST",
    });
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
        displayError(e, await res.json(), "Error fetching settings from server")
        return false
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
    displayError(e, response, "Server could not remove cache")
    return
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
  setChartMade(true);
  setChartLoading(true);
  setChartHash("");
  setChartPath("");
  //let xmlSettings = jsonToXml(state.settingsJSON); // Convert JSON to XML using jsonToXml function
  // console.log("XML Settings:", xmlSettings); // Log the XML settings to the console
  let xmlSettings = jsonToXml(state.settingsJSON, state.settingsTabs.columns);
  const body = JSON.stringify({
    settings: xmlSettings,
    datapacks: state.config.datapacks,
  });
  console.log("Sending settings to server...");
  const response = await fetcher(
    `/charts/${state.useCache}/${state.settings.useDatapackSuggestedAge}`,
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
    setOpenSnackbar(true);
  } catch (e: any) {
    displayError(e, answer, "Failed to fetch chart")
    return
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
 * Display error to dialog popup
 * @param error the error thrown
 * @param response the response from the server if applicable (nullable)
 * @param message the message to be shown
 */
function displayError(error: any, response: any, message: string) {
  if (!response) {
    setError(true, message)
  } else if (isServerResponseError(response)) {
    console.log(`${message} with server response: ${response.error}`);
    setError(true, response.error)
  } else {
    console.log(`${message} with server response: ${response}\n Error: ${error}`)
    setError(true, message)
  }
}

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
  try {
    while (!SVGReady) {
      SVGReady = await fetchSVGStatus();
      if (!SVGReady) {
        // Wait for some time before checking again
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  } catch (e) {
    console.log(`Error fetching svg status: ${e}`)
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
    method: "GET",
  });
  const data = await response.json();
  try {
    assertSVGStatus(data);
  } catch (e) {
    displayError(e, data, `Could not fetch SVG status`)
    let msg = `Error fetching SVG status with error ${e}`;
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

export const setError = action("setError", (isError: boolean, text: string) => {
  state.error.errorState = isError
  state.error.errorText = text
})

export const setuseDatapackSuggestedAge = action((isChecked: boolean) => {
  state.settings.useDatapackSuggestedAge = isChecked;
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

export const setChartMade = action((value: boolean) => {
  state.madeChart = value;
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
export const setTopStageAge = action("setTopStageAge", (age: number) => {
  state.settings.topStageAge = age;
});
export const setBaseStageAge = action("setBaseStageAge", (age: number) => {
  state.settings.baseStageAge = age;
});

export const settingsXML = action("settingsXML", (xml: string) => {
  state.settingsXML = xml;
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
export const setOpenSnackbar = action("setOpenSnackbar", (show: boolean) => {
  state.openSnackbar = show;
});
