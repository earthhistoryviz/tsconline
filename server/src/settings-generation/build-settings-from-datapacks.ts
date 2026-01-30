import {
  ColumnInfo,
  Datapack,
  defaultChartSettingsInfoTSC,
  ChartSettingsInfoTSC,
  defaultColumnRootConstant,
  FontsInfo
} from "@tsconline/shared";
import _ from "lodash";

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
