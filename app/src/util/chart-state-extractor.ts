import type { MCPChartState } from "@tsconline/shared";
import { ColumnInfo } from "@tsconline/shared";
import type { State } from "../state/state";
import type { ChartSettings } from "../types";

/**
 * Extracts the current chart state from the app's state object
 * to be sent to GeoGPT for context initialization
 */
export type ExtractedChartState = MCPChartState;

/**
 * Recursively collects column names that are toggled on/off
 */
function collectColumnStatesFromTree(
  column: ColumnInfo,
  onColumns: Set<string>,
  offColumns: Set<string>
): void {
  if (column.on) {
    onColumns.add(column.name);
  } else {
    offColumns.add(column.name);
  }

  // Process children recursively
  if (column.children && Array.isArray(column.children)) {
    for (const childColumn of column.children) {
      collectColumnStatesFromTree(childColumn, onColumns, offColumns);
    }
  }
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

  // Extract column toggles (on/off states)
  if (state.settingsTabs.columns) {
    const onColumns = new Set<string>();
    const offColumns = new Set<string>();

    // Traverse the tree and collect column states
    collectColumnStatesFromTree(state.settingsTabs.columns, onColumns, offColumns);

    chartState.columnToggles = {
      on: Array.from(onColumns),
      off: Array.from(offColumns)
    };
  }

  return chartState;
}

