import { Datapack, ColumnInfo, ChartSettingsInfoTSC } from "@tsconline/shared";
import { mergeDatapackColumns, generateDefaultChartSettings } from "./build-settings-from-datapacks.js";
import {
  buildSettingsSchema,
  applySchemaToColumnInfo,
  applySchemaToChartSettings,
  SettingsSchema
} from "./build-settings-schema.js";
import { jsonToXml } from "./settings-to-xml.js";

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
