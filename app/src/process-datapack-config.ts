import { NavigateFunction } from "react-router-dom";
import { actions, state } from "./state";
import { SetDatapackConfigMessage, SetDatapackConfigCompleteMessage } from "./types";
import { ErrorCodes } from "./util/error-codes";
export type InitialChartGeneration = {
  navigate: NavigateFunction;
  path: string;
};

export async function processDatapackConfig(
  datapacks: string[],
  settingsPath?: string,
  presetChartGeneration?: InitialChartGeneration
) {
  if (state.isProcessingDatapacks) {
    return;
  } else {
    actions.setIsProcessingDatapacks(true);
    let chartSettings = null;
    if (settingsPath && settingsPath.length !== 0) {
      await actions
        .fetchSettingsXML(settingsPath)
        .then((settings) => {
          if (settings) {
            actions.removeError(ErrorCodes.INVALID_SETTINGS_RESPONSE);
            chartSettings = JSON.parse(JSON.stringify(settings));
          }
        })
        .catch((e) => {
          console.error(e);
          actions.pushError(ErrorCodes.INVALID_SETTINGS_RESPONSE);
          return;
        });
    }

    const setDatapackConfigWorker: Worker = new Worker(
      new URL("./util/workers/set-datapack-config.ts", import.meta.url),
      {
        type: "module"
      }
    );
    const message: SetDatapackConfigMessage = {
      datapacks: datapacks,
      chartSettings: chartSettings,
      stateCopy: JSON.stringify(state)
    };
    setDatapackConfigWorker.postMessage(message);
    setDatapackConfigWorker.onmessage = async function (e: MessageEvent<SetDatapackConfigCompleteMessage>) {
      const { status, value } = e.data;
      if (status === "success" && value) {
        await actions.setDatapackConfig(
          value.columnRoot,
          value.foundDefaultAge,
          value.mapHierarchy,
          value.mapInfo,
          value.datapacks,
          value.chartSettings
        );
        actions.pushSnackbar("Datapack Config Updated", "success");
      } else {
        actions.pushSnackbar("Setting Datapack Config Timed Out", "info");
      }
      setDatapackConfigWorker.terminate();
      actions.setIsProcessingDatapacks(false);
      if (presetChartGeneration) {
        actions.initiateChartGeneration(presetChartGeneration.navigate, presetChartGeneration.path);
        actions.setRegenerateChart(false);
      }
    };
    setDatapackConfigWorker.onerror = function (error) {
      setDatapackConfigWorker.terminate();
      console.error("Webworker failed with error: " + error);
    };
  }
}
