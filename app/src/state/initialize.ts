import { actions } from "./index";

export async function initialize() {
  // If we're running in dev mode (yarn dev), then the app is not served from the same URL
  // as the server hosts the /charts endpoint.  So, we'll hard-code that for ourselves here.

  try {
    actions.sessionCheck();
    actions.fetchAllPublicDatapacksMetadata();
    actions.fetchPresets();

    // Auto-load the TimeScale Creator Internal Datapack by default
    try {
      const internalDatapack = await actions.fetchDatapack({
        isPublic: true,
        title: "TimeScale Creator Internal Datapack",
        type: "official"
      });

      if (internalDatapack) {
        actions.addDatapack(internalDatapack);

        const internalDatapackConfig = {
          storedFileName: internalDatapack.storedFileName,
          title: internalDatapack.title,
          isPublic: internalDatapack.isPublic,
          type: "official" as const
        };

        // Set unsaved config BEFORE processing to prevent "unsaved changes" dialog
        actions.setUnsavedDatapackConfig([internalDatapackConfig]);
        await actions.processDatapackConfig([internalDatapackConfig], { silent: true });
        console.log("Auto-loaded TimeScale Creator Internal Datapack");
      } else {
        console.warn("TimeScale Creator Internal Datapack not found, loading with empty config");
        actions.setUnsavedDatapackConfig([]);
        await actions.processDatapackConfig([], { silent: true });
      }
    } catch (error) {
      console.error("Failed to load TimeScale Creator Internal Datapack:", error);
      actions.setUnsavedDatapackConfig([]);
      await actions.processDatapackConfig([], { silent: true });
    }

    actions.fetchFaciesPatterns();
    actions.fetchTimescaleDataAction();
    actions.fetchAllWorkshops();
  } finally {
    // Always mark initialization as complete, even on errors
    actions.setIsInitializing(false);
  }
}
