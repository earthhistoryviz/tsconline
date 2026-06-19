import { ColumnInfo, defaultColumnRoot } from "@tsconline/shared";
import type { State } from "../state/state";
import type { RenderColumnInfo } from "../types";
import { getDatapackFromArray } from "../state/non-action-util";

export function collectDefaultColumnMap(column: ColumnInfo, defaultMap: Map<string, ColumnInfo>): void {
  defaultMap.set(column.name, column);
  for (const childColumn of column.children) {
    collectDefaultColumnMap(childColumn, defaultMap);
  }
}

export function collectDefaultColumnMaps(state: State): Map<string, ColumnInfo> {
  const defaultColumnMap = new Map<string, ColumnInfo>();
  collectDefaultColumnMap(defaultColumnRoot, defaultColumnMap);
  for (const datapackRef of state.config.datapacks) {
    const datapack = getDatapackFromArray(datapackRef, state.datapacks);
    if (!datapack?.columnInfo) continue;
    collectDefaultColumnMap(datapack.columnInfo, defaultColumnMap);
  }
  return defaultColumnMap;
}

/** Columns that must stay on so the chart tree and age ruler remain usable. */
export function shouldPreserveColumnOn(column: RenderColumnInfo): boolean {
  if (column.name === "Chart Root" || column.name === "Chart Title" || column.name === "Ma") {
    return true;
  }
  if (column.columnDisplayType === "Ruler") {
    return true;
  }
  return false;
}

export function snapshotColumnOnStates(columnHashMap: Map<string, RenderColumnInfo>): Map<string, boolean> {
  const snapshot = new Map<string, boolean>();
  for (const [name, column] of columnHashMap) {
    snapshot.set(name, column.on);
  }
  return snapshot;
}

export function restoreColumnOnSnapshot(
  columnHashMap: Map<string, RenderColumnInfo>,
  snapshot: Map<string, boolean>
): void {
  for (const [name, on] of snapshot) {
    const column = columnHashMap.get(name);
    if (column) column.on = on;
  }
}

/** UI blank slate: turn off datapack-default-on columns only; user-enabled default-off columns stay on. */
export function applyHideDatapackDefaults(
  columnHashMap: Map<string, RenderColumnInfo>,
  defaultMap: Map<string, ColumnInfo>
): void {
  for (const [name, column] of columnHashMap) {
    if (shouldPreserveColumnOn(column)) continue;
    const defaultCol = defaultMap.get(name);
    if (defaultCol?.on === true) {
      column.on = false;
    }
  }
}

/** GeoGPT blank slate: turn off every non-structural column before applying the positive columnToggles list. */
export function setAllRenderColumnsOff(columnHashMap: Map<string, RenderColumnInfo>): void {
  for (const column of columnHashMap.values()) {
    if (!shouldPreserveColumnOn(column)) {
      column.on = false;
    }
  }
}

export function restoreDatapackDefaultOnStates(
  columnHashMap: Map<string, RenderColumnInfo>,
  defaultMap: Map<string, ColumnInfo>
): void {
  for (const [name, column] of columnHashMap) {
    const defaultCol = defaultMap.get(name);
    if (defaultCol !== undefined) {
      column.on = defaultCol.on;
    }
  }
}
