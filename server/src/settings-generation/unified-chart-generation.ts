import { Datapack, ColumnInfo, ChartSettingsInfoTSC } from "@tsconline/shared";
import { mergeDatapackColumns, generateDefaultChartSettings } from "./build-settings-from-datapacks.js";
import {
  buildSettingsSchema,
  applySchemaToColumnInfo,
  applySchemaToChartSettings,
  SettingsSchema,
  ColumnSchema
} from "./build-settings-schema.js";
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

export type ColumnToggles = {
  on?: string[];
  off?: string[];
};

export type FlattenedColumn = {
  id: string;
  name: string;
  path: string;
  on: boolean;
  enableTitle: boolean;
  type: string;
};

/**
 * Extract column root and chart settings from datapacks
 */
function extractSettingsComponents(datapacks: Datapack[]): {
  columnRoot: ColumnInfo;
  chartSettings: ChartSettingsInfoTSC;
} {
  const columnRoot = mergeDatapackColumns(datapacks);
  const chartSettings = generateDefaultChartSettings(datapacks);
  return { columnRoot, chartSettings };
}

/**
 * Get settings schema for datapacks that AI can understand
 */
export async function getDatapackSettingsSchema(datapacks: Datapack[]): Promise<SettingsSchema> {
  const { columnRoot, chartSettings } = extractSettingsComponents(datapacks);
  return buildSettingsSchema(columnRoot, chartSettings, datapacks);
}

/**
 * Generate chart with settings schema modifications
 */
export async function generateChartWithSchema(datapacks: Datapack[], settingsSchema: SettingsSchema): Promise<string> {
  const { columnRoot, chartSettings } = extractSettingsComponents(datapacks);

  // Apply schema modifications
  const primaryUnit = datapacks[0] && datapacks.length > 0 ? datapacks[0].ageUnits : "Ma";

  for (let i = 0; i < settingsSchema.columns.length && i < columnRoot.children.length; i++) {
    const columnSchema = settingsSchema.columns[i];
    const columnRootChild = columnRoot.children[i];
    if (columnSchema && columnRootChild) {
      applySchemaToColumnInfo(columnSchema, columnRootChild);
    }
  }

  // console.log("columnRoot after applying schema:", JSON.stringify(columnRoot, null, 2));

  applySchemaToChartSettings(settingsSchema.chartSettings, chartSettings, primaryUnit);

  // Convert to XML
  // console.log("chartSettings after applying schema:", JSON.stringify(chartSettings, null, 2));
  // console.log("columnRoot after applying schema:", JSON.stringify(columnRoot, null, 2));
  return jsonToXml(columnRoot, chartSettings);
}

function applyTogglesToColumns(columns: ColumnSchema[], toggles: ColumnToggles) {
  const toLowerSet = (arr?: string[]) => new Set((arr ?? []).map((v) => v.toLowerCase()));
  const idsOn = toLowerSet(toggles.on);
  const idsOff = toLowerSet(toggles.off);

  const visit = (col: ColumnSchema) => {
    const idLower = col.id.toLowerCase();

    if (idsOn.has(idLower)) col.on = true;
    if (idsOff.has(idLower)) col.on = false;

    if (col.children) {
      col.children.forEach(visit);
    }
  };

  columns.forEach(visit);
}

function applyOverrides(schema: SettingsSchema, overrides: SchemaOverrides) {
  const { chartSettings } = schema;
  if (overrides.topAge !== undefined) {
    chartSettings.topAge = overrides.topAge;
  }
  if (overrides.baseAge !== undefined) {
    chartSettings.baseAge = overrides.baseAge;
  }
  if (overrides.unitsPerMY !== undefined) {
    if (typeof overrides.unitsPerMY === "number") {
      chartSettings.unitsPerMY = chartSettings.unitsPerMY.map((u) => ({ ...u, value: overrides.unitsPerMY as number }));
    } else {
      const map = new Map(overrides.unitsPerMY.map((u) => [u.unit.toLowerCase(), u.value]));
      chartSettings.unitsPerMY = chartSettings.unitsPerMY.map((u) =>
        map.has(u.unit.toLowerCase()) ? { ...u, value: map.get(u.unit.toLowerCase()) ?? u.value } : u
      );
    }
  }

  if (overrides.skipEmptyColumns !== undefined) {
    chartSettings.skipEmptyColumns = chartSettings.skipEmptyColumns.map((s) => ({
      ...s,
      value: overrides.skipEmptyColumns as boolean
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

function validateChartSettings(schema: SettingsSchema) {
  const { topAge, baseAge, unitsPerMY } = schema.chartSettings;
  if (topAge !== undefined && (topAge < 0 || topAge > 4600)) {
    throw new Error("topAge must be between 0 and 4600");
  }
  if (baseAge !== undefined && (baseAge < 0 || baseAge > 4600)) {
    throw new Error("baseAge must be between 0 and 4600");
  }
  if (topAge !== undefined && baseAge !== undefined && topAge >= baseAge) {
    throw new Error("topAge must be less than baseAge");
  }
  for (const entry of unitsPerMY) {
    if (entry.value <= 0 || entry.value > 50) {
      throw new Error("unitsPerMY must be between 0 and 50");
    }
  }
}

export async function generateChartWithEdits(
  datapacks: Datapack[],
  overrides: SchemaOverrides,
  columnToggles: ColumnToggles
): Promise<string> {
  const normalizedOverrides: SchemaOverrides = (overrides as unknown as { overrides?: SchemaOverrides })?.overrides
    ? (overrides as unknown as { overrides?: SchemaOverrides }).overrides ?? {}
    : overrides ?? {};
  const normalizedToggles: ColumnToggles = (columnToggles as unknown as { columnToggles?: ColumnToggles })
    ?.columnToggles
    ? (columnToggles as unknown as { columnToggles?: ColumnToggles }).columnToggles ?? {}
    : columnToggles ?? {};

  const schema = await getDatapackSettingsSchema(datapacks);

  if (normalizedToggles.on?.length || normalizedToggles.off?.length) {
    applyTogglesToColumns(schema.columns, normalizedToggles);
  }

  if (Object.keys(normalizedOverrides).length > 0) {
    applyOverrides(schema, normalizedOverrides);
  }

  validateChartSettings(schema);

  return generateChartWithSchema(datapacks, schema);
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
