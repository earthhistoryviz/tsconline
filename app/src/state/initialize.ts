import { actions } from "./index";

export async function initialize() {
  // If we're running in dev mode (yarn dev), then the app is not served from the same URL
  // as the server hosts the /charts endpoint.  So, we'll hard-code that for ourselves here.
  actions.sessionCheck();
  actions.fetchAllPublicDatapacks();
  actions.fetchPresets();
  await actions.processDatapackConfig([]);
  actions.fetchFaciesPatterns();
  actions.fetchTimescaleDataAction();
}
