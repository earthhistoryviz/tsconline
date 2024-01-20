import { action, runInAction } from "mobx";
import {
  type ChartConfig,
  type MapInfo,
  type ColumnInfo,
  type MapHierarchy,
  type GeologicalStages,
  type SuccessfulServerResponse,
  assertChartInfo,
  assertMapInfo,
  assertColumnInfo,
  assertMapHierarchy,
  assertSuccessfulServerResponse,
  isServerResponseError,
} from "@tsconline/shared";
import { state, State } from "./state";
import { fetcher, devSafeUrl } from "../util";
import { ConstructionOutlined } from "@mui/icons-material";

export const setTab = action("setTab", (newval: number) => {
  state.tab = newval;
});

export const resetSettings = action("resetSettings", () => {
  state.settings = {
    topStageKey: "",
    baseStageKey: "",
    unitsPerMY: 2,
  };
});

export const setChart = action(
  "setChart",
  async (newval: number): Promise<boolean> => {
    resetSettings();
    //set the settings tab back to time
    setSettingsTabsSelected(0);
    if (state.presets.length <= newval) {
      state.chart = null;
      console.log("unknown preset selected");
      return false;
    }
    state.chart = state.presets[newval]!;
    //process decrypted file
    const datapacks = state.presets[newval]!.datapacks.map(
      (data) => data.split(".")[0] + ".txt"
    );
    const res = await fetcher(`/datapackinfo/${datapacks.join(" ")}`, {
      method: "GET",
    });
    // get the columns and map info
    const reply = await res.json();
    // console.log("reply of mapInfo: ", JSON.stringify(reply.mapInfo, null, 2))
    try {
      assertMapInfo(reply.mapInfo);
      assertColumnInfo(reply.columnInfo);
      assertMapHierarchy(reply.mapHierarchy);
      setMapInfo(reply.mapInfo);
      setSettingsColumns(reply.columnInfo);
      setMapHierarchy(reply.mapHierarchy)
  } catch (e) {
      if (isServerResponseError(reply)) {
        console.log(
          "Server failed to send datapack info with error: ",
          reply.error
        );
      } else {
        console.log("Failed to fetch datapack info with error: ", e);
      }
      resetState();
      return false;
    }

    // Grab the settings for this chart if there are any:
    if (state.chart.settings) {
      const settingsName = state.chart.settings.split("/")[3];
      const res = await fetcher(`/settingsJson/${settingsName}`, {
        method: "GET",
      });
      const settingsJson = JSON.parse(await res.text());
      console.log("recieved settings JSON object at set Chart", settingsJson);
      runInAction(() => (state.settingsJSON = settingsJson)); // Save the parsed JSON to the state.settingsJSON
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

export const setAllTabs = action("setAllTabs", (newval: boolean) => {
  state.showAllTabs = newval;
});
export const setShowPresetInfo = action(
  "setShowPresetInfo",
  (newval: boolean) => {
    state.showPresetInfo = newval;
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
 */
export const resetState = action("resetState", () => {
  setChartLoading(true);
  setChart(0);
  setChartHash("");
  setChartPath("");
  setAllTabs(false);
  setUseCache(true);
  setUsePreset(true);
  setTab(0);
  setShowPresetInfo(false);
  setSettingsTabsSelected("time");
  setSettingsColumns({});
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
  var datapacks: string[] = [];
  if (state.chart != null) {
    datapacks = state.chart.datapacks;
  }
  const body = JSON.stringify({
    settings: JSON.stringify(state.settingsJSON),
    columnSettings: JSON.stringify(state.settingsTabs.columns),
    datapacks: datapacks,
  });
  console.log("Sending settings to server...");
  const response = await fetcher(`/charts/${state.useCache}`, {
    method: "POST",
    body,
  });
  const answer = await response.json();
  // will check if pdf is loaded
  try {
    assertChartInfo(answer);
    setChartHash(answer.hash);
    setChartPath(devSafeUrl(answer.chartpath));
    await checkPdfStatus();
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

export const loadPresets = action("loadPresets", (presets: ChartConfig[]) => {
  state.presets = presets;
  setChart(0);
});
export const setChartPath = action("setChartPath", (chartpath: string) => {
  state.chartPath = chartpath;
});
export const setMapInfo = action("setMapInfo", (mapInfo: MapInfo) => {
  state.settingsTabs.mapInfo = mapInfo;
});
export const setMapHierarchy = action(
  "setMapHierarchy",
  (mapHierarchy: MapHierarchy) => {
    state.settingsTabs.mapHierarchy = mapHierarchy;
  }
);
export const setChartHash = action("setChartHash", (charthash: string) => {
  state.chartHash = charthash;
});

export const settingsXML = action("settingsXML", (xml: string) => {
  state.settingsXML = xml;
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
  if ("settings" in jsonSettings) {
    const settings = jsonSettings.settings as any;
    settings["topAge"]["stage"] = state.settingsTabs.columns[topStageKey];
    settings["baseAge"]["stage"] = state.settingsTabs.columns[baseStageKey];
    settings["unitsPerMY"] = (unitsPerMY * 30).toString();
  }
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
/*
 * toggles the "on" state for a column that had its checkbox clicked
 * name: the name of the toggled column
 * parents: list of names that indicates the path from top to the toggled column
 */
export const toggleSettingsTabColumn = action(
  "toggleSettingsTabColumn",
  (name: string, parents: string[]) => {
    let curcol: ColumnInfo | null = state.settingsTabs.columns;
    const orig = curcol;
    // Walk down the path of parents in the tree of columns
    console.log("name: ", name)
    let i = 1
    for (const item of parents) {
      console.log("item ", i, ": ", item);
      i++
    }
    i = 1;
    for (const p of parents) {
      console.log("accessing ", p, " of count: ", i)
      i++
      if (!curcol) {
        console.log(
          "WARNING: tried to access path at parent ",
          p,
          " from path ",
          parents,
          " in settings tabs column list, but children was null at this level."
        );
        return;
      }
      curcol = curcol[p]["children"];
    }
    // console.log(JSON.stringify(curcol[name], null, 2));
    //need this to check if curcol is null for typescript to be happy in future operations
    if (!curcol) {
      console.log(
        "WARNING: tried to access path at ",
        name,
        "settings tabs column list, but children was null at this level."
      );
      return;
    }
    if (!curcol[name]) {
      console.log(
        "WARNING: tried to access name ",
        name,
        " from path ",
        parents,
        " in settings tabs column list, but object[name] was null here."
      );
      return;
    }
    curcol[name].on = !curcol[name].on;
    // setSettingsTabsColumns(orig)
    // console.log(JSON.stringify(curcol[name], null, 2));
    setcolumnSelected(name, parents);
    // console.log("state after my change: ", state);
    //if the column is unchecked, then no need to check the parents
    if (!curcol[name].on) {
      //updateSettings();
      return;
    }
    //since column is checked, toggle parents on if they were previously off
    curcol = state.settingsTabs.columns;
    for (const p of parents) {
      if (!curcol) {
        console.log(
          "WARNING: tried to access path at parent ",
          p,
          " from path ",
          parents,
          " in settings tabs column list, but children was null at this level."
        );
        return;
      }
      if (!curcol[p].on) curcol[p].on = true;
      curcol = curcol[p]["children"];
    }
    //updateSettings();
  }
);

export const setSettingsColumns = action((temp: ColumnInfo) => {
  state.settingsTabs.columns = temp;
});
export const setUseCache = action((temp: boolean) => {
  state.useCache = temp;
});
export const setUsePreset = action((temp: boolean) => {
  state.useCache = temp;
});

export const setcolumnSelected = action((name: string, parents: string[]) => {
  state.settingsTabs.columnSelected = { name, parents };
});

export const updateColumnName = action((newName: string) => {
  if (!state.settingsTabs.columnSelected) {
    console.log("WARNING: the user hasn't selected a column.");
    return;
  }
  let curcol: ColumnInfo | null = state.settingsTabs.columns;
  let oldName = state.settingsTabs.columnSelected.name;
  let parents = state.settingsTabs.columnSelected.parents;
  // Walk down the path of parents in the tree of columns
  for (const p of parents) {
    if (!curcol) {
      console.log(
        "WARNING: tried to access path at parent ",
        p,
        " from path ",
        parents,
        " in settings tabs column list, but children was null at this level."
      );
      return;
    }
    curcol = curcol[p]["children"];
  }
  if (!curcol) {
    console.log(
      "WARNING: tried to access path at ",
      oldName,
      "settings tabs column list, but children was null at this level."
    );
    return;
  }
  if (!curcol[oldName]) {
    console.log(
      "WARNING: tried to access name ",
      oldName,
      " from path ",
      parents,
      " in settings tabs column list, but object[name] was null here."
    );
    return;
  }
  curcol[newName] = curcol[oldName];
  delete curcol[oldName];
});
export const checkPdfStatus = action(async () => {
  let pdfReady = false;
  while (!pdfReady) {
    pdfReady = await fetchPdfStatus();
    if (!pdfReady) {
      // Wait for some time before checking again
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
  setChartLoading(false);
});

async function fetchPdfStatus(): Promise<boolean> {
  try {
    if (state.chartHash === "") {
      return false;
    }
    const response = await fetcher(`/pdfstatus/${state.chartHash}`, {
      method: "GET",
    });
    const data = await response.json();
    return data.ready;
  } catch (error) {
    console.error("Error checking PDF status", error);
    return false;
  }
}
