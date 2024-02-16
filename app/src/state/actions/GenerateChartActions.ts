import * as generalActions from "./GeneralActions.ts";
import { state } from "../state";
import { action } from "mobx";
import { fetcher, devSafeUrl } from "../../util";
import { isServerResponseError, assertChartInfo } from "@tsconline/shared";

export const handlePopupResponse = action("handlePopupResponse", (response: boolean, navigate) => {
  console.log(response);
  if (state.useSuggestedAge != response) {
    state.useSuggestedAge = response;
    console.log(state.useSuggestedAge);
    generalActions.setUseCache(false);
  }
  state.showSuggestedAgePopup = false;
  fetchChartFromServer();
  navigate("/chart");
});

export const handleCloseDialog = (navigate) => {
  state.showSuggestedAgePopup = false;
  fetchChartFromServer();
  navigate("/chart");
};

// Shows the user a popup before chart generation if there are age spans on the datapack
export const initiateChartGeneration = action("initiateChartGeneration", (navigate) => {
  if (state.settings.datapackContainsSuggAge) {
    state.showSuggestedAgePopup = true;
  } else {
    fetchChartFromServer();
    navigate("/chart");
  }
});

export const fetchChartFromServer = action("fetchChartFromServer", async () => {
  //set the loading screen and make sure the chart isn't up
  generalActions.setTab(1);
  generalActions.setChartMade(true);
  generalActions.setChartLoading(true);
  generalActions.setChartHash("");
  generalActions.setChartPath("");
  //let xmlSettings = jsonToXml(state.settingsJSON); // Convert JSON to XML using jsonToXml function
  // console.log("XML Settings:", xmlSettings); // Log the XML settings to the console
  let xmlSettings = jsonToXml(state.settingsJSON, state.settingsTabs.columns);
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
  } catch (e: any) {
    displayError(e, answer, "Failed to fetch chart")
    return
  }
});