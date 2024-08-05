import { ColumnInfo, FontsInfo, MapHierarchy, MapInfo, defaultFontsInfo } from "@tsconline/shared";
import { State } from "../../state";
import {
  SetDatapackConfigCompleteMessage,
  SetDatapackConfigMessage,
  SetDatapackConfigCompleteValue
} from "../../types";
import { cloneDeep } from "lodash";

/**
 * sets chart to newval and requests info on the datapacks from the server
 */
self.onmessage = async (e: MessageEvent<SetDatapackConfigMessage>) => {
  const { datapacks, chartSettings, stateCopy } = e.data;
  const stateCopyObj: State = JSON.parse(stateCopy);
  const SetDatapackConfig = () => {
    const unitMap: Map<string, ColumnInfo> = new Map();
    let mapInfo: MapInfo = {};
    let mapHierarchy: MapHierarchy = {};
    let foundDefaultAge = false;
    const columnRoot: ColumnInfo = {
      name: "Chart Root",
      editName: "Chart Root",
      fontsInfo: JSON.parse(JSON.stringify(defaultFontsInfo)),
      fontOptions: ["Column Header"],
      popup: "",
      on: true,
      width: 100,
      enableTitle: true,
      rgb: {
        r: 255,
        g: 255,
        b: 255
      },
      minAge: Number.MAX_VALUE,
      maxAge: Number.MIN_VALUE,
      children: [],
      parent: null,
      units: "",
      columnDisplayType: "RootColumn",
      show: true,
      expanded: true
    };
    // all chart root font options have inheritable on
    for (const opt in columnRoot.fontsInfo) {
      columnRoot.fontsInfo[opt as keyof FontsInfo].inheritable = true;
    }
    // add everything together
    // uses preparsed data on server start and appends items together
    for (const datapack of datapacks) {
      //await new Promise((resolve) => setTimeout(resolve, 0));
      if (!datapack || !stateCopyObj.datapackIndex[datapack])
        throw new Error(`File requested doesn't exist on server: ${datapack}`);
      const datapackParsingPack = stateCopyObj.datapackIndex[datapack]!;
      if (
        ((datapackParsingPack.topAge || datapackParsingPack.topAge === 0) &&
          (datapackParsingPack.baseAge || datapackParsingPack.baseAge === 0)) ||
        datapackParsingPack.verticalScale
      )
        foundDefaultAge = true;
      if (unitMap.has(datapackParsingPack.ageUnits)) {
        const existingUnitColumnInfo = unitMap.get(datapackParsingPack.ageUnits)!;
        const newUnitChart = datapackParsingPack.columnInfo;
        // slice off the existing unit column
        const columnsToAdd = cloneDeep(newUnitChart.children.slice(1));
        for (const child of columnsToAdd) {
          child.parent = existingUnitColumnInfo.name;
        }
        existingUnitColumnInfo.children = existingUnitColumnInfo.children.concat(columnsToAdd);
      } else {
        const columnInfo = cloneDeep(datapackParsingPack.columnInfo);
        columnInfo.parent = columnRoot.name;
        unitMap.set(datapackParsingPack.ageUnits, columnInfo);
      }
      const mapPack = stateCopyObj.mapPackIndex[datapack]!;
      if (!mapInfo) mapInfo = mapPack.mapInfo;
      else Object.assign(mapInfo, mapPack.mapInfo);
      if (!mapHierarchy) mapHierarchy = mapPack.mapHierarchy;
      else Object.assign(mapHierarchy, mapPack.mapHierarchy);
    }
    // makes sure things are named correctly for users and for the hash map to not have collisions
    for (const [unit, column] of unitMap) {
      //await new Promise((resolve) => setTimeout(resolve, 0));
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
    const returnValue: SetDatapackConfigCompleteValue = {
      columnRoot: columnRoot,
      foundDefaultAge: foundDefaultAge,
      mapHierarchy: mapHierarchy,
      datapacks: datapacks,
      mapInfo: mapInfo,
      chartSettings: chartSettings
    };
    return returnValue;
  };

  const timeoutThreshold = 3000000;
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error("Function timed out after" + timeoutThreshold + " ms"));
    }, timeoutThreshold);
  });
  const message: SetDatapackConfigCompleteMessage = { status: "success", value: undefined };
  async function runWithTimeout() {
    try {
      await Promise.race([SetDatapackConfig(), timeoutPromise]);
      if (SetDatapackConfig()) {
        message.value = SetDatapackConfig();
      } else {
        message.status = "failure";
      }
    } catch (error) {
      message.status = "failure";
    }
  }
  await runWithTimeout();
  self.postMessage(message);
};
