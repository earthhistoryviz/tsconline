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
    if (
      unitMap.has(datapack.ageUnits) ||
      unitMap.has(datapack.ageUnits.charAt(0).toUpperCase() + datapack.ageUnits.slice(1))
    ) {
      const existingUnitColumnInfo = unitMap.get(datapack.ageUnits) || unitMap.get(datapack.ageUnits.charAt(0).toUpperCase() + datapack.ageUnits.slice(1));
      const newUnitChart = datapack.columnInfo;
      // slice off the existing unit column
      const columnsToAdd = cloneDeep(newUnitChart.children.slice(1));
      for (const child of columnsToAdd) {
        child.parent = existingUnitColumnInfo.name;
      }
      existingUnitColumnInfo.children = existingUnitColumnInfo.children.concat(columnsToAdd);
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
  const returnValue: SetDatapackConfigReturnValue = {
    columnRoot: columnRoot,
    foundDefaultAge: foundDefaultAge,
    mapHierarchy: mapHierarchy,
    datapacks: datapacks,
    mapInfo: mapInfo
  };
  return returnValue;
};
