import {
  ColumnInfo,
  DatapackConfigForChartRequest,
  Datapack,
  defaultChartSettingsInfoTSC,
  ChartSettingsInfoTSC,
  defaultColumnRootConstant,
  ValidFontOptions,
  FontsInfo
} from "@tsconline/shared";
import { jsonToXml } from "./settings-to-xml.js";
import _ from "lodash";

/**
 * Type for tracking unit columns with their datapack identifiers
 */
type UnitColumnInfo = ColumnInfo & {
  datapackUniqueIdentifiers?: { title: string; isPublic: boolean }[];
};

/**
 * Merge multiple datapack column trees into a single root column
 * This follows the same logic as the frontend's set-datapack-config.ts
 */
export function mergeDatapackColumns(datapacks: Datapack[]): ColumnInfo {
  if (datapacks.length === 0) {
    // Return default empty root
    return _.cloneDeep(defaultColumnRootConstant);
  }

  // Start with the Chart Root structure
  const root: ColumnInfo = _.cloneDeep(defaultColumnRootConstant);
  root.name = "Chart Root";
  root.editName = "Chart Root";
  root.children = [];
  root.enableTitle = false; // Chart Root should not draw title by default
  
  // Keep font inheritance as false for Chart Root (matching preset behavior)
  for (const opt in root.fontsInfo) {
    root.fontsInfo[opt as keyof FontsInfo].inheritable = false;
  }

  // Group datapacks by their age units (same as frontend's unitMap)
  const unitMap: Map<string, UnitColumnInfo> = new Map();

  // Process each datapack
  for (const datapack of datapacks) {
    if (!datapack.columnInfo || datapack.columnInfo.children.length === 0) continue;

    const ageUnits = datapack.ageUnits;

    if (unitMap.has(ageUnits)) {
      // This unit already exists, merge children (skip the ruler column which is first child)
      const existingUnitColumnInfo = unitMap.get(ageUnits)!;
      const newUnitChart = datapack.columnInfo;
      
      // Slice off the ruler column (first child) and add the rest
      const columnsToAdd = _.cloneDeep(newUnitChart.children.slice(1));
      for (const child of columnsToAdd) {
        child.parent = existingUnitColumnInfo.name;
      }
      existingUnitColumnInfo.children = existingUnitColumnInfo.children.concat(columnsToAdd);
      
      // Track which datapacks contributed to this unit column
      if (existingUnitColumnInfo.datapackUniqueIdentifiers) {
        existingUnitColumnInfo.datapackUniqueIdentifiers.push({
          title: datapack.title,
          isPublic: datapack.isPublic
        });
      }
    } else {
      // First time seeing this unit, add the whole structure
      const columnInfo = _.cloneDeep(datapack.columnInfo) as UnitColumnInfo;
      columnInfo.parent = root.name;
      columnInfo.datapackUniqueIdentifiers = [{
        title: datapack.title,
        isPublic: datapack.isPublic
      }];
      unitMap.set(ageUnits, columnInfo);
    }
  }

  // Process the unit map to build the final structure
  for (const [unit, column] of unitMap) {
    // Rename non-Ma units to avoid collisions
    if (unit.toLowerCase() !== "ma" && column.name === "Chart Title") {
      column.name = column.name + " in " + unit;
      column.editName = unit;
      // Update parent references in children
      for (const child of column.children) {
        child.parent = column.name;
      }
    }
    
    // Merge font options from this unit column into root
    root.fontOptions = Array.from(new Set([...root.fontOptions, ...column.fontOptions]));
    
    // Add this unit column structure as a child of Chart Root
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
    // No datapacks: provide sensible defaults so charts don't span 0–4600
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

  // If AI/datapacks didn't provide ages, default to 0–10 in primary unit
  if (topAge === null || topAge === undefined) topAge = 0;
  if (baseAge === null || baseAge === undefined) baseAge = 10;

  // Add top/base ages (use "text" to match preset format)
  settings.topAge.push({ source: "text", unit: primaryUnit, text: topAge });
  settings.baseAge.push({ source: "text", unit: primaryUnit, text: baseAge });

  // Set variableColors to datapack defaultChronostrat when available (UNESCO/USGS)
  if (variableColors) {
    settings.variableColors = variableColors;
  }

  // Add unitsPerMY for each unique unit found (UI units → XML value = *30)
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

/**
 * Main function: Build settings XML from datapacks
 * @param datapacks - Array of full Datapack objects (not just metadata)
 */
export function buildSettingsFromDatapacks(datapacks: Datapack[]): string {
    // console.log("Building settings from datapacks:", datapacks.map(dp => dp.title));
    // console.log("datapacks details:", JSON.stringify(datapacks, null, 2));

  // Merge columns from all datapacks
  const columnRoot = mergeDatapackColumns(datapacks);
//   console.log("Merged column root:", JSON.stringify(columnRoot, null, 2));

  // Generate default settings
  const chartSettings = generateDefaultChartSettings(datapacks);
  console.log("Generated chart settings:", JSON.stringify(chartSettings, null, 2));

  // Convert to XML
  const settingsXml = jsonToXml(columnRoot, chartSettings);

  return settingsXml;
}
