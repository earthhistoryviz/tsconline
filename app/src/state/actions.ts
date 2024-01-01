import { action, runInAction } from "mobx";
import {
  type ChartConfig,
  type Maps,
  assertChartInfo,
  isChartError,
} from "@tsconline/shared";
import { state, State } from "./state";
import { fetcher, devSafeUrl } from "../util";
import { xmlToJson, jsonToXml } from "./settingsParser";
import { ColumnSetting, GeologicalStages } from "@tsconline/shared";
import { ConstructionOutlined } from "@mui/icons-material";

export const setTab = action("setTab", (newval: number) => {
  state.tab = newval;
});
export const setMapImages = action("setMapImages", (mapImages: string[]) => {
  state.settingsTabs.mapImages = mapImages;
});

export const resetSettings = action("resetSettings", () => {
  state.settings = {
    topStageKey: "",
    baseStageKey: "",
    unitsPerMY: 2
  }
});

export const setChart = action("setChart", async (newval: number) => {
  resetSettings()
  if (state.presets.length <= newval) {
    state.chart = null;
    console.log("unknown preset selected")
    return;
  }
  let tempColumns: ColumnSetting | null;
  state.chart = state.presets[newval]!;
  //process decrypted file
  const datapacks = state.presets[newval]!.datapacks.map(data => data.split(".")[0] + ".txt")
  const res = await fetcher(`/datapackinfo/${datapacks.join(" ")}`, {
    method: "GET"
  })
  const {columns, image_paths, maps} = await res.json()
  // console.log("reply of columns: ", JSON.stringify(columns, null, 2))
  // console.log("reply of stages: ", JSON.stringify(stages, null, 2))

  setSettingsTabsColumns(columns)
  setMapImages(image_paths)
  setMaps(maps)
  console.log(state.settingsTabs.maps)
  // Grab the settings for this chart if there are any:
  if (state.chart.settings) {
    console.log(state.chart.settings);
    const response = await fetcher(state.chart.settings);
    const xml = await response.text();
    if (typeof xml === "string" && xml.match(/<TSCreator/)) {
      // Call the xmlToJsonParser function here
      const jsonSettings = xmlToJson(xml);
      runInAction(() => (state.settingsJSON = jsonSettings)); // Save the parsed JSON to the state.settingsJSON

      //start of column parser to display in app
      // console.log("Parsed JSON Object:\n", jsonSettings);
      let temp =
        jsonSettings["class datastore.RootColumn:Chart Root"][
          "class datastore.RootColumn:Chart Title"
        ];
    } else {
      console.log(
        "WARNING: grabbed settings from server at url: ",
        devSafeUrl(state.chart.settings),
        ", but it was either not a string or did not have a <TSCreator tag in it"
      );
      console.log("The returned settingsXML was: ", xml);
    }
  }
});


/**
 * Sets the geological top stages and the base stages
 */
export const setGeologicalStages = action("setGeologicalStages", (stages: GeologicalStages) => {
  let top = stages['TOP']
  let geologicalTopStages: GeologicalStages = {"Present": 0}
  Object.keys(stages).map((key) => {
    geologicalTopStages[key] = top 
    top = stages[key]
  })
  delete stages['TOP']
  delete geologicalTopStages['TOP']
  state.settingsTabs.geologicalTopStages = geologicalTopStages 
  state.settingsTabs.geologicalBaseStages = stages
});

export const setAllTabs = action("setAllTabs", (newval: boolean) => {
  state.showAllTabs = newval;
});
export const removeCache = action("removeCache", async () => {
  await fetcher(`/removecache`, {
    method: "POST",
  });
})

export const generateChart = action("generateChart", async () => {
  //set the loading screen and make sure the chart isn't up
  setChartLoading(true)
  setChartHash("")
  setChartPath("")
  let xmlSettings = jsonToXml(state.settingsJSON); // Convert JSON to XML using jsonToXml function
  // console.log("XML Settings:", xmlSettings); // Log the XML settings to the console
  var datapacks: string[] = [];
  if (state.chart != null) {
    datapacks = state.chart.datapacks;
  }
  const body = JSON.stringify({
    settings: xmlSettings,
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
    await checkPdfStatus()
  } catch (e: any) {
    if (isChartError(answer)) {
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
export const setMaps = action("setMaps", (maps: Maps) => {
  state.settingsTabs.maps = maps;
});
export const setSettingsTabsColumns = action("setSettingsTabsColumns", (columns: ColumnSetting) => {
  state.settingsTabs.columns = columns;
});
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
  console.log(jsonSettings);
  const xmlSettings = jsonToXml(jsonSettings); // Convert JSON to XML using jsonToXml function

  console.log("Updated settingsXML:\n", xmlSettings); // Print the updated XML

  state.settingsXML = xmlSettings;
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

export const setSettingTabsSelected = action(
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
export const toggleSettingsTabColumn = action("toggleSettingsTabColumn", (name: string, parents: string[]) => {
    let curcol: ColumnSetting | null = state.settingsTabs.columns;
    const orig = curcol
    // Walk down the path of parents in the tree of columns
    console.log("name: ", name)
    let i = 1
    for (const item of parents) {
      console.log("item ", i, ": ", item);
      i++
    }
    i = 1
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
    console.log(JSON.stringify(curcol[name], null, 2));
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

export const setSettingsColumns = action((temp: ColumnSetting) => {
  state.settingsTabs.columns = temp;
});
export const setUseCache = action((temp: boolean) => {
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
  let curcol: ColumnSetting | null = state.settingsTabs.columns;
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
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  setChartLoading(false);
});

async function fetchPdfStatus(): Promise<boolean>{
  try {
    if (state.chartHash === "") {
      return false
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