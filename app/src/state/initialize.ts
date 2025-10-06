import { actions } from "./index";
import { state } from "./state";

export async function initialize() {
  // If we're running in dev mode (yarn dev), then the app is not served from the same URL
  // as the server hosts the /charts endpoint.  So, we'll hard-code that for ourselves here.

  try {
    actions.sessionCheck();
    actions.fetchAllPublicDatapacksMetadata();
    actions.fetchPresets();

    // Auto-load the TimeScale Creator Internal Datapack only if no datapacks are already selected
    // This ensures first-time users get a good experience while preserving existing configurations
    // Skip auto-loading in test environments to avoid conflicts with test expectations
    try {
      // First initialize with empty config to check current state
      await actions.processDatapackConfig([], { silent: true });
      
      // Only auto-load if no datapacks are currently configured and not in test environment
      const isTestEnvironment = import.meta.env.MODE === 'test' || import.meta.env.VITEST;
      
      if (state.config.datapacks.length === 0 && !isTestEnvironment) {
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
          console.log("Auto-loaded TimeScale Creator Internal Datapack for new user");
        } else {
          console.warn("TimeScale Creator Internal Datapack not found");
          actions.setUnsavedDatapackConfig([]);
        }
      } else {
        // User already has datapacks configured or in test environment, don't auto-load
        actions.setUnsavedDatapackConfig(state.config.datapacks);
        if (isTestEnvironment) {
          console.log("Test environment detected, skipping auto-load");
        } else {
          console.log("Existing datapack configuration found, skipping auto-load");
        }
      }
    } catch (error) {
      console.error("Failed during datapack initialization:", error);
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
