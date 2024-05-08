import * as generalActions from "./general-actions";
import { displayServerError } from "./util-actions";
import { state } from "../state";
import { action } from "mobx";
import { fetcher } from "../../util";
import { ColumnInfo, assertChartInfo } from "@tsconline/shared";
import { jsonToXml } from "../parse-settings";
import { NavigateFunction } from "react-router";
import { ErrorCodes, ErrorMessages } from "../../util/error-codes";
import DOMPurify from "dompurify";
import { pushSnackbar } from "./general-actions";
import { ChartSettings } from "../../types";
import { cloneDeep } from "lodash";

export const handlePopupResponse = action("handlePopupResponse", (response: boolean, navigate: NavigateFunction) => {
  if (state.settings.useDatapackSuggestedAge != response) {
    state.settings.useDatapackSuggestedAge = response;
    generalActions.setUseCache(false);
  }
  if (response) setDatapackTimeDefaults();
  fetchChartFromServer(navigate);
});

type UnitValues = {
  topStageAge: number;
  baseStageAge: number;
  verticalScale: number;
};

function setDatapackTimeDefaults() {
  const unitMap = new Map<string, UnitValues>();

  // combine the datapacks and the min and max ages for their respective units
  // (can't just min or max the time settings immediately, since we have to set it on top of the user settings)
  for (const datapack of state.config.datapacks) {
    const pack = state.datapackIndex[datapack];
    const timeSettings = state.settings.timeSettings[pack.ageUnits];
    if (!timeSettings) continue;
    if (!unitMap.has(pack.ageUnits)) {
      unitMap.set(pack.ageUnits, {
        topStageAge: Number.MAX_SAFE_INTEGER,
        baseStageAge: Number.MIN_SAFE_INTEGER,
        verticalScale: Number.MIN_SAFE_INTEGER
      });
    }
    const unitValues = unitMap.get(pack.ageUnits)!;
    if ((pack.topAge || pack.topAge === 0) && (pack.baseAge || pack.baseAge === 0)) {
      unitValues.topStageAge = Math.min(unitValues.topStageAge, pack.topAge);
      unitValues.baseStageAge = Math.max(unitValues.baseStageAge, pack.baseAge);
    }
    if (pack.verticalScale) unitValues.verticalScale = Math.max(unitValues.verticalScale, pack.verticalScale);
  }

  // apply the combined values to the settings
  for (const [unit, values] of unitMap) {
    if (values.topStageAge !== Number.MAX_SAFE_INTEGER && values.baseStageAge !== Number.MIN_SAFE_INTEGER) {
      generalActions.setBaseStageAge(values.baseStageAge, unit);
      generalActions.setTopStageAge(values.topStageAge, unit);
    }
    if (values.verticalScale !== Number.MIN_SAFE_INTEGER) {
      generalActions.setUnitsPerMY(values.verticalScale, unit);
    }
  }
}

// Shows the user a popup before chart generation if there are age spans on the datapack
// only pops up if they are in the configure datapacks page, or not in the settings page
export const initiateChartGeneration = action(
  "initiateChartGeneration",
  (navigate: NavigateFunction, location: string) => {
    if (
      state.settings.datapackContainsSuggAge &&
      ((location === "/settings" && state.settingsTabs.selected === "datapacks") || location !== "/settings")
    ) {
      state.showSuggestedAgePopup = true;
    } else {
      fetchChartFromServer(navigate);
    }
  }
);

function areSettingsValidForGeneration() {
  if (!state.config.datapacks || state.config.datapacks.length === 0 || !state.settingsTabs.columns) {
    generalActions.pushError(ErrorCodes.NO_DATAPACKS_SELECTED);
    return false;
  }
  generalActions.removeError(ErrorCodes.NO_DATAPACKS_SELECTED);
  if (
    Object.keys(state.settings.timeSettings).every(
      (key) => state.settings.timeSettings[key].baseStageAge === state.settings.timeSettings[key].topStageAge
    )
  ) {
    generalActions.pushError(ErrorCodes.UNIT_RANGE_EMPTY);
    return false;
  }
  generalActions.removeError(ErrorCodes.UNIT_RANGE_EMPTY);
  if (!state.settingsTabs.columns.children.some((column) => column.on)) {
    generalActions.pushError(ErrorCodes.NO_COLUMNS_SELECTED);
    return false;
  }
  generalActions.removeError(ErrorCodes.NO_COLUMNS_SELECTED);
  return true;
}

export const fetchChartFromServer = action("fetchChartFromServer", async (navigate: NavigateFunction) => {
  // asserts column is not null
  if (!areSettingsValidForGeneration()) return;
  state.showSuggestedAgePopup = false;
  navigate("/chart");
  //set the loading screen and make sure the chart isn't up
  savePreviousSettings();
  generalActions.setTab(1);
  generalActions.setChartMade(true);
  generalActions.setChartLoading(true);
  generalActions.setChartHash("");
  generalActions.setChartContent("");
  let body;
  try {
    normalizeColumnProperties(state.settingsTabs.columns!);
    const columnCopy: ColumnInfo = cloneDeep(state.settingsTabs.columns!);
    changeManuallyAddedColumns(columnCopy);
    const chartSettingsCopy: ChartSettings = JSON.parse(JSON.stringify(state.settings));
    const xmlSettings = jsonToXml(columnCopy, chartSettingsCopy);
    body = JSON.stringify({
      settings: xmlSettings,
      datapacks: state.config.datapacks,
      username: "username",
      useCache: state.useCache,
      useSuggestedAge: state.settings.useDatapackSuggestedAge
    });
  } catch (e) {
    console.error(e);
    generalActions.pushError(ErrorCodes.INVALID_DATAPACK_CONFIG);
    return;
  }
  console.log("Sending settings to server...");
  try {
    const response = await fetcher(`/charts/${state.useCache}/${state.settings.useDatapackSuggestedAge}/username`, {
      method: "POST",
      body,
      credentials: "include"
    });
    const answer = await response.json();
    // will check if svg is loaded
    try {
      assertChartInfo(answer);
      generalActions.setChartHash(answer.hash);
      await generalActions.checkSVGStatus();
      const content = await (await fetcher(answer.chartpath)).text();
      const domPurifyConfig = {
        ADD_ATTR: ["docbase", "popuptext"],
        ADD_URI_SAFE_ATTR: ["docbase", "popuptext"]
      };
      const sanitizedSVG = DOMPurify.sanitize(content, domPurifyConfig);
      generalActions.setChartContent(sanitizedSVG);
      generalActions.pushSnackbar("Successfully generated chart", "success"); //manually changed after new implementation of snackbar
    } catch (e) {
      displayServerError(answer, ErrorCodes.INVALID_CHART_RESPONSE, ErrorMessages[ErrorCodes.INVALID_CHART_RESPONSE]);
      return;
    }
  } catch (e) {
    console.error(e);
    displayServerError(null, ErrorCodes.SERVER_RESPONSE_ERROR, ErrorMessages[ErrorCodes.SERVER_RESPONSE_ERROR]);
  }
});

/**
 * Since we hash by name only to allow consistency between facies maps and
 * the column page, a generic like Facies Label will cause errors.
 * The solution @Paolo came up with is to prepend the name of the parent
 * and change before the conversion to xml. The downside is we must check
 * every ColumnInfo object which may cause problems with time consistency.
 * However, this is asyncronous, which makes it less likely to cause problems.
 * @param column
 */
const changeManuallyAddedColumns = action((column: ColumnInfo) => {
  const parent = column.parent && state.settingsTabs.columnHashMap.get(column.parent);
  if (parent && parent.columnDisplayType === "BlockSeriesMetaColumn") {
    if (column.name === `${column.parent} Facies Label`) {
      column.name = "Facies Label";
    } else if (column.name === `${column.parent} Series Label`) {
      column.name = "Series Label";
    } else if (column.name === `${column.parent} Members`) {
      column.name = "Members";
    } else if (column.name === `${column.parent} Facies`) {
      column.name = "Facies";
    } else if (column.name === `${column.parent} Chron`) {
      column.name = "Chron";
    } else if (column.name === `${column.parent} Chron Label`) {
      column.name = "Chron Label";
    }
  }
  if (column.columnDisplayType === "RootColumn" && column.name.substring(0, 14) === "Chart Title in") {
    column.name = column.name.substring(15, column.name.length);
  }
  for (const child of column.children) {
    changeManuallyAddedColumns(child);
  }
});

const normalizeColumnProperties = action((column: ColumnInfo) => {
  if (column.width !== undefined && (isNaN(column.width) || column.width < 20)) {
    column.width = 20;
    let name = column.name.substring(0, 17);
    if (name.length < column.name.length) name += "...";
    pushSnackbar("Invalid width input found, updating " + name + " width to 20", "warning");
  }
  for (const child of column.children) {
    normalizeColumnProperties(child);
  }
});

const savePreviousSettings = action("savePreviousSettings", () => {
  state.prevSettings = JSON.parse(JSON.stringify(state.settings));
  state.prevConfig = JSON.parse(JSON.stringify(state.config));
});
