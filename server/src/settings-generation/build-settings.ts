import {
  ColumnInfo,
  Datapack,
  defaultChartSettingsInfoTSC,
  ChartSettingsInfoTSC,
  defaultColumnRootConstant,
  FontsInfo,
  MCPColumnToggleSettings
} from "@tsconline/shared";
import _ from "lodash";
import { jsonToXml } from "./settings-to-xml.js";

export type SchemaOverrides = Partial<{
  topAge: number;
  baseAge: number;
  unitsPerMY: number | { unit: string; value: number }[];
  skipEmptyColumns: boolean;
  variableColors: string;
  noIndentPattern: boolean;
  negativeChk: boolean;
  doPopups: boolean;
  enEventColBG: boolean;
  enChartLegend: boolean;
  enPriority: boolean;
  enHideBlockLable: boolean;
}>;

export function extractUnitScopedTimeOverrides(overrides: SchemaOverrides): {
  topAgeByUnit: Map<string, number>;
  baseAgeByUnit: Map<string, number>;
} {
  const topAgeByUnit = new Map<string, number>();
  const baseAgeByUnit = new Map<string, number>();

  for (const [key, value] of Object.entries(overrides)) {
    if (typeof value !== "number") continue;

    const topAgeMatch = key.match(/^topAge_(.+)$/);
    if (topAgeMatch?.[1]) {
      topAgeByUnit.set(topAgeMatch[1].toLowerCase(), value);
      continue;
    }

    const baseAgeMatch = key.match(/^baseAge_(.+)$/);
    if (baseAgeMatch?.[1]) {
      baseAgeByUnit.set(baseAgeMatch[1].toLowerCase(), value);
    }
  }

  return { topAgeByUnit, baseAgeByUnit };
}

export type ColumnToggles = Record<
  string,
  {
    on?: boolean;
    width?: number;
  }
>;

export type FlattenedColumn = {
  id: string;
  name: string;
  path: string;
  on: boolean;
  enableTitle: boolean;
  type: string;
};

type ColumnInfoWithPossibleIds = ColumnInfo & {
  _id?: string;
  id?: string;
  originalTscId?: string;
};

function getPossibleColumnIdentifiers(col: ColumnInfo): string[] {
  const withIds = col as ColumnInfoWithPossibleIds;
  const explicitIds = [withIds.originalTscId, withIds._id, withIds.id]
    .filter((value): value is string => Boolean(value))
    .flatMap((value) => {
      const rawValue = value.toLowerCase();
      const suffix = value.includes(":") ? value.split(":").slice(1).join(":").toLowerCase() : rawValue;
      return [rawValue, suffix];
    });

  const displayIds = [col.name, col.editName]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLowerCase());

  return Array.from(new Set([...displayIds, ...explicitIds]));
}

function addNormalizedToggleCandidates(
  normalizedToggles: Map<string, Partial<MCPColumnToggleSettings>>,
  columnId: string,
  settings: Partial<MCPColumnToggleSettings>
) {
  const queue = [columnId];
  const seen = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;

    const trimmed = current.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);

    normalizedToggles.set(trimmed.toLowerCase(), settings);

    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      queue.push(trimmed.slice(1, -1));
    }

    const dequoted = trimmed.replace(/^"+|"+$/g, "").replace(/^'+|'+$/g, "");
    if (dequoted !== trimmed) {
      queue.push(dequoted);
    }

    if (trimmed.includes(":")) {
      queue.push(trimmed.split(":").slice(1).join(":"));
    }

    if (trimmed.includes(".")) {
      const dotParts = trimmed
        .split(".")
        .map((part) => part.trim())
        .filter(Boolean);
      for (let i = 1; i < dotParts.length; i++) {
        queue.push(dotParts.slice(i).join("."));
      }
      queue.push(dotParts[dotParts.length - 1]!);
    }
  }
}

/**
 * Merge multiple datapack column trees into a single root column.
 * Replicates frontend worker logic to ensure consistency.
 */
export function mergeDatapackColumns(datapacks: Datapack[]): ColumnInfo {
  if (datapacks.length === 0) {
    return _.cloneDeep(defaultColumnRootConstant);
  }

  const root: ColumnInfo = _.cloneDeep(defaultColumnRootConstant);
  root.name = "Chart Root";
  root.editName = "Chart Root";
  root.children = [];
  root.enableTitle = false;

  // Chart root fonts inheritable (matching frontend)
  for (const opt in root.fontsInfo) {
    root.fontsInfo[opt as keyof FontsInfo].inheritable = true;
  }

  const unitMap: Map<string, ColumnInfo & { datapackUniqueIdentifiers?: { title: string; isPublic: boolean }[] }> =
    new Map();

  for (const datapack of datapacks) {
    if (!datapack.columnInfo || datapack.columnInfo.children.length === 0) continue;

    if (unitMap.has(datapack.ageUnits)) {
      const existingUnitColumnInfo = unitMap.get(datapack.ageUnits)!;
      const columnsToAdd = _.cloneDeep(datapack.columnInfo.children.slice(1));
      for (const child of columnsToAdd) {
        child.parent = existingUnitColumnInfo.name;
      }
      existingUnitColumnInfo.children = existingUnitColumnInfo.children.concat(columnsToAdd);
      if (existingUnitColumnInfo.datapackUniqueIdentifiers) {
        existingUnitColumnInfo.datapackUniqueIdentifiers.push({
          title: datapack.title,
          isPublic: datapack.isPublic
        });
      }
    } else {
      const columnInfo = _.cloneDeep(datapack.columnInfo) as ColumnInfo & {
        datapackUniqueIdentifiers?: { title: string; isPublic: boolean }[];
      };
      columnInfo.parent = root.name;
      columnInfo.datapackUniqueIdentifiers = [
        {
          title: datapack.title,
          isPublic: datapack.isPublic
        }
      ];
      unitMap.set(datapack.ageUnits, columnInfo);
    }
  }

  for (const [unit, column] of unitMap) {
    if (unit.toLowerCase() !== "ma" && column.name === "Chart Title") {
      column.name = column.name + " in " + unit;
      column.editName = unit;
      for (const child of column.children) {
        child.parent = column.name;
      }
    }
    root.fontOptions = Array.from(new Set([...root.fontOptions, ...column.fontOptions]));
    root.children.push(column);
  }

  return root;
}

/**
 * Generate default chart settings based on datapack data
 */
export function generateDefaultChartSettings(datapacks: Datapack[]): ChartSettingsInfoTSC {
  const settings: ChartSettingsInfoTSC = _.cloneDeep(defaultChartSettingsInfoTSC);

  if (datapacks.length === 0) {
    // No datapacks: provide sensible defaults so charts do not span 0-4600
    const primaryUnit = "Ma";
    settings.topAge.push({ source: "text", unit: primaryUnit, text: 0 });
    settings.baseAge.push({ source: "text", unit: primaryUnit, text: 10 });
    settings.unitsPerMY.push({ unit: primaryUnit, text: 2 * 30 });
    settings.skipEmptyColumns.push({ unit: primaryUnit, text: true });
    settings.variableColors = "UNESCO";
    return settings;
  }

  // Collect all unique age units from datapacks
  const uniqueUnits = new Set<string>();
  let topAge: number | null = null;
  let baseAge: number | null = null;
  let primaryUnit = "Ma"; // default
  // We no longer fall back to column ranges for defaults; AI or frontend sets ages
  let variableColors: string = "";
  const verticalScaleByUnit: Map<string, number> = new Map();

  for (const datapack of datapacks) {
    uniqueUnits.add(datapack.ageUnits);

    // Do not derive defaults from column global ranges

    // Use the first datapack's ages and unit as primary when provided explicitly
    if (topAge === null && datapack.topAge !== undefined) {
      topAge = datapack.topAge;
      primaryUnit = datapack.ageUnits;
    }
    if (baseAge === null && datapack.baseAge !== undefined) {
      baseAge = datapack.baseAge;
    }
    if (datapack.ageUnits) {
      primaryUnit = datapack.ageUnits;
    }

    // Prefer the datapack's default chronostrat as the variableColors (matches presets)
    if (!variableColors && datapack.defaultChronostrat) {
      variableColors = datapack.defaultChronostrat;
    }

    // Track the largest verticalScale per unit (matches frontend logic)
    if (datapack.verticalScale) {
      const current = verticalScaleByUnit.get(datapack.ageUnits) ?? Number.MIN_SAFE_INTEGER;
      verticalScaleByUnit.set(datapack.ageUnits, Math.max(current, datapack.verticalScale));
    }
  }

  // If AI/datapacks did not provide ages, default to 0-10 in primary unit
  if (topAge === null || topAge === undefined) topAge = 0;
  if (baseAge === null || baseAge === undefined) baseAge = 10;

  // Add top/base ages (use "text" to match preset format)
  settings.topAge.push({ source: "text", unit: primaryUnit, text: topAge });
  settings.baseAge.push({ source: "text", unit: primaryUnit, text: baseAge });

  // Set variableColors to datapack defaultChronostrat when available (UNESCO/USGS)
  if (variableColors) {
    settings.variableColors = variableColors;
  }

  // Add unitsPerMY for each unique unit found (UI units -> XML value = *30)
  for (const unit of uniqueUnits) {
    const uiUnits = verticalScaleByUnit.get(unit) ?? 2;
    // Store XML value to match frontend parse-settings behavior
    settings.unitsPerMY.push({
      unit: unit,
      text: uiUnits * 30
    });
    // Match preset behavior: skip empty columns by default
    settings.skipEmptyColumns.push({ unit, text: true });
  }

  return settings;
}

function extractSettingsComponents(datapacks: Datapack[]): {
  columnRoot: ColumnInfo;
  chartSettings: ChartSettingsInfoTSC;
} {
  const columnRoot = mergeDatapackColumns(datapacks);
  const chartSettings = generateDefaultChartSettings(datapacks);
  return { columnRoot, chartSettings };
}

export function applyTogglesToColumnInfo(columnRoot: ColumnInfo, toggles: ColumnToggles) {
  const normalizedToggles = new Map<string, Partial<MCPColumnToggleSettings>>();

  const columnToggleAppliers: Array<(col: ColumnInfo, settings: Partial<MCPColumnToggleSettings>) => void> = [
    (col, settings) => {
      if (settings.on !== undefined) {
        col.on = settings.on;
      }
    },
    (col, settings) => {
      if (settings.width !== undefined) {
        col.width = settings.width;
      }
    }
  ];

  for (const [columnId, settings] of Object.entries(toggles)) {
    addNormalizedToggleCandidates(normalizedToggles, columnId, settings);
  }

  const visit = (col: ColumnInfo, ancestors: ColumnInfo[] = []) => {
    const candidates = getPossibleColumnIdentifiers(col);
    const matchedId = candidates.find((id) => normalizedToggles.has(id));
    const settings = matchedId ? normalizedToggles.get(matchedId) : undefined;

    if (settings) {
      if (settings.on === true) {
        for (const ancestor of ancestors) {
          ancestor.on = true;
        }
      }

      for (const applyToggle of columnToggleAppliers) {
        applyToggle(col, settings);
      }
    }

    if (col.children) {
      col.children.forEach((child) => visit(child, [...ancestors, col]));
    }
  };

  visit(columnRoot);
}

function applyOverridesToChartSettings(
  chartSettings: ChartSettingsInfoTSC,
  overrides: SchemaOverrides,
  primaryUnit: string
) {
  const { topAgeByUnit, baseAgeByUnit } = extractUnitScopedTimeOverrides(overrides);

  if (overrides.topAge !== undefined) {
    const existingTopAge = chartSettings.topAge.find((t) => t.unit === primaryUnit);
    if (existingTopAge) {
      existingTopAge.text = overrides.topAge;
    } else {
      chartSettings.topAge.push({ source: "text", unit: primaryUnit, text: overrides.topAge });
    }
  }

  if (overrides.baseAge !== undefined) {
    const existingBaseAge = chartSettings.baseAge.find((b) => b.unit === primaryUnit);
    if (existingBaseAge) {
      existingBaseAge.text = overrides.baseAge;
    } else {
      chartSettings.baseAge.push({ source: "text", unit: primaryUnit, text: overrides.baseAge });
    }
  }

  for (const entry of chartSettings.topAge) {
    const unitScopedTopAge = topAgeByUnit.get(entry.unit.toLowerCase());
    if (unitScopedTopAge !== undefined) {
      entry.text = unitScopedTopAge;
    }
  }

  for (const [unit, scopedTopAge] of topAgeByUnit.entries()) {
    const hasExistingUnit = chartSettings.topAge.some((entry) => entry.unit.toLowerCase() === unit);
    if (!hasExistingUnit) {
      chartSettings.topAge.push({ source: "text", unit, text: scopedTopAge });
    }
  }

  for (const entry of chartSettings.baseAge) {
    const unitScopedBaseAge = baseAgeByUnit.get(entry.unit.toLowerCase());
    if (unitScopedBaseAge !== undefined) {
      entry.text = unitScopedBaseAge;
    }
  }

  for (const [unit, scopedBaseAge] of baseAgeByUnit.entries()) {
    const hasExistingUnit = chartSettings.baseAge.some((entry) => entry.unit.toLowerCase() === unit);
    if (!hasExistingUnit) {
      chartSettings.baseAge.push({ source: "text", unit, text: scopedBaseAge });
    }
  }

  if (overrides.unitsPerMY !== undefined) {
    const unitsOverride = overrides.unitsPerMY;
    if (typeof unitsOverride === "number") {
      chartSettings.unitsPerMY = chartSettings.unitsPerMY.map((u) => ({
        ...u,
        text: unitsOverride * 30
      }));
    } else {
      const map = new Map(unitsOverride.map((u) => [u.unit.toLowerCase(), u.value]));
      chartSettings.unitsPerMY = chartSettings.unitsPerMY.map((u) =>
        map.has(u.unit.toLowerCase()) ? { ...u, text: (map.get(u.unit.toLowerCase()) ?? u.text / 30) * 30 } : u
      );
    }
  }

  if (overrides.skipEmptyColumns !== undefined) {
    chartSettings.skipEmptyColumns = chartSettings.skipEmptyColumns.map((s) => ({
      ...s,
      text: overrides.skipEmptyColumns as boolean
    }));
  }

  if (overrides.variableColors !== undefined) {
    chartSettings.variableColors = overrides.variableColors;
  }

  const booleanFields: (keyof SchemaOverrides)[] = [
    "noIndentPattern",
    "negativeChk",
    "doPopups",
    "enEventColBG",
    "enChartLegend",
    "enPriority",
    "enHideBlockLable"
  ];

  for (const key of booleanFields) {
    const val = overrides[key];
    if (val !== undefined) {
      chartSettings[key] = val as never;
    }
  }
}

function validateChartSettings(chartSettings: ChartSettingsInfoTSC, primaryUnit: string) {
  const topAgeEntry = chartSettings.topAge.find((t) => t.unit === primaryUnit);
  const baseAgeEntry = chartSettings.baseAge.find((b) => b.unit === primaryUnit);
  const topAge = topAgeEntry?.text;
  const baseAge = baseAgeEntry?.text;

  if (topAge !== undefined && (topAge < 0 || topAge > 4600)) {
    throw new Error("topAge must be between 0 and 4600");
  }
  if (baseAge !== undefined && (baseAge < 0 || baseAge > 4600)) {
    throw new Error("baseAge must be between 0 and 4600");
  }
  if (topAge !== undefined && baseAge !== undefined && topAge >= baseAge) {
    throw new Error("topAge must be less than baseAge");
  }

  for (const entry of chartSettings.unitsPerMY) {
    const uiValue = entry.text / 30;
    if (uiValue <= 0 || uiValue > 50) {
      throw new Error("unitsPerMY must be between 0 and 50");
    }
  }
}

export type ChartEditOptions = {
  hideDatapackDefaults?: boolean;
};

function shouldPreserveColumnOn(col: ColumnInfo): boolean {
  if (col.name === "Chart Root" || col.name === "Chart Title" || col.name === "Ma") {
    return true;
  }
  if (col.columnDisplayType === "Ruler") {
    return true;
  }
  return false;
}

function setAllColumnsOff(columnRoot: ColumnInfo): void {
  const visit = (col: ColumnInfo) => {
    if (!shouldPreserveColumnOn(col)) {
      col.on = false;
    }
    if (col.children) {
      col.children.forEach(visit);
    }
  };
  visit(columnRoot);
}

export function applyBlankSlateColumns(columnRoot: ColumnInfo, hideDatapackDefaults: boolean | undefined): void {
  if (!hideDatapackDefaults) {
    return;
  }

  setAllColumnsOff(columnRoot);
}

export async function generateChartWithEdits(
  datapacks: Datapack[],
  overrides: SchemaOverrides,
  columnToggles: ColumnToggles,
  options?: ChartEditOptions
): Promise<string> {
  const normalizedOverrides: SchemaOverrides = (overrides as unknown as { overrides?: SchemaOverrides })?.overrides
    ? (overrides as unknown as { overrides?: SchemaOverrides }).overrides ?? {}
    : overrides ?? {};
  const normalizedToggles: ColumnToggles = (columnToggles as unknown as { columnToggles?: ColumnToggles })
    ?.columnToggles
    ? (columnToggles as unknown as { columnToggles?: ColumnToggles }).columnToggles ?? {}
    : columnToggles ?? {};

  const { columnRoot, chartSettings } = extractSettingsComponents(datapacks);
  const primaryUnit = datapacks[0] && datapacks.length > 0 ? datapacks[0].ageUnits : "Ma";

  applyBlankSlateColumns(columnRoot, options?.hideDatapackDefaults);

  if (Object.keys(normalizedToggles).length > 0) {
    applyTogglesToColumnInfo(columnRoot, normalizedToggles);
  }

  if (Object.keys(normalizedOverrides).length > 0) {
    applyOverridesToChartSettings(chartSettings, normalizedOverrides, primaryUnit);
  }

  validateChartSettings(chartSettings, primaryUnit);

  const xml = jsonToXml(columnRoot, chartSettings);

  return xml;
}

function flattenColumnsInternal(columns: ColumnInfo[], parentPath: string): FlattenedColumn[] {
  const result: FlattenedColumn[] = [];

  columns.forEach((col) => {
    const path = parentPath ? `${parentPath} > ${col.editName || col.name}` : col.editName || col.name;
    result.push({
      id: col.name,
      name: col.editName || col.name,
      path,
      on: col.on,
      enableTitle: col.enableTitle,
      type: col.columnDisplayType
    });

    if (col.children && col.children.length > 0) {
      result.push(...flattenColumnsInternal(col.children, path));
    }
  });

  return result;
}

export function listColumns(datapacks: Datapack[]): FlattenedColumn[] {
  const columnRoot = mergeDatapackColumns(datapacks);
  return flattenColumnsInternal(columnRoot.children, "");
}
