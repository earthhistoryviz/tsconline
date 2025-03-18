import { actions } from "./index";

export async function initialize() {
  // If we're running in dev mode (yarn dev), then the app is not served from the same URL
  // as the server hosts the /charts endpoint.  So, we'll hard-code that for ourselves here.
  try {
    actions.setInitializingApp(true);
    actions.sessionCheck();
    actions.fetchAllPublicDatapacksMetadata();
    actions.fetchPresets();
    const datapack = await actions.fetchDatapack({
      title: "TimeScale Creator Internal Datapack",
      type: "official",
      isPublic: true
    });
    if (datapack) {
      actions.addDatapack(datapack);
      await actions.processDatapackConfig([datapack]);
    } else {
      await actions.processDatapackConfig([]);
    }
    actions.fetchFaciesPatterns();
    actions.fetchTimescaleDataAction();
  } finally {
    actions.setInitializingApp(false);
  }
}
