import type { MCPChartState } from "@tsconline/shared";
import { ColumnInfo, defaultColumnRoot } from "@tsconline/shared";
import type { State } from "../state/state";
import type { ChartSettings } from "../types";
import { getDatapackFromArray } from "../state/non-action-util";

/**
 * Extracts the current chart state from the app's state object
 * to be sent to GeoGPT for context initialization
 */
export type ExtractedChartState = MCPChartState;

function collectColumnOnMap(column: ColumnInfo, onMap: Map<string, boolean>): void {
  onMap.set(column.name, column.on);
  if (column.children && Array.isArray(column.children)) {
    for (const childColumn of column.children) {
      collectColumnOnMap(childColumn, onMap);
    }
  }
}

function collectDefaultColumnOnMap(state: State): Map<string, boolean> {
  const defaultOnMap = new Map<string, boolean>();

  // Include built-in default columns from the shared chart root.
  collectColumnOnMap(defaultColumnRoot, defaultOnMap);

  // Include each selected datapack's original column defaults.
  for (const datapackRef of state.config.datapacks) {
    const datapack = getDatapackFromArray(datapackRef, state.datapacks);
    if (!datapack?.columnInfo) continue;
    collectColumnOnMap(datapack.columnInfo, defaultOnMap);
  }

  return defaultOnMap;
}

/**
 * Extracts the current chart state from the app state
 * Returns the configuration that would be needed to recreate the current chart in GeoGPT
 */
export function extractCurrentChartState(state: State): ExtractedChartState {
  const chartState: ExtractedChartState = {
    datapackTitles: [],
    overrides: {},
    columnToggles: {}
  };

  // Extract datapack titles
  if (state.config.datapacks && Array.isArray(state.config.datapacks)) {
    chartState.datapackTitles = state.config.datapacks.map((dp: unknown) => {
      const datapack = dp as { title?: string };
      return datapack.title || "";
    });
  }

  // Extract overrides from time settings (age ranges, etc)
  if (state.settings.timeSettings) {
    const settings = state.settings as ChartSettings;
    for (const [unitKey, unitSettings] of Object.entries(settings.timeSettings)) {
      const typedSettings = unitSettings as { baseStageAge?: number; topStageAge?: number };
      if (typedSettings.baseStageAge !== undefined) {
        chartState.overrides[`baseAge_${unitKey}`] = typedSettings.baseStageAge;
      }
      if (typedSettings.topStageAge !== undefined) {
        chartState.overrides[`topAge_${unitKey}`] = typedSettings.topStageAge;
      }
    }
  }

  // Extract column toggles as deltas from default state to keep payload small.
  if (state.settingsTabs.columns) {
    const currentOnMap = new Map<string, boolean>();
    collectColumnOnMap(state.settingsTabs.columns, currentOnMap);

    const defaultOnMap = collectDefaultColumnOnMap(state);
    const onDiff: string[] = [];
    const offDiff: string[] = [];

    for (const [columnName, isOn] of currentOnMap.entries()) {
      if (columnName === defaultColumnRoot.name) continue;
      const defaultIsOn = defaultOnMap.get(columnName);

      // Unknown columns (e.g. user-added) are included as explicit state.
      if (defaultIsOn === undefined || defaultIsOn !== isOn) {
        if (isOn) onDiff.push(columnName);
        else offDiff.push(columnName);
      }
    }

    chartState.columnToggles = {
      ...(onDiff.length > 0 ? { on: onDiff } : {}),
      ...(offDiff.length > 0 ? { off: offDiff } : {})
    };
  }

  return chartState;
}
