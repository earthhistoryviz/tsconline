import * as generalActions from "./GeneralActions";
import { displayError } from "./UtilActions"
import { state } from "../state";
import { action } from "mobx";
import { fetcher, devSafeUrl } from "../../util";
import { assertChartInfo } from "@tsconline/shared";
import { jsonToXml } from "../parseSettings";
import { NavigateFunction } from "react-router";

export const handlePopupResponse = action("handlePopupResponse", (response: boolean, navigate: NavigateFunction) => {
  if (state.useSuggestedAge != response) {
    state.useSuggestedAge = response;
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
  generalActions.setChartPath("");
  //let xmlSettings = jsonToXml(state.settingsJSON); // Convert JSON to XML using jsonToXml function
  // console.log("XML Settings:", xmlSettings); // Log the XML settings to the console
  let xmlSettings = jsonToXml(state.settingsJSON, state.settingsTabs.columns, state.settings);
  const body = JSON.stringify({
    settings: xmlSettings,
    datapacks: state.config.datapacks,
  });
  console.log("Sending settings to server...");
  const response = await fetcher(
    `/charts/${state.useCache}/${state.useSuggestedAge}`,
    {
      method: "POST",
      body,
    }
  );
  const answer = await response.json();
  // will check if pdf is loaded
  try {
    assertChartInfo(answer);
    generalActions.setChartHash(answer.hash);
    generalActions.setChartPath(devSafeUrl(answer.chartpath));
    await generalActions.checkSVGStatus();
    generalActions.setOpenSnackbar(true)
  } catch (e) {
    displayError(e, answer, "Failed to fetch chart")
    return
  }
});