import { SetDatapackConfigCompleteMessage, SetDatapackConfigMessage } from "../types";
import { actions, state } from "./index";

export async function initialize() {
  // If we're running in dev mode (yarn dev), then the app is not served from the same URL
  // as the server hosts the /charts endpoint.  So, we'll hard-code that for ourselves here.
  actions.sessionCheck();
  actions.fetchPresets();
  const hasPreviousConfig = actions.setPreviousDatapackConfig([]);
  if (!hasPreviousConfig) {
    const chartSettings = null;
    const setDatapackConfigWorker: Worker = new Worker(
      new URL("../util/workers/set-datapack-config.ts", import.meta.url),
      {
        type: "module"
      }
    );
    const message: SetDatapackConfigMessage = {
      datapacks: [],
      settingsPath: "",
      chartSettings: chartSettings,
      stateCopy: JSON.stringify(state)
    };
    setDatapackConfigWorker.postMessage(message);
    setDatapackConfigWorker.onmessage = function (e: MessageEvent<SetDatapackConfigCompleteMessage>) {
      const { status, value } = e.data;
      if (status === "success" && value) {
        actions.afterSetDatapackConfig(
          value.columnRoot,
          value.foundDefaultAge,
          value.mapHierarchy,
          value.mapInfo,
          value.datapacks,
          value.chartSettings
        );
      } else {
        actions.pushSnackbar("Setting Datapack Config Timed Out", "info");
      }
      setDatapackConfigWorker.terminate();
    };
  }
  actions.fetchFaciesPatterns();
  actions.fetchTimescaleDataAction();
}
