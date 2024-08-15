import { ColumnInfo, FontsInfo, MapHierarchy, MapInfo, defaultColumnRoot } from "@tsconline/shared";
import { SetDatapackConfigCompleteMessage, SetDatapackConfigMessage, SetDatapackConfigReturnValue } from "../../types";
import { cloneDeep } from "lodash";
import { State } from "../../state";

/**
 * sets chart to newval and requests info on the datapacks from the server
 */
self.onmessage = async (e: MessageEvent<SetDatapackConfigMessage>) => {
  const { datapacks, stateCopy } = e.data;

  const timeoutThreshold = 120000; // 2 min
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error("Function timed out after" + timeoutThreshold + " ms"));
    }, timeoutThreshold);
  });
  const message: SetDatapackConfigCompleteMessage = { status: "success", value: undefined };
  async function runWithTimeout() {
    try {
      const result = await Promise.race([setDatapackConfig(datapacks, stateCopy), timeoutPromise]);
      if (result) {
        message.value = result as SetDatapackConfigReturnValue;
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
const setDatapackConfig = (datapacks: string[], stateCopy: State) => {
  const unitMap: Map<string, ColumnInfo> = new Map();
  let mapInfo: MapInfo = {};
  let mapHierarchy: MapHierarchy = {};
  let foundDefaultAge = false;
  const columnRoot: ColumnInfo = cloneDeep(defaultColumnRoot);
  // all chart root font options have inheritable on
  for (const opt in columnRoot.fontsInfo) {
    columnRoot.fontsInfo[opt as keyof FontsInfo].inheritable = true;
  }
  // add everything together
  // uses preparsed data on server start and appends items together
  for (const datapack of datapacks) {
    if (!datapack || !stateCopy.datapackIndex[datapack])
      throw new Error(`File requested doesn't exist on server: ${datapack}`);
    const baseDatapackProps = stateCopy.datapackIndex[datapack]!;
    if (
      ((baseDatapackProps.topAge || baseDatapackProps.topAge === 0) &&
        (baseDatapackProps.baseAge || baseDatapackProps.baseAge === 0)) ||
      baseDatapackProps.verticalScale
    )
      foundDefaultAge = true;
    if (unitMap.has(baseDatapackProps.ageUnits)) {
      const existingUnitColumnInfo = unitMap.get(baseDatapackProps.ageUnits)!;
      const newUnitChart = baseDatapackProps.columnInfo;
      // slice off the existing unit column
      const columnsToAdd = cloneDeep(newUnitChart.children.slice(1));
      for (const child of columnsToAdd) {
        child.parent = existingUnitColumnInfo.name;
      }
      existingUnitColumnInfo.children = existingUnitColumnInfo.children.concat(columnsToAdd);
    } else {
      const columnInfo = cloneDeep(baseDatapackProps.columnInfo);
      columnInfo.parent = columnRoot.name;
      unitMap.set(baseDatapackProps.ageUnits, columnInfo);
    }
    const mapPack = stateCopy.mapPackIndex[datapack]!;
    if (!mapInfo) mapInfo = mapPack.mapInfo;
    else Object.assign(mapInfo, mapPack.mapInfo);
    if (!mapHierarchy) mapHierarchy = mapPack.mapHierarchy;
    else Object.assign(mapHierarchy, mapPack.mapHierarchy);
  }
  // makes sure things are named correctly for users and for the hash map to not have collisions
  for (const [unit, column] of unitMap) {
    if (unit !== "Ma" && column.name === "Chart Title") {
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
