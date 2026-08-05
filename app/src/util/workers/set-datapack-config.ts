import {
  ColumnInfo,
  Datapack,
  DatapackConfigForChartRequest,
  FontsInfo,
  MapHierarchy,
  MapInfo,
  convertDatapackConfigForChartRequestToUniqueDatapackIdentifier,
  defaultColumnRoot
} from "@tsconline/shared";
import {
  ColumnInfoRoot,
  SetDatapackConfigCompleteMessage,
  SetDatapackConfigMessage,
  SetDatapackConfigReturnValue,
  assertColumnInfoRoot,
  assertSetDatapackConfigReturnValue
} from "../../types";
import { cloneDeep } from "lodash";
import { getDatapackFromArray } from "../../state/non-action-util";
import { attachTscPrefixToName } from "../../state/non-action-util";

type MergeResult = "added" | "replaced" | "did_nothing";

type ColumnInfoWithPossibleIds = ColumnInfo & {
  originalTscId?: string;
};

function isMetaLikeColumn(column: ColumnInfo): boolean {
  return (
    column.columnDisplayType === "MetaColumn" ||
    column.columnDisplayType === "BlockSeriesMetaColumn" ||
    column.columnDisplayType === "RootColumn"
  );
}

function addColumnLikeJava(parent: ColumnInfo, incoming: ColumnInfo, addNotClaimed: boolean): MergeResult {
  for (let index = 0; index < parent.children.length; index += 1) {
    const child = parent.children[index]!;

    if (child.name.localeCompare(incoming.name, undefined, { sensitivity: "accent" }) === 0) {
      incoming.parent = parent.name;
      parent.children[index] = incoming;
      return "replaced";
    }

    if (isMetaLikeColumn(child)) {
      const result = addColumnLikeJava(child, incoming, false);
      if (result !== "did_nothing") {
        return result;
      }
    }
  }

  if (addNotClaimed) {
    incoming.parent = parent.name;
    parent.children.push(incoming);
    return "added";
  }

  return "did_nothing";
}

function mergeColumnsLikeJava(parent: ColumnInfo, incomingChildren: ColumnInfo[]): void {
  for (const incoming of incomingChildren) {
    addColumnLikeJava(parent, incoming, true);
  }
}

function preserveOriginalTscIds(column: ColumnInfo): void {
  const columnWithOriginalId = column as ColumnInfoWithPossibleIds;
  if (!columnWithOriginalId.originalTscId) {
    columnWithOriginalId.originalTscId = attachTscPrefixToName(column.name, column.columnDisplayType);
  }
  for (const child of column.children) {
    preserveOriginalTscIds(child);
  }
}

function uniquifyColumnNames(root: ColumnInfo): void {
  const usedNames = new Set<string>();

  const visit = (column: ColumnInfo, parentDisplayName?: string, preserveRootName: boolean = false) => {
    const originalName = column.name;
    if (!preserveRootName && usedNames.has(originalName)) {
      if (!column.editName) {
        column.editName = originalName;
      }
      const contextualBase = parentDisplayName ? `${originalName} for ${parentDisplayName}` : originalName;
      let candidate = contextualBase;
      let serial = 2;
      while (usedNames.has(candidate)) {
        candidate = `${contextualBase} (${serial})`;
        serial += 1;
      }
      column.name = candidate;
    }

    usedNames.add(column.name);

    const currentDisplayName = column.editName || column.name;
    for (const child of column.children) {
      child.parent = column.name;
      visit(child, currentDisplayName);
    }
  };

  visit(root, undefined, true);
}

/**
 * sets chart to newval and requests info on the datapacks from the server
 */
self.onmessage = async (e: MessageEvent<SetDatapackConfigMessage>) => {
  const { datapacks, datapacksArray } = e.data;

  const timeoutThreshold = 120000; // 2 min
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error("Function timed out after" + timeoutThreshold + " ms"));
    }, timeoutThreshold);
  });
  const message: SetDatapackConfigCompleteMessage = { status: "success", value: undefined };
  async function runWithTimeout() {
    try {
      const result = await Promise.race([setDatapackConfig(datapacks, datapacksArray), timeoutPromise]);
      if (result) {
        assertSetDatapackConfigReturnValue(result);
        message.value = result;
      } else {
        message.status = "failure";
      }
    } catch (error) {
      console.error(error);
      message.status = "failure";
    }
  }
  await runWithTimeout();
  self.postMessage(message);
};
const setDatapackConfig = (datapacks: DatapackConfigForChartRequest[], datapacksArray: Datapack[]) => {
  const unitMap: Map<string, ColumnInfoRoot> = new Map();
  const mapInfo: MapInfo = {};
  const mapHierarchy: MapHierarchy = {};
  let foundDefaultAge = false;
  const columnRoot: ColumnInfo = cloneDeep(defaultColumnRoot);
  // all chart root font options have inheritable on
  for (const opt in columnRoot.fontsInfo) {
    columnRoot.fontsInfo[opt as keyof FontsInfo].inheritable = true;
  }
  // add everything together
  // uses preparsed data on server start and appends items together
  for (const datapackConfigForChartRequest of datapacks) {
    const datapack = getDatapackFromArray(datapackConfigForChartRequest, datapacksArray);
    if (!datapack) throw new Error(`File requested doesn't exist on server: ${datapack}`);
    if (
      ((datapack.topAge || datapack.topAge === 0) && (datapack.baseAge || datapack.baseAge === 0)) ||
      datapack.verticalScale
    )
      foundDefaultAge = true;
    if (unitMap.has(datapack.ageUnits)) {
      const existingUnitColumnInfo = unitMap.get(datapack.ageUnits);
      if (!existingUnitColumnInfo) throw new Error("existingUnitColumnInfo is undefined");
      const newUnitChart = datapack.columnInfo;
      const columnsToAdd = cloneDeep(newUnitChart.children.slice(1));
      // Java recursively merges duplicate-named columns while loading datapacks.
      // Mirror that behavior here so the app tree matches the live TSC tree
      // before we serialize settings.tsc.
      mergeColumnsLikeJava(existingUnitColumnInfo, columnsToAdd);
      existingUnitColumnInfo.datapackUniqueIdentifiers.push(
        convertDatapackConfigForChartRequestToUniqueDatapackIdentifier(datapackConfigForChartRequest)
      );
    } else {
      const columnInfo = cloneDeep(datapack.columnInfo);
      columnInfo.parent = columnRoot.name;
      (columnInfo as ColumnInfoRoot).datapackUniqueIdentifiers = [
        convertDatapackConfigForChartRequestToUniqueDatapackIdentifier(datapackConfigForChartRequest)
      ];
      assertColumnInfoRoot(columnInfo);
      unitMap.set(datapack.ageUnits, columnInfo);
    }
    const mapPack = datapack.mapPack;
    Object.assign(mapInfo, mapPack.mapInfo);
    // ie. World Map is the parent in multiple map packs, so make sure it appends various children to it
    for (const parent in mapPack.mapHierarchy) {
      const children = mapPack.mapHierarchy[parent];
      if (mapHierarchy[parent]) {
        mapHierarchy[parent] = mapHierarchy[parent].concat(children);
      } else {
        mapHierarchy[parent] = children;
      }
    }
  }
  // makes sure things are named correctly for users and for the hash map to not have collisions
  for (const [unit, column] of unitMap) {
    if (unit.toLowerCase() !== "ma" && column.name === "Chart Title") {
      column.name = column.name + " in " + unit;
      column.editName = unit;
      for (const child of column.children) {
        child.parent = column.name;
      }
    }
    columnRoot.fontOptions = Array.from(new Set([...columnRoot.fontOptions, ...column.fontOptions]));
    columnRoot.children.push(column);
  }

  // Different datapacks can reuse the same visible column labels. Give them unique
  // internal names before the UI builds a name-keyed hash map, while keeping editName
  // intact so the chart labels shown to the user do not change.
  preserveOriginalTscIds(columnRoot);
  uniquifyColumnNames(columnRoot);

  const returnValue: SetDatapackConfigReturnValue = {
    columnRoot: columnRoot,
    foundDefaultAge: foundDefaultAge,
    mapHierarchy: mapHierarchy,
    datapacks: datapacks,
    mapInfo: mapInfo
  };
  return returnValue;
};
