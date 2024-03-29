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

export const handlePopupResponse = action("handlePopupResponse", (response: boolean, navigate: NavigateFunction) => {
  if (state.settings.useDatapackSuggestedAge != response) {
    state.settings.useDatapackSuggestedAge = response;
    generalActions.setUseCache(false);
  }
  fetchChartFromServer(navigate);
});

// Shows the user a popup before chart generation if there are age spans on the datapack
export const initiateChartGeneration = action("initiateChartGeneration", (navigate: NavigateFunction) => {
  if (state.settings.datapackContainsSuggAge) {
    state.showSuggestedAgePopup = true;
  } else {
    fetchChartFromServer(navigate);
  }
});

export const fetchChartFromServer = action("fetchChartFromServer", async (navigate: NavigateFunction) => {
  state.showSuggestedAgePopup = false;
  navigate("/chart");
  //set the loading screen and make sure the chart isn't up
  generalActions.setTab(1);
  generalActions.setChartMade(true);
  generalActions.setChartLoading(true);
  generalActions.setChartHash("");
  generalActions.setChartContent("");
  //let xmlSettings = jsonToXml(state.settingsJSON); // Convert JSON to XML using jsonToXml function
  // console.log("XML Settings:", xmlSettings); // Log the XML settings to the console
  const columnCopy: ColumnInfo = JSON.parse(JSON.stringify(state.settingsTabs.columns));
  changeFaciesColumn(columnCopy);
  const xmlSettings = jsonToXml(state.settingsTSC, columnCopy, state.settings);
  const body = JSON.stringify({
    settings: xmlSettings,
    datapacks: state.config.datapacks
  });
  console.log("Sending settings to server...");
  try {
    const response = await fetcher(`/charts/${state.useCache}/${state.settings.useDatapackSuggestedAge}`, {
      method: "POST",
      body
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
      generalActions.setOpenSnackbar(true);
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
function changeFaciesColumn(column: ColumnInfo) {
  if (column.name === `${column.parent} Facies Label`) {
    column.name = "Facies Label";
  } else if (column.name === `${column.parent} Series Label`) {
    column.name = "Series Label";
  } else if (column.name === `${column.parent} Members`) {
    column.name = "Members";
  } else if (column.name === `${column.parent} Facies`) {
    column.name = "Facies";
  }
  for (const child of column.children) {
    changeFaciesColumn(child);
  }
}
