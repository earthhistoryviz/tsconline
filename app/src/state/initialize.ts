import { actions } from "./index";

export async function initialize() {
  // If we're running in dev mode (yarn dev), then the app is not served from the same URL
  // as the server hosts the /charts endpoint.  So, we'll hard-code that for ourselves here.
  actions.sessionCheck();
  //await actions.fetchDatapackInfo();
  actions.fetchPresets();
  // await actions.setDatapackConfig([], "");
  // await actions.fetchFaciesPatterns();
  // await actions.fetchTimescaleDataAction();
}
