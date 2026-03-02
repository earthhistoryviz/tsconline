import { actions } from "./index";
import { state } from "./state";
export async function initialize() {
  // If we're running in dev mode (yarn dev), then the app is not served from the same URL
  // as the server hosts the /charts endpoint.  So, we'll hard-code that for ourselves here.

  try {
    if (state.skipInitialization) {
      return;
    }
    await actions.sessionCheck();
    actions.fetchAllPublicDatapacksMetadata();
    actions.fetchPresets();
    actions.fetchFaciesPatterns();
    actions.fetchTimescaleDataAction();
    actions.fetchAllWorkshops();
  } finally {
    // Always mark initialization as complete, even on errors
    actions.setIsInitializing(false);
  }
}
