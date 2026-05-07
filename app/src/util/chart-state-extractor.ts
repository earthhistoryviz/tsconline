import type { MCPChartState, MCPColumnToggleSettings } from "@tsconline/shared";
import { ColumnInfo, defaultColumnRoot } from "@tsconline/shared";
import type { State } from "../state/state";
import type { ChartSettings } from "../types";
import { getDatapackFromArray } from "../state/non-action-util";

/**
 * Extracts the current chart state from the app's state object
 * to be sent to GeoGPT for context initialization
 */
export type ExtractedChartState = MCPChartState;

function collectDefaultColumnMap(column: ColumnInfo, defaultMap: Map<string, ColumnInfo>): void {
  defaultMap.set(column.name, column);
  if (column.children && Array.isArray(column.children)) {
    for (const childColumn of column.children) {
      collectDefaultColumnMap(childColumn, defaultMap);
    }
  }
}

function collectDefaultColumnMaps(state: State): Map<string, ColumnInfo> {
  const defaultColumnMap = new Map<string, ColumnInfo>();

  collectDefaultColumnMap(defaultColumnRoot, defaultColumnMap);

  for (const datapackRef of state.config.datapacks) {
    const datapack = getDatapackFromArray(datapackRef, state.datapacks);
    if (!datapack?.columnInfo) continue;
    collectDefaultColumnMap(datapack.columnInfo, defaultColumnMap);
  }

  return defaultColumnMap;
}

function collectRenderColumnSettings(
  columnName: string,
  state: State,
  defaultColumnMap: Map<string, ColumnInfo>,
  columnToggleSettings: Record<string, Partial<MCPColumnToggleSettings>>
): void {
  const renderColumn = state.settingsTabs.columnHashMap.get(columnName);
  if (!renderColumn || renderColumn.name === defaultColumnRoot.name) return;

  const defaultColumn = defaultColumnMap.get(renderColumn.name);
  const settings: Partial<MCPColumnToggleSettings> = {};

  if (defaultColumn === undefined || defaultColumn.on !== renderColumn.on) {
    settings.on = renderColumn.on;
  }
  if (defaultColumn === undefined || defaultColumn.width !== renderColumn.width) {
    settings.width = renderColumn.width;
  }
  if (Object.keys(settings).length > 0 || defaultColumn === undefined) {
    columnToggleSettings[renderColumn.name] = settings;
  }

  for (const childName of renderColumn.children) {
    collectRenderColumnSettings(childName, state, defaultColumnMap, columnToggleSettings);
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
      const typedSettings = unitSettings as { baseStageAge?: number; topStageAge?: number; unitsPerMY?: number };
      if (typedSettings.baseStageAge !== undefined) {
        chartState.overrides[`baseAge_${unitKey}`] = typedSettings.baseStageAge;
      }
      if (typedSettings.topStageAge !== undefined) {
        chartState.overrides[`topAge_${unitKey}`] = typedSettings.topStageAge;
      }
      if (typedSettings.unitsPerMY !== undefined) {
        const existingUnitsPerMY = Array.isArray(chartState.overrides.unitsPerMY)
          ? (chartState.overrides.unitsPerMY as Array<{ unit: string; value: number }>)
          : [];
        chartState.overrides.unitsPerMY = [...existingUnitsPerMY, { unit: unitKey, value: typedSettings.unitsPerMY }];
      }
    }
  }

  // Extract column toggles with full properties as deltas from default state.
  if (state.settingsTabs.renderColumns) {
    const columnToggleSettings: Record<string, Partial<MCPColumnToggleSettings>> = {};
    const defaultColumnMap = collectDefaultColumnMaps(state);

    for (const childName of state.settingsTabs.renderColumns.children) {
      collectRenderColumnSettings(childName, state, defaultColumnMap, columnToggleSettings);
    }

    chartState.columnToggles = columnToggleSettings;
  }

  return chartState;
}
