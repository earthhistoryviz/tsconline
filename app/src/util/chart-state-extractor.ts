import type { ColumnInfo, MCPChartState, MCPColumnToggleSettings } from "@tsconline/shared";
import { defaultColumnRoot } from "@tsconline/shared";
import type { State } from "../state/state";
import type { ChartSettings, RenderColumnInfo } from "../types";
import { collectDefaultColumnMaps, shouldPreserveColumnOn } from "./default-column-map";

/**
 * Extracts the current chart state from the app's state object
 * to be sent to GeoGPT for context initialization
 */
export type ExtractedChartState = MCPChartState;

function buildParentMap(columnHashMap: Map<string, RenderColumnInfo>): Map<string, string> {
  const parentMap = new Map<string, string>();
  for (const column of columnHashMap.values()) {
    for (const childName of column.children) {
      parentMap.set(childName, column.name);
    }
  }
  return parentMap;
}

function isRootContainerColumn(name: string): boolean {
  return name === defaultColumnRoot.name || name === "Chart Root" || name === "Chart Title";
}

/** Every ancestor up to the chart root is on (the leaf itself is not checked). */
function hasGoldenAncestorPath(
  column: RenderColumnInfo,
  parentMap: Map<string, string>,
  columnHashMap: Map<string, RenderColumnInfo>
): boolean {
  let currentName: string | undefined = parentMap.get(column.name);

  while (currentName) {
    const current = columnHashMap.get(currentName);
    if (!current || !current.on) {
      return false;
    }

    const parentName = parentMap.get(currentName);
    if (!parentName) {
      return isRootContainerColumn(current.name);
    }

    if (parentName === defaultColumnRoot.name || parentName === "Chart Root") {
      return current.on;
    }

    currentName = parentName;
  }

  return true;
}

function isReportableLeaf(column: RenderColumnInfo): boolean {
  if (column.name === defaultColumnRoot.name) return false;
  if (shouldPreserveColumnOn(column)) return false;
  return column.children.length === 0;
}

function collectBlankSlatePositiveEntry(
  renderColumn: RenderColumnInfo,
  parentMap: Map<string, string>,
  columnHashMap: Map<string, RenderColumnInfo>,
  columnToggleSettings: Record<string, Partial<MCPColumnToggleSettings>>
): void {
  if (shouldPreserveColumnOn(renderColumn)) return;
  if (!hasGoldenAncestorPath(renderColumn, parentMap, columnHashMap)) return;
  if (!renderColumn.on) return;

  const settings: Partial<MCPColumnToggleSettings> = { on: true };
  if (renderColumn.width !== undefined) {
    settings.width = renderColumn.width;
  }
  columnToggleSettings[renderColumn.name] = settings;
}

function collectLeafColumnToggle(
  renderColumn: RenderColumnInfo,
  parentMap: Map<string, string>,
  columnHashMap: Map<string, RenderColumnInfo>,
  defaultColumnMap: Map<string, ColumnInfo>,
  columnToggleSettings: Record<string, Partial<MCPColumnToggleSettings>>
): void {
  const defaultColumn = defaultColumnMap.get(renderColumn.name);
  const ancestorsGolden = hasGoldenAncestorPath(renderColumn, parentMap, columnHashMap);

  // A parent folder being off implicitly hides its descendants — do not spam on:false per leaf.
  if (!ancestorsGolden) {
    return;
  }

  const effectivelyOn = renderColumn.on;
  const defaultOn = defaultColumn?.on ?? false;
  const settings: Partial<MCPColumnToggleSettings> = {};

  if (effectivelyOn !== defaultOn) {
    settings.on = effectivelyOn;
  }

  const widthDiffers =
    defaultColumn === undefined ? renderColumn.width !== undefined : defaultColumn.width !== renderColumn.width;

  if (widthDiffers && renderColumn.width !== undefined) {
    settings.width = renderColumn.width;
  }

  if (
    defaultColumn === undefined ||
    defaultColumn.rgb?.r !== renderColumn.rgb?.r ||
    defaultColumn.rgb?.g !== renderColumn.rgb?.g ||
    defaultColumn.rgb?.b !== renderColumn.rgb?.b
  ) {
    if (renderColumn.rgb) {
      settings.backgroundColor = `rgb(${renderColumn.rgb.r}, ${renderColumn.rgb.g}, ${renderColumn.rgb.b})`;
    }
  }

  if (Object.keys(settings).length > 0) {
    columnToggleSettings[renderColumn.name] = settings;
  }
}

function collectFolderColumnToggle(
  renderColumn: RenderColumnInfo,
  parentMap: Map<string, string>,
  columnHashMap: Map<string, RenderColumnInfo>,
  defaultColumnMap: Map<string, ColumnInfo>,
  columnToggleSettings: Record<string, Partial<MCPColumnToggleSettings>>
): void {
  if (shouldPreserveColumnOn(renderColumn)) return;
  if (!hasGoldenAncestorPath(renderColumn, parentMap, columnHashMap)) {
    return;
  }

  const defaultColumn = defaultColumnMap.get(renderColumn.name);
  const defaultOn = defaultColumn?.on ?? false;

  if (renderColumn.on !== defaultOn) {
    columnToggleSettings[renderColumn.name] = { on: renderColumn.on };
  }
}

function collectRenderColumnSettings(
  columnName: string,
  state: State,
  parentMap: Map<string, string>,
  defaultColumnMap: Map<string, ColumnInfo>,
  hideDatapackDefaults: boolean,
  columnToggleSettings: Record<string, Partial<MCPColumnToggleSettings>>
): void {
  const renderColumn = state.settingsTabs.columnHashMap.get(columnName);
  if (!renderColumn || renderColumn.name === defaultColumnRoot.name) return;

  if (hideDatapackDefaults) {
    collectBlankSlatePositiveEntry(renderColumn, parentMap, state.settingsTabs.columnHashMap, columnToggleSettings);
  } else if (isReportableLeaf(renderColumn)) {
    collectLeafColumnToggle(
      renderColumn,
      parentMap,
      state.settingsTabs.columnHashMap,
      defaultColumnMap,
      columnToggleSettings
    );
  } else {
    collectFolderColumnToggle(
      renderColumn,
      parentMap,
      state.settingsTabs.columnHashMap,
      defaultColumnMap,
      columnToggleSettings
    );
  }

  for (const childName of renderColumn.children) {
    collectRenderColumnSettings(
      childName,
      state,
      parentMap,
      defaultColumnMap,
      hideDatapackDefaults,
      columnToggleSettings
    );
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

  if (state.config.datapacks && Array.isArray(state.config.datapacks)) {
    chartState.datapackTitles = state.config.datapacks.map((dp: unknown) => {
      const datapack = dp as { title?: string };
      return datapack.title || "";
    });
  }

  const hideDatapackDefaults = state.settingsTabs.hideDatapackDefaults;
  chartState.overrides.hideDatapackDefaults = hideDatapackDefaults;

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

  if (state.settingsTabs.renderColumns) {
    const columnToggleSettings: Record<string, Partial<MCPColumnToggleSettings>> = {};
    const defaultColumnMap = collectDefaultColumnMaps(state);
    const parentMap = buildParentMap(state.settingsTabs.columnHashMap);

    for (const childName of state.settingsTabs.renderColumns.children) {
      collectRenderColumnSettings(
        childName,
        state,
        parentMap,
        defaultColumnMap,
        hideDatapackDefaults,
        columnToggleSettings
      );
    }

    chartState.columnToggles = columnToggleSettings;
  }

  return chartState;
}
