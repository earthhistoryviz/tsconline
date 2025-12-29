import { Datapack, ColumnInfo, ChartSettingsInfoTSC } from "@tsconline/shared";

/**
 * Simplified column schema for AI to understand available columns
 */
export type ColumnSchema = {
  id: string;
  name: string;
  type: string;
  on: boolean;
  enableTitle: boolean;
  children?: ColumnSchema[];
};

/**
 * Settings schema that the AI can understand and modify
 */
export type SettingsSchema = {
  columns: ColumnSchema[];
  chartSettings: {
    topAge?: number;
    baseAge?: number;
    unitsPerMY: { unit: string; value: number }[];
    skipEmptyColumns: { unit: string; value: boolean }[];
    variableColors: string;
    noIndentPattern: boolean;
    negativeChk: boolean;
    doPopups: boolean;
    enEventColBG: boolean;
    enChartLegend: boolean;
    enPriority: boolean;
    enHideBlockLable: boolean;
  };
};

/**
 * Convert a ColumnInfo tree to a simplified schema
 */
function columnInfoToSchema(column: ColumnInfo): ColumnSchema {
  const schema: ColumnSchema = {
    id: column.name, // Use name as ID for now
    name: column.editName || column.name,
    type: column.columnDisplayType,
    on: column.on,
    enableTitle: column.enableTitle
  };

  if (column.children && column.children.length > 0) {
    schema.children = column.children.map(columnInfoToSchema);
  }

  return schema;
}

/**
 * Extract settings info to simplified schema
 */
function chartSettingsToSchema(settings: ChartSettingsInfoTSC, primaryUnit: string): SettingsSchema["chartSettings"] {
  // Find primary unit settings
  const topAgeEntry = settings.topAge.find((t) => t.unit === primaryUnit);
  const baseAgeEntry = settings.baseAge.find((b) => b.unit === primaryUnit);

  return {
    topAge: topAgeEntry?.text,
    baseAge: baseAgeEntry?.text,
    unitsPerMY: settings.unitsPerMY.map((u) => ({ unit: u.unit, value: u.text / 30 })),
    skipEmptyColumns: settings.skipEmptyColumns.map((s) => ({ unit: s.unit, value: s.text })),
    variableColors: settings.variableColors,
    noIndentPattern: settings.noIndentPattern,
    negativeChk: settings.negativeChk,
    doPopups: settings.doPopups,
    enEventColBG: settings.enEventColBG,
    enChartLegend: settings.enChartLegend,
    enPriority: settings.enPriority,
    enHideBlockLable: settings.enHideBlockLable
  };
}

/**
 * Build a settings schema from datapacks that AI can understand and modify
 */
export function buildSettingsSchema(
  columnRoot: ColumnInfo,
  chartSettings: ChartSettingsInfoTSC,
  datapacks: Datapack[]
): SettingsSchema {
  // Determine primary unit (first datapack's unit or "Ma")
  const primaryUnit = datapacks[0] && datapacks.length > 0 ? datapacks[0].ageUnits : "Ma";

  return {
    columns: columnRoot.children.map(columnInfoToSchema),
    chartSettings: chartSettingsToSchema(chartSettings, primaryUnit)
  };
}

/**
 * Apply modifications from a settings schema back to ColumnInfo tree
 */
export function applySchemaToColumnInfo(schema: ColumnSchema, columnInfo: ColumnInfo): void {
  // Apply changes to this column
  columnInfo.on = schema.on;
  columnInfo.enableTitle = schema.enableTitle;

  // Recursively apply to children
  if (schema.children && columnInfo.children) {
    for (let i = 0; i < schema.children.length && i < columnInfo.children.length; i++) {
      const schemaChild = schema.children[i];
      const columnChild = columnInfo.children[i];
      if (schemaChild && columnChild) {
        applySchemaToColumnInfo(schemaChild, columnChild);
      }
    }
  }
}

/**
 * Apply schema modifications back to chart settings
 */
export function applySchemaToChartSettings(
  schemaSettings: SettingsSchema["chartSettings"],
  chartSettings: ChartSettingsInfoTSC,
  primaryUnit: string
): void {
  // Update top/base age
  if (schemaSettings.topAge !== undefined) {
    const existingTopAge = chartSettings.topAge.find((t) => t.unit === primaryUnit);
    if (existingTopAge) {
      existingTopAge.text = schemaSettings.topAge;
    } else {
      chartSettings.topAge.push({
        source: "text",
        unit: primaryUnit,
        text: schemaSettings.topAge
      });
    }
  }

  if (schemaSettings.baseAge !== undefined) {
    const existingBaseAge = chartSettings.baseAge.find((b) => b.unit === primaryUnit);
    if (existingBaseAge) {
      existingBaseAge.text = schemaSettings.baseAge;
    } else {
      chartSettings.baseAge.push({
        source: "text",
        unit: primaryUnit,
        text: schemaSettings.baseAge
      });
    }
  }

  // Update units per MY
  for (const unitEntry of schemaSettings.unitsPerMY) {
    const existing = chartSettings.unitsPerMY.find((u) => u.unit === unitEntry.unit);
    if (existing) {
      // Schema expresses UI units; XML expects value multiplied by 30
      existing.text = unitEntry.value * 30;
    }
  }

  // Update skip empty columns
  for (const skipEntry of schemaSettings.skipEmptyColumns) {
    const existing = chartSettings.skipEmptyColumns.find((s) => s.unit === skipEntry.unit);
    if (existing) {
      existing.text = skipEntry.value;
    }
  }

  // Update boolean flags
  chartSettings.variableColors = schemaSettings.variableColors;
  chartSettings.noIndentPattern = schemaSettings.noIndentPattern;
  chartSettings.negativeChk = schemaSettings.negativeChk;
  chartSettings.doPopups = schemaSettings.doPopups;
  chartSettings.enEventColBG = schemaSettings.enEventColBG;
  chartSettings.enChartLegend = schemaSettings.enChartLegend;
  chartSettings.enPriority = schemaSettings.enPriority;
  chartSettings.enHideBlockLable = schemaSettings.enHideBlockLable;
}
