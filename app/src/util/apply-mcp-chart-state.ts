import type { MCPChartState, MCPColumnToggleSettings } from "@tsconline/shared";
import type { State } from "../state/state";
import type { RenderColumnInfo } from "../types";
import {
  collectDefaultColumnMaps,
  restoreDatapackDefaultOnStates,
  setAllRenderColumnsOff,
  snapshotColumnOnStates
} from "./default-column-map";

function findRenderColumn(
  columnHashMap: Map<string, RenderColumnInfo>,
  columnId: string
): RenderColumnInfo | undefined {
  const direct = columnHashMap.get(columnId);
  if (direct) return direct;

  const target = columnId.trim().toLowerCase();
  for (const column of columnHashMap.values()) {
    const names = [column.name, column.editName].filter((value): value is string => Boolean(value));
    if (names.some((value) => value.toLowerCase() === target)) {
      return column;
    }
  }
  return undefined;
}

function buildParentMap(columnHashMap: Map<string, RenderColumnInfo>): Map<string, string> {
  const parentMap = new Map<string, string>();
  for (const column of columnHashMap.values()) {
    for (const childName of column.children) {
      parentMap.set(childName, column.name);
    }
  }
  return parentMap;
}

function enableColumnWithAncestors(
  columnHashMap: Map<string, RenderColumnInfo>,
  column: RenderColumnInfo,
  parentMap: Map<string, string>
): void {
  let currentName: string | undefined = column.name;
  while (currentName) {
    const current = columnHashMap.get(currentName);
    if (!current) break;
    current.on = true;
    currentName = parentMap.get(currentName);
  }
}

function applyMcpColumnToggles(
  columnHashMap: Map<string, RenderColumnInfo>,
  columnToggles: Record<string, Partial<MCPColumnToggleSettings>>,
  parentMap: Map<string, string>
): void {
  for (const [columnId, settings] of Object.entries(columnToggles)) {
    const column = findRenderColumn(columnHashMap, columnId);
    if (!column) continue;

    if (settings.on !== undefined) {
      column.on = settings.on;
      if (settings.on) {
        enableColumnWithAncestors(columnHashMap, column, parentMap);
      }
    }
    if (settings.width !== undefined) {
      column.width = settings.width;
    }
  }
}

function applyMcpOverrides(state: State, overrides: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(overrides)) {
    if (key === "hideDatapackDefaults" && typeof value === "boolean") {
      continue;
    }
    if (key.startsWith("baseAge_") && typeof value === "number") {
      const unit = key.slice("baseAge_".length);
      if (state.settings.timeSettings[unit]) {
        state.settings.timeSettings[unit].baseStageAge = value;
      }
    } else if (key.startsWith("topAge_") && typeof value === "number") {
      const unit = key.slice("topAge_".length);
      if (state.settings.timeSettings[unit]) {
        state.settings.timeSettings[unit].topStageAge = value;
      }
    } else if (key === "unitsPerMY" && Array.isArray(value)) {
      for (const entry of value) {
        const typed = entry as { unit?: string; value?: number };
        if (!typed.unit || typed.value === undefined) continue;
        if (state.settings.timeSettings[typed.unit]) {
          state.settings.timeSettings[typed.unit].unitsPerMY = typed.value;
        }
      }
    }
  }
}

/**
 * Applies merged MCP chart state to the live TSCOnline settings UI
 * (column checkboxes, blank slate mode, widths, time overrides).
 */
export function applyMcpChartStateToApp(state: State, chartState: MCPChartState): void {
  applyMcpOverrides(state, chartState.overrides);

  const { columnHashMap } = state.settingsTabs;
  const defaultMap = collectDefaultColumnMaps(state);
  const hideDatapackDefaults = chartState.overrides.hideDatapackDefaults === true;

  if (hideDatapackDefaults) {
    if (!state.settingsTabs.hideDatapackDefaults) {
      state.settingsTabs.columnOnSnapshot = snapshotColumnOnStates(columnHashMap);
    }
    setAllRenderColumnsOff(columnHashMap);
    state.settingsTabs.hideDatapackDefaults = true;
  } else {
    restoreDatapackDefaultOnStates(columnHashMap, defaultMap);
    state.settingsTabs.hideDatapackDefaults = false;
    state.settingsTabs.columnOnSnapshot = null;
  }

  const parentMap = buildParentMap(columnHashMap);
  applyMcpColumnToggles(columnHashMap, chartState.columnToggles, parentMap);
}
