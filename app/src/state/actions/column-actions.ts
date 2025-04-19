import { action, observable } from "mobx";
import { state } from "../state";
import {
  ChronSettings,
  ColumnInfo,
  ColumnInfoTSC,
  DataMiningChronDataType,
  DataMiningPointDataType,
  DataMiningSettings,
  EventColumnInfoTSC,
  EventFrequency,
  EventSettings,
  PointColumnInfoTSC,
  PointSettings,
  RGB,
  RangeSettings,
  SequenceSettings,
  ValidFontOptions,
  assertChronColumnInfoTSC,
  assertChronSettings,
  assertEventColumnInfoTSC,
  assertEventSettings,
  assertPointColumnInfoTSC,
  assertPointSettings,
  assertRulerSettings,
  assertSequenceColumnInfoTSC,
  assertSequenceSettings,
  assertSubChronInfoArray,
  assertSubEventInfoArray,
  assertSubPointInfoArray,
  assertZoneSettings,
  calculateAutoScale,
  convertPointTypeToPointShape,
  defaultPointSettings,
  isDataMiningChronDataType,
  isDataMiningPointDataType,
  isEventFrequency
} from "@tsconline/shared";
import { cloneDeep } from "lodash";
import {
  DataMiningStatisticApproach,
  EventSearchInfo,
  GroupedEventSearchInfo,
  WindowStats,
  convertDataMiningPointDataTypeToDataMiningStatisticApproach
} from "../../types";
import {
  computeWindowStatistics,
  computeWindowStatisticsForDataPoints,
  findRangeOfWindowStats
} from "../../util/data-mining";
import { getRegex, yieldControl } from "../../util";
import { altUnitNamePrefix } from "../../util/constant";
import { discardTscPrefix, findSerialNum, prependDualColCompColumnName } from "../../util/util";

function extractName(text: string): string {
  return text.substring(text.indexOf(":") + 1, text.length);
}
function extractColumnType(text: string): string {
  return text.substring(text.indexOf(".") + 1, text.indexOf(":"));
}

function setColumnProperties(column: ColumnInfo, settings: ColumnInfoTSC) {
  setEditName(settings.title, column);
  setEnableTitle(settings.drawTitle, column);
  if ("showUncertaintyLabels" in column) setShowUncertaintyLabels(settings.drawUncertaintyLabel, column);
  if ("showAgeLabels" in column) setShowAgeLabels(settings.drawAgeLabel, column);
  setColumnOn(settings.isSelected, column);
  if (settings.width && column.children.length == 0) setWidth(settings.width, column);
  if (settings.backgroundColor.text) {
    setRGB(settings.backgroundColor.text, column);
  } else {
    setRGB({ r: 255, g: 255, b: 255 }, column);
  }
  column.fontsInfo = cloneDeep(settings.fonts);
  switch (extractColumnType(settings._id)) {
    case "EventColumn":
      assertEventColumnInfoTSC(settings);
      assertEventSettings(column.columnSpecificSettings);
      if (column.columnSpecificSettings)
        setEventColumnSettings(column.columnSpecificSettings, {
          type: settings.type,
          rangeSort: settings.rangeSort,
          drawDualColCompColumn: settings.drawDualColCompColumn
        });
      break;
    case "PointColumn":
      assertPointColumnInfoTSC(settings);
      assertPointSettings(column.columnSpecificSettings);
      setPointColumnSettings(column.columnSpecificSettings, {
        drawLine: settings.drawLine,
        drawFill: settings.drawFill,
        drawScale: settings.drawScale,
        drawCurveGradient: settings.drawCurveGradient,
        drawBackgroundGradient: settings.drawBgrndGradient,
        backgroundGradientStart: settings.backGradStart,
        backgroundGradientEnd: settings.backGradEnd,
        curveGradientStart: settings.curveGradStart,
        curveGradientEnd: settings.curveGradEnd,
        lineColor: settings.lineColor,
        flipScale: settings.flipScale,
        scaleStart: settings.scaleStart,
        scaleStep: settings.scaleStep,
        fill: settings.fillColor,
        pointShape: settings.drawPoints === false ? "nopoints" : convertPointTypeToPointShape(settings.pointType),
        smoothed: settings.drawSmooth,
        lowerRange: settings.minWindow,
        upperRange: settings.maxWindow,
        isDataMiningColumn: settings.isDataMiningColumn,
        drawDualColCompColumn: settings.drawDualColCompColumn
      });
      break;
    case "SequenceColumn":
      assertSequenceColumnInfoTSC(settings);
      assertSequenceSettings(column.columnSpecificSettings);
      setSequenceColumnSettings(column.columnSpecificSettings, {
        labelMarginLeft: settings.labelMarginLeft,
        labelMarginRight: settings.labelMarginRight,
        graphStyle: settings.graphStyle,
        drawNameLabel: settings.drawNameLabel,
        type: settings.type
      });
      break;
  }
}

//key: column name found in the loaded settings xml (Has "Overlay for" as prepend)
//value: loaded settings for the found column
const dualColCompFoundCache = new Map<string, PointColumnInfoTSC | EventColumnInfoTSC>();

//key: column name (of column that has value in drawDualColComp tag)
//value:  draw dual col comp value (the column to compare)
const dualColCompRefCache = new Map<string, string>();

export function addColumnToDualColCompCache(settings: ColumnInfoTSC) {
  const columnName = extractName(settings._id);
  switch (extractColumnType(settings._id)) {
    case "PointColumn":
      assertPointColumnInfoTSC(settings);
      if (settings.isDualColCompColumn) {
        dualColCompFoundCache.set(columnName, settings);
      }
      if (settings.drawDualColCompColumn) {
        dualColCompRefCache.set(columnName, settings.drawDualColCompColumn);
      }
      break;
    case "EventColumn":
      assertEventColumnInfoTSC(settings);
      if (settings.isDualColCompColumn) {
        dualColCompFoundCache.set(columnName, settings);
      }
      if (settings.drawDualColCompColumn) {
        dualColCompRefCache.set(columnName, settings.drawDualColCompColumn);
      }
      break;
  }
}

export function handleDualColCompColumns() {
  //shortest to largest name
  const sortedRefNameList = Array.from(dualColCompRefCache.keys()).sort((a, b) => a.length - b.length);
  for (const name of sortedRefNameList) {
    const refCol = state.settingsTabs.columnHashMap.get(name);
    const refInfo = dualColCompRefCache.get(name);
    if (!refCol) {
      //also could not be in selected datapacks, so commented since many of these columns could exist
      //console.error("DualColComp reference column is not in state");
      continue;
    }
    if (!refInfo) {
      console.error("While handling dual col comp columns, failed to find refInfo for reference column");
      continue;
    }

    switch (refCol.columnDisplayType) {
      case "Event":
        assertEventSettings(refCol.columnSpecificSettings);
        refCol.columnSpecificSettings.drawDualColCompColumn = refInfo;
        break;
      case "Point":
        assertPointSettings(refCol.columnSpecificSettings);
        refCol.columnSpecificSettings.drawDualColCompColumn = refInfo;
        break;
      default:
        console.error("while handling dual col comp columns, refCol did not have display type Event or Point");
        continue;
    }
    const dualColumnName = addDualColCompColumn(refCol);
    if (!dualColumnName) {
      console.error("while handling dual col comp columns, failed to add dual col comp column");
      continue;
    }
    const createdDualColumn = state.settingsTabs.columnHashMap.get(dualColumnName);
    if (!createdDualColumn) {
      console.error("while handling dual col comp columns, failed to access created dual col comp column from state");
      continue;
    }
    const foundDualColumn = dualColCompFoundCache.get(dualColumnName);
    if (!foundDualColumn) {
      console.error(
        "While handling dual col comp columns, name of created dcc column does not match any dcc columns in loaded settings"
      );
      continue;
    }

    //remove any duplicate dual col comp column (a column can only have one)
    if (!refCol.parent) {
      console.warn("WARNING: tried to add a dual col comp column to a column with no parent");
      return;
    }
    const parent = state.settingsTabs.columnHashMap.get(refCol.parent);
    if (!parent) {
      console.warn("WARNING: tried to get", refCol.parent, "in state.settingsTabs.columnHashMap, but is undefined");
      return;
    }
    let index = 0;
    let numOfDcc = 0;
    while (index < parent.children.length) {
      if (parent.children[index].name.localeCompare(dualColumnName) === 0) {
        numOfDcc++;
        //the "add dcc function" inserts the dcc right after the reference column, so we can check for the correct dcc
        //by checking if the previous column is the reference column (here we are checking the opposite to remove duplicate dcc)
        if (index === 0 || (index > 0 && parent.children[index - 1].name.localeCompare(refCol.name) !== 0)) {
          parent.children.splice(index, 1);
          continue;
        }
      }
      index++;
    }
    //one from the app, one from loaded settings, more than that shouldn't be possible
    if (numOfDcc > 2) {
      console.warn("WARNING: while handling dual col comp, found more than two dcc");
    }
    setColumnProperties(createdDualColumn, foundDualColumn);
  }
  //reset cache
  dualColCompFoundCache.clear();
  dualColCompRefCache.clear();
}

const dataminingFoundCache = new Map<string, PointColumnInfoTSC>();

//key: column name
//existingDataMiningType: indicates the datamining column (if it exists) that references the key.
//loadedDataMiningType: the type of datamining column to draw according to the loaded settings
const dataMiningRefCache = new Map<
  string,
  {
    existingDataMiningType: EventFrequency | DataMiningChronDataType | DataMiningPointDataType | null;
    loadedDataMiningType: EventFrequency | DataMiningChronDataType | DataMiningPointDataType;
  }
>();

//TODO: maybe ask user to confirm overwrite of datamining columns

export function handleDataMiningColumns() {
  //shortest to largest name
  const sortedRefNameList = Array.from(dataMiningRefCache.keys()).sort((a, b) => a.length - b.length);
  for (const name of sortedRefNameList) {
    const refCol = state.settingsTabs.columnHashMap.get(name);
    const refInfo = dataMiningRefCache.get(name);
    if (!refCol) {
      //also could not be in selected datapacks, so commented since many of these columns could exist
      //console.error("Datamining reference column is not in state");
      continue;
    }
    if (!refInfo) {
      console.error("While handling datamining columns, failed to find refInfo for reference column");
      continue;
    }
    const { existingDataMiningType, loadedDataMiningType } = refInfo;
    let dmName: string | undefined = undefined;
    try {
      dmName = addDataMiningColumn(refCol, loadedDataMiningType);
    } catch (e) {
      console.error(e);
      continue;
    }
    if (!dmName) {
      console.error("While handling datamining columns, failed to add datamining column");
      continue;
    }
    const createdDmColumn = state.settingsTabs.columnHashMap.get(dmName);
    if (!createdDmColumn) {
      console.error("while handling datamining columns, failed to access created datamining column from state");
      continue;
    }
    const foundDmColumn = dataminingFoundCache.get(dmName);
    if (!foundDmColumn) {
      console.error(
        "While handling datamining columns, name of created datamining column does not match any datamining columns in loaded settings"
      );
      continue;
    }

    setColumnProperties(createdDmColumn, foundDmColumn);
    //this means there was a datamine column for the refcol before loading settings, so remove it since we only have one datamine at a time
    if (existingDataMiningType) removeDataMiningColumn(refCol, existingDataMiningType);

    try {
      switch (refCol.columnDisplayType) {
        case "Event":
          assertEventSettings(refCol.columnSpecificSettings);
          if (isEventFrequency(loadedDataMiningType)) refCol.columnSpecificSettings.frequency = loadedDataMiningType;
          break;
        case "Chron":
          assertChronSettings(refCol.columnSpecificSettings);
          if (isDataMiningChronDataType(loadedDataMiningType))
            refCol.columnSpecificSettings.dataMiningChronDataType = loadedDataMiningType;
          break;
        case "Point":
          assertPointSettings(refCol.columnSpecificSettings);
          if (isDataMiningPointDataType(loadedDataMiningType))
            refCol.columnSpecificSettings.dataMiningPointDataType = loadedDataMiningType;
          break;
        default:
          console.log("WARNING: datamining reference column's type is not event, chron, or point");
      }
    } catch (e) {
      console.error(e);
    }
  }
  //reset cache
  dataminingFoundCache.clear();
  dataMiningRefCache.clear();
}

export function addColumnToDataMiningCache(settings: ColumnInfoTSC) {
  const columnName = extractName(settings._id);
  const column = state.settingsTabs.columnHashMap.get(columnName);
  switch (extractColumnType(settings._id)) {
    case "EventColumn":
      assertEventColumnInfoTSC(settings);
      if (settings.drawExtraColumn) {
        //column in state and column in loaded settings that have same name (unique identifier per column) could have different types
        //if loaded settings came from a different datapack
        if (!column) {
          dataMiningRefCache.set(columnName, {
            existingDataMiningType: null,
            loadedDataMiningType: settings.drawExtraColumn
          });
        }
        if (column && column.columnDisplayType === "Event") {
          assertEventSettings(column.columnSpecificSettings);
          dataMiningRefCache.set(columnName, {
            existingDataMiningType: column.columnSpecificSettings.frequency,
            loadedDataMiningType: settings.drawExtraColumn
          });
        }
      }
      break;
    case "ChronColumn":
      assertChronColumnInfoTSC(settings);
      if (settings.drawExtraColumn) {
        if (!column) {
          dataMiningRefCache.set(columnName, {
            existingDataMiningType: null,
            loadedDataMiningType: settings.drawExtraColumn
          });
        }
        if (column && column.columnDisplayType === "Chron") {
          assertChronSettings(column.columnSpecificSettings);
          dataMiningRefCache.set(columnName, {
            existingDataMiningType: column.columnSpecificSettings.dataMiningChronDataType,
            loadedDataMiningType: settings.drawExtraColumn
          });
        }
      }
      break;
    case "PointColumn":
      assertPointColumnInfoTSC(settings);
      if (settings.drawExtraColumn) {
        if (!column) {
          dataMiningRefCache.set(columnName, {
            existingDataMiningType: null,
            loadedDataMiningType: settings.drawExtraColumn
          });
        }
        if (column && column.columnDisplayType === "Point") {
          assertPointSettings(column.columnSpecificSettings);
          dataMiningRefCache.set(columnName, {
            existingDataMiningType: column.columnSpecificSettings.dataMiningPointDataType,
            loadedDataMiningType: settings.drawExtraColumn
          });
        }
      }
      if (settings.isDataMiningColumn) {
        dataminingFoundCache.set(columnName, settings);
      }
  }
}

/**
 * applys the chart column settings from a settings file to the
 * columninfo stored in state.
 *
 * @param settings settings that is being applied to the current column
 * @param parent parent of current column, used for creating datamining column
 *
 */

export const applyChartColumnSettings = action("applyChartColumnSettings", (settings: ColumnInfoTSC) => {
  const columnName = extractName(settings._id);
  let curcol: ColumnInfo | undefined =
    state.settingsTabs.columnHashMap.get(columnName) ||
    state.settingsTabs.columnHashMap.get("Chart Title in " + columnName);
  if (curcol) {
    setColumnProperties(curcol, settings);
  }

  addColumnToDataMiningCache(settings);

  addColumnToDualColCompCache(settings);

  if (extractColumnType(settings._id) === "BlockSeriesMetaColumn") {
    for (let i = 0; i < settings.children.length; i++) {
      const child = settings.children[i];
      const childName = extractName(child._id);
      curcol = state.settingsTabs.columnHashMap.get(columnName + " " + childName);
      if (curcol) setColumnProperties(curcol, child);

      addColumnToDataMiningCache(child);
    }
  } else {
    for (let i = 0; i < settings.children.length; i++) {
      applyChartColumnSettings(settings.children[i]);
    }
  }
});

/**
 * aligns the row order of the columns to the order specified by the loaded settings file
 * moves any rows in the column that's not in the settings file to the bottom (same as jar)
 */

export const applyRowOrder = action(
  "applyRowOrder",
  async (column: ColumnInfo | undefined, settings: ColumnInfoTSC, counter = { count: 0 }) => {
    if (!column) return;
    //needed since number of children in column and settings file could be different
    let columnIndex = 0;
    for (const settingsChild of settings.children) {
      await yieldControl(counter, 30);
      if (columnIndex === column.children.length) break;

      let childName = extractName(settingsChild._id);
      //for manually changed columns (facies, chron, etc.)
      if (extractColumnType(settings._id) === "BlockSeriesMetaColumn") {
        //change name for facies, chron, member, and labels (keep name same for blank, age, datamining column)
        if (["Facies", "Chron", "Members", "Facies Label", "Series Label", "Chron Label"].includes(childName))
          childName = extractName(settings._id) + " " + childName;
      }
      //for chart titles with different units
      else if (!column.parent) {
        if (state.settingsTabs.columnHashMap.get(altUnitNamePrefix + childName))
          childName = altUnitNamePrefix + childName;
      }
      let indexOfMatch = -1;
      //column doesn't exist in the childrens of loaded column, so skip
      if ((indexOfMatch = column.children.slice(columnIndex).findIndex((child) => child.name === childName)) === -1) {
        continue;
      }
      indexOfMatch += columnIndex;
      //place matched column into correct position
      if (indexOfMatch != columnIndex) {
        [column.children[columnIndex], column.children[indexOfMatch]] = [
          column.children[indexOfMatch],
          column.children[columnIndex]
        ];
      }
      await applyRowOrder(column.children[columnIndex], settingsChild, counter);
      columnIndex++;
    }
  }
);

export const initializeColumnHashMap = action(async (columnInfo: ColumnInfo, counter = { count: 0 }) => {
  await yieldControl(counter, 30);

  state.settingsTabs.columnHashMap.set(columnInfo.name, columnInfo);
  for (const childColumn of columnInfo.children) {
    await initializeColumnHashMap(childColumn, counter);
  }
});

/*
 * toggles the "on" state for a column that had its checkbox clicked
 * name: the name of the toggled column
 * parents: list of names that indicates the path from top to the toggled column
 */

export const toggleSettingsTabColumn = action(
  (
    columnOrName: ColumnInfo | string,
    options?: {
      hashMap?: Map<string, ColumnInfo>;
    }
  ) => {
    let column: ColumnInfo | undefined;
    const columnHashMap = options?.hashMap || state.settingsTabs.columnHashMap;
    if (typeof columnOrName === "string") {
      column = columnHashMap.get(columnOrName);
      if (!column) {
        console.log("WARNING: Column with name", columnOrName, "not found in columnHashMap.");
        return;
      }
    } else {
      column = columnOrName;
    }

    column.on = !column.on;
    if (!column.on || !column.parent) return;
    if (columnHashMap.get(column.parent) === undefined) {
      console.log("WARNING: tried to get", column.parent, "in hashMap, but is undefined");
      return;
    } else column = columnHashMap.get(column.parent!)!;
    while (column) {
      if (!column.on) column.on = true;
      if (!column.parent) break;
      if (columnHashMap.get(column.parent) === undefined) {
        console.log("WARNING: tried to get", column.parent, "in columnHashMap, but is undefined");
        return;
      } else column = columnHashMap.get(column.parent!)!;
    }
  }
);
export const setSequenceColumnSettings = action(
  (sequenceSettings: SequenceSettings, newSettings: Partial<SequenceSettings>) => {
    Object.assign(sequenceSettings, newSettings);
  }
);
export const setEventColumnSettings = action((eventSettings: EventSettings, newSettings: Partial<EventSettings>) => {
  Object.assign(eventSettings, newSettings);
});

export const setChronColumnSettings = action((chronSettings: ChronSettings, newSettings: Partial<ChronSettings>) => {
  Object.assign(chronSettings, newSettings);
});

export const setDataMiningSettings = action(
  (dataMiningSettings: DataMiningSettings, newSettings: Partial<DataMiningSettings>) => {
    Object.assign(dataMiningSettings, newSettings);
  }
);

export const setPointColumnSettings = action((pointSettings: PointSettings, newSettings: Partial<PointSettings>) => {
  Object.assign(pointSettings, newSettings);
});
export const setRangeColumnSettings = action((rangeSettings: RangeSettings, newSettings: Partial<RangeSettings>) => {
  Object.assign(rangeSettings, newSettings);
});
export const setColumnOn = action((isOn: boolean, column: ColumnInfo) => {
  column.on = isOn;
});
export const setEditName = action((newName: string, column: ColumnInfo) => {
  column.editName = newName;
});

export const setAutoScale = action((pointSettings: PointSettings) => {
  const { lowerRange, upperRange, scaleStep, scaleStart } = calculateAutoScale(pointSettings.minX, pointSettings.maxX);
  pointSettings.scaleStep = scaleStep;
  pointSettings.lowerRange = lowerRange;
  pointSettings.upperRange = upperRange;
  pointSettings.scaleStart = scaleStart;
});

export const flipRange = action((pointSettings: PointSettings) => {
  const temp = pointSettings.lowerRange;
  pointSettings.lowerRange = pointSettings.upperRange;
  pointSettings.upperRange = temp;
  pointSettings.flipScale = !pointSettings.flipScale;
});

export const setWidth = action((newWidth: number, column: ColumnInfo) => {
  column.width = newWidth;
});

export const setColumnSelected = action((name: string) => {
  state.columnMenu.columnSelected = name;
  const column = state.settingsTabs.columnHashMap.get(name);
  setColumnMenuTabValue(0);
  setColumnMenuTabs(["General", "Font"]);
  if (column) {
    switch (column.columnDisplayType) {
      case "Chron":
        setColumnMenuTabs(["General", "Font", "Data Mining"]);
        break;
      case "Event":
        setColumnMenuTabs(["General", "Font", "Data Mining", "Overlay"]);
        break;
      case "Point":
        setColumnMenuTabs(["General", "Font", "Curve Drawing", "Data Mining", "Overlay"]);
        break;
      default:
        setColumnMenuTabs(["General", "Font"]);
    }
  } else {
    console.log("WARNING: state.settingsTabs.columnHashMap does not have", name);
  }
  console.log(column?.columnSpecificSettings);
});
export const setColumnMenuTabs = action((tabs: string[]) => {
  state.columnMenu.tabs = tabs;
});
export const setColumnMenuTabValue = action((tabValue: number) => {
  state.columnMenu.tabValue = tabValue;
});

let searchColumnsAbortController: AbortController | null = null;
export const searchColumns = action(async (searchTerm: string, counter = { count: 0 }) => {
  if (searchColumnsAbortController) searchColumnsAbortController.abort();
  searchColumnsAbortController = new AbortController();
  setColumnSearchTerm(searchTerm);
  if (searchTerm === "") {
    state.settingsTabs.columnHashMap.forEach((columnInfo) => {
      setExpanded(false, columnInfo);
      setShow(true, columnInfo);
    });
    if (!state.settingsTabs.columns) return;
    for (const child of state.settingsTabs.columns.children) {
      setExpanded(true, child);
    }
    return;
  }
  for (const columnInfo of state.settingsTabs.columnHashMap.values()) {
    await yieldControl(counter, 30);
    setShow(false, columnInfo);
    setExpanded(false, columnInfo);
  }

  const regExp = getRegex(searchTerm);

  for (const columnInfo of state.settingsTabs.columnHashMap.values()) {
    await yieldControl(counter, 30);
    if (columnInfo.show != true && (regExp.test(columnInfo.name) || regExp.test(columnInfo.editName))) {
      setShow(true, columnInfo);
      setExpanded(true, columnInfo);
      let parentName = columnInfo.parent;
      await setExpansionOfAllChildren(columnInfo, false);
      await setShowOfAllChildren(columnInfo, true);
      while (parentName) {
        const parentColumnInfo = state.settingsTabs.columnHashMap.get(parentName);
        if (parentColumnInfo && !parentColumnInfo.expanded && !parentColumnInfo.show) {
          setShow(true, parentColumnInfo);
          setExpanded(true, parentColumnInfo);
          parentName = parentColumnInfo.parent;
        } else {
          break;
        }
      }
    }
  }
  searchColumnsAbortController = null;
});

/**
 * adds a dual col comp / overlay column. The properties of the given column are copied over.
 * the minAge and maxAge are set to the minAge and maxAge of the overlay for time checking purposes.
 */

export const addDualColCompColumn = action((column: ColumnInfo) => {
  if (column.columnDisplayType === "Event") {
    assertEventSettings(column.columnSpecificSettings);
    if (column.columnSpecificSettings.drawDualColCompColumn === null) {
      console.warn("WARNING: tried to add a dual col comp column, but did not specify which column to compare");
      return;
    }
  } else if (column.columnDisplayType === "Point") {
    assertPointSettings(column.columnSpecificSettings);
    if (column.columnSpecificSettings.drawDualColCompColumn === null) {
      console.warn("WARNING: tried to add a dual col comp column, but did not specify which column to compare");
      return;
    }
  } else {
    console.warn("WARNING: tried to add a dual col comp column to a column that is not an event or point column");
    return;
  }
  if (!column.parent) {
    console.warn("WARNING: tried to add a dual col comp column to a column with no parent");
    return;
  }
  const parent = state.settingsTabs.columnHashMap.get(column.parent);
  if (!parent) {
    console.warn("WARNING: tried to get", column.parent, "in state.settingsTabs.columnHashMap, but is undefined");
    return;
  }
  const index = parent.children.findIndex((child) => child.name === column.name);
  if (index === -1) {
    console.warn(
      "WARNING: ",
      column.name,
      "not found in parent's children when attempting to add dual col comp column"
    );
    return;
  }
  const overlayColumn = state.settingsTabs.columnHashMap.get(
    discardTscPrefix(column.columnSpecificSettings.drawDualColCompColumn)
  );
  if (!overlayColumn) {
    console.warn(
      "WARNING: tried to get",
      discardTscPrefix(column.columnSpecificSettings.drawDualColCompColumn),
      "in state.settingsTabs.columnHashMap, but is undefined"
    );
    return;
  }
  const dualColCompColumnName = prependDualColCompColumnName(column.name);
  const dualColCompColumn: ColumnInfo = observable({
    ...cloneDeep(column),
    name: dualColCompColumnName,
    editName: dualColCompColumnName,
    minAge: overlayColumn.minAge,
    maxAge: overlayColumn.maxAge,
    enableTitle: true,
    rgb: {
      r: 255,
      g: 255,
      b: 255
    }
  });
  if (column.columnDisplayType === "Event") {
    dualColCompColumn.columnDisplayType = "Event";
    assertEventSettings(column.columnSpecificSettings);
    dualColCompColumn.columnSpecificSettings = {
      ...cloneDeep(column.columnSpecificSettings),
      drawDualColCompColumn: null,
      dualColCompColumnRef: column.name
    };
  } else if (column.columnDisplayType === "Point") {
    dualColCompColumn.columnDisplayType = "Point";
    assertPointSettings(column.columnSpecificSettings);
    dualColCompColumn.columnSpecificSettings = {
      ...cloneDeep(column.columnSpecificSettings),
      drawDualColCompColumn: null,
      dualColCompColumnRef: column.name
    };
  }
  parent.children.splice(index + 1, 0, dualColCompColumn);
  state.settingsTabs.columnHashMap.set(dualColCompColumnName, dualColCompColumn);
  return dualColCompColumnName;
});

export const removeDualColCompColumn = action((column: ColumnInfo) => {
  if (!column.parent) {
    console.log("WARNING: tried to remove a dual col comp column from a column with no parent");
    return;
  }
  const parent = state.settingsTabs.columnHashMap.get(column.parent);
  if (!parent) {
    console.log("WARNING: tried to get", column.parent, "in state.settingsTabs.columnHashMap, but is undefined");
    return;
  }
  const columnToRemove = prependDualColCompColumnName(column.name);
  const index = parent.children.findIndex((child) => child.name === columnToRemove);
  if (index === -1) {
    return;
  }
  parent.children.splice(index, 1);
  state.settingsTabs.columnHashMap.delete(columnToRemove);
});

export const addDataMiningColumn = action(
  (column: ColumnInfo, type: EventFrequency | DataMiningPointDataType | DataMiningChronDataType) => {
    if (
      column.columnDisplayType !== "Event" &&
      column.columnDisplayType !== "Point" &&
      column.columnDisplayType !== "Chron"
    ) {
      console.log(
        "WARNING: tried to add a data mining column to a column that is not an event, chron, or point column"
      );
      return;
    }
    if (!column.parent) {
      console.log("WARNING: tried to add a data mining column to a column with no parent");
      return;
    }
    const parent = state.settingsTabs.columnHashMap.get(column.parent);
    if (!parent) {
      console.log("WARNING: tried to get", column.parent, "in state.settingsTabs.columnHashMap, but is undefined");
      return;
    }
    const index = parent.children.findIndex((child) => child.name === column.name);
    if (index === -1) {
      console.log("WARNING: ", column.name, "not found in parent's children when attempting to add data mining column");
      return;
    }
    const dataMiningColumnName = `${type} for ${column.columnDisplayType === "Chron" ? parent.name : column.name}`;
    let fill: RGB = cloneDeep(defaultPointSettings.fill);
    let windowStats: WindowStats[] = [];
    let stat: DataMiningStatisticApproach;
    switch (column.columnDisplayType) {
      case "Event": {
        assertEventSettings(column.columnSpecificSettings);
        assertSubEventInfoArray(column.subInfo);
        if (!isEventFrequency(type)) {
          console.log("WARNING: unknown event frequency associated with an event", type);
          return;
        }
        //in order to make the result the same as the jar, we need to have filtered data for events
        const eventData = column.subInfo
          .filter((subEvent) => {
            if (type === "Combined Events") return true;
            else return subEvent.subEventType === type;
          })
          .map((subEvent) => subEvent.age)
          .filter((age) => {
            return (
              age >= state.settings.timeSettings[column.units].topStageAge &&
              age <= state.settings.timeSettings[column.units].baseStageAge
            );
          });
        windowStats = computeWindowStatistics(
          eventData,
          column.columnSpecificSettings.windowSize,
          column.columnSpecificSettings.stepSize,
          "frequency"
        );
        stat = "frequency";
        switch (type) {
          case "FAD":
            fill = {
              r: 0,
              g: 255,
              b: 0
            };
            break;
          case "LAD":
            fill = {
              r: 255,
              g: 0,
              b: 0
            };
            break;
          case "Combined Events":
            fill = {
              r: 0,
              g: 0,
              b: 255
            };
        }
        break;
      }

      case "Point": {
        assertPointSettings(column.columnSpecificSettings);
        assertSubPointInfoArray(column.subInfo);
        if (!isDataMiningPointDataType(type)) {
          console.log("WARNING: unknown data mining type associated with a point", type);
          return;
        }
        //in order to make the result the same as the jar, we do not filter data for points, instead we remove the first and the last data point.
        const pointData = column.subInfo.map((subPoint) => {
          return { age: subPoint.age, value: subPoint.xVal };
        });
        pointData.shift();
        pointData.pop();
        windowStats = computeWindowStatisticsForDataPoints(
          pointData,
          column.columnSpecificSettings.windowSize,
          column.columnSpecificSettings.stepSize,
          convertDataMiningPointDataTypeToDataMiningStatisticApproach(type)
        );
        stat = convertDataMiningPointDataTypeToDataMiningStatisticApproach(type);
        switch (type) {
          case "Frequency":
            fill = {
              r: 255,
              g: 0,
              b: 0
            };
            break;
          case "Minimum Value":
            fill = {
              r: 0,
              g: 255,
              b: 0
            };
            break;
          case "Maximum Value":
            fill = {
              r: 0,
              g: 0,
              b: 255
            };
            break;
          case "Average Value":
            fill = {
              r: 0,
              g: 200,
              b: 255
            };
            break;
          case "Rate of Change":
            fill = {
              r: 0,
              g: 255,
              b: 255
            };
            break;
        }
        break;
      }

      case "Chron": {
        assertChronSettings(column.columnSpecificSettings);
        assertSubChronInfoArray(column.subInfo);
        if (!isDataMiningChronDataType(type)) {
          console.log("WARNING: unknown data mining type associated with a chron column", type);
          return;
        }
        fill = {
          r: 247,
          g: 202,
          b: 201
        };
        //in order to make the result the same as the jar, we do not filter data for chrons, instead we remove the first and the last data point.
        const chronData = column.subInfo.map((subChron) => subChron.age);
        chronData.shift();
        chronData.pop();
        windowStats = computeWindowStatistics(
          chronData,
          column.columnSpecificSettings.windowSize,
          column.columnSpecificSettings.stepSize,
          "frequency"
        );
        stat = "frequency";
        break;
      }

      default:
        console.log("WARNING: unknown column display type", column.columnDisplayType);
        return;
    }
    const { min, max } = findRangeOfWindowStats(
      windowStats,
      state.settings.timeSettings[column.units].topStageAge,
      state.settings.timeSettings[column.units].baseStageAge,
      stat
    );
    const { lowerRange, upperRange, scaleStep, scaleStart } = calculateAutoScale(min, max);
    const dataMiningColumn: ColumnInfo = observable({
      ...cloneDeep(column),
      name: dataMiningColumnName,
      editName: dataMiningColumnName,
      enableTitle: true,
      columnDisplayType: "Point",
      rgb: {
        r: 255,
        g: 255,
        b: 255
      },
      columnSpecificSettings: {
        ...cloneDeep(defaultPointSettings),
        minX: min,
        maxX: max,
        fill,
        // TODO change these to auto scale
        lowerRange,
        upperRange,
        scaleStep,
        scaleStart,
        isDataMiningColumn: true
      }
    });
    parent.children.splice(index + 1, 0, dataMiningColumn);
    state.settingsTabs.columnHashMap.set(dataMiningColumnName, dataMiningColumn);
    return dataMiningColumnName;
  }
);

export const removeDataMiningColumn = action((column: ColumnInfo, type: string) => {
  if (!column.parent) {
    console.log("WARNING: tried to remove a data mining column from a column with no parent");
    return;
  }
  const parent = state.settingsTabs.columnHashMap.get(column.parent);
  if (!parent) {
    console.log("WARNING: tried to get", column.parent, "in state.settingsTabs.columnHashMap, but is undefined");
    return;
  }
  const columnToRemove =
    column.columnDisplayType !== "Chron" ? type + " for " + column.name : type + " for " + parent.name;
  const index = parent.children.findIndex((child) => child.name === columnToRemove);
  if (index === -1) {
    return;
  }
  parent.children.splice(index, 1);
  state.settingsTabs.columnHashMap.delete(columnToRemove);
});

export const addBlankColumn = action((column: ColumnInfo) => {
  if (column.children.length == 0) {
    console.log("WARNING: tried to add a blank column to a column with no children");
    return;
  }
  let serialNumber = 1;
  const largestExistingSerialNum = column.children.findLastIndex(
    (child) => /^Blank \d+ for .+$/.test(child.name) && child.columnDisplayType === "Data"
  );
  if (largestExistingSerialNum > -1) {
    serialNumber = findSerialNum(column.children[largestExistingSerialNum].name) + 1;
  }
  const blankColumnName = "Blank " + `${serialNumber}` + " for " + column.name;
  const blankColumn: ColumnInfo = observable({
    ...cloneDeep(column),
    on: true,
    children: [],
    subInfo: [],
    parent: column.name,
    popup: "",
    name: blankColumnName,
    editName: "Blank " + `${serialNumber}`,
    enableTitle: true,
    columnDisplayType: "Data",
    width: 100,
    rgb: {
      r: 255,
      g: 255,
      b: 255
    }
  });

  column.children.splice(column.children.length, 0, blankColumn);
  state.settingsTabs.columnHashMap.set(blankColumnName, blankColumn);
});
export const addAgeColumn = action((column: ColumnInfo) => {
  if (column.children.length == 0) {
    console.log("WARNING: tried to add an age column to a column with no children");
    return;
  }

  let serialNumber = 1;
  const largestExistingSerialNum = column.children.findLastIndex(
    (child) => /^Age \d+ for .+$/.test(child.name) && child.columnDisplayType === "Ruler"
  );
  if (largestExistingSerialNum > -1) {
    serialNumber = findSerialNum(column.children[largestExistingSerialNum].name) + 1;
  }
  const ageColumnName = "Age " + `${serialNumber}` + " for " + column.name;
  const ageColumn: ColumnInfo = observable({
    ...cloneDeep(column),
    on: true,
    children: [],
    parent: column.name,
    subInfo: [],
    popup: "",
    name: ageColumnName,
    editName: "Age",
    enableTitle: true,
    columnDisplayType: "Ruler",
    width: undefined,
    rgb: {
      r: 255,
      g: 255,
      b: 255
    },
    columnSpecificSettings: {
      justification: "left"
    }
  });
  column.children.splice(column.children.length, 0, ageColumn);
  state.settingsTabs.columnHashMap.set(ageColumnName, ageColumn);
});
export const makeColumnPath = action((name: string): string[] => {
  const columnPath: string[] = [];
  let column = state.settingsTabs.columnHashMap.get(name);
  if (!column) {
    return [];
  }
  while (column.name !== "Chart Root") {
    columnPath.push(column.editName);
    column = state.settingsTabs.columnHashMap.get(column.parent!);
    if (!column) break;
  }
  return columnPath;
});
let searchEventsAbortController: AbortController | null = null;
export const searchEvents = action(async (searchTerm: string, counter = { count: 0 }) => {
  if (searchEventsAbortController) searchEventsAbortController.abort();
  searchEventsAbortController = new AbortController();
  setEventSearchTerm(searchTerm);
  let count = 0;
  if (state.settingsTabs.eventSearchTerm === "") return 0;
  const regExp = getRegex(state.settingsTabs.eventSearchTerm);

  //key: column name/event name
  //info: info found in subinfo array
  const results = new Map<string, EventSearchInfo[]>();

  for (const columnInfo of state.settingsTabs.columnHashMap.values()) {
    await yieldControl(counter, 30);
    if (columnInfo.name === "Chart Root") {
      continue;
    }
    if (regExp.test(columnInfo.name) || regExp.test(columnInfo.editName)) {
      //for column names
      const id = columnInfo.editName + " - " + "Column";
      if (!results.has(id)) {
        results.set(id, []);
      }
      results.get(id)!.push({
        id: count,
        columnName: columnInfo.name,
        columnPath: makeColumnPath(columnInfo.name),
        unit: columnInfo.units
      });
      count++;
    }
    if (columnInfo.subInfo) {
      //skip since subInfo is not associated with this but the app does it for map points
      if (columnInfo.columnDisplayType === "MetaColumn") {
        continue;
      }
      for (let i = 0; i < columnInfo.subInfo.length; i++) {
        const subInfo = columnInfo.subInfo[i];
        if ("label" in subInfo && subInfo.label) {
          if (regExp.test(subInfo.label)) {
            const resultType = columnInfo.columnDisplayType === "Zone" ? "Block" : columnInfo.columnDisplayType;
            const resInfo: EventSearchInfo = {
              id: count,
              columnName: columnInfo.name,
              columnPath: makeColumnPath(columnInfo.name),
              unit: columnInfo.units
            };

            //facies/chron label doesn't have subinfo because they are block type but its parent has facies/chron info, so access it through BlockSeriesMetaColumn
            if (columnInfo.columnDisplayType === "BlockSeriesMetaColumn") {
              if (state.settingsTabs.columnHashMap.get(columnInfo.name + " Facies Label")) {
                resInfo.columnPath = makeColumnPath(columnInfo.name + " Facies Label");
                resInfo.columnName = columnInfo.name + " Facies Label";
              } else if (state.settingsTabs.columnHashMap.get(columnInfo.name + " Chron Label")) {
                resInfo.columnPath = makeColumnPath(columnInfo.name + " Chron Label");
                resInfo.columnName = columnInfo.name + " Chron Label";
              } else {
                console.error(
                  "While searching, could not find Facies or Chron label for " +
                    columnInfo.name +
                    " but should have found it"
                );
                continue;
              }
            }
            if ("age" in subInfo) {
              //facies and chron label show up as block, so find ranges for them too
              if (resultType === "Block" || columnInfo.columnDisplayType === "BlockSeriesMetaColumn") {
                if (i > 0) {
                  const nextBlock = columnInfo.subInfo[i - 1];
                  if ("age" in nextBlock) resInfo.age = { topAge: nextBlock.age, baseAge: subInfo.age };
                } else resInfo.age = { topAge: subInfo.age, baseAge: subInfo.age };
              } else {
                resInfo.age = { topAge: subInfo.age, baseAge: subInfo.age };
              }
            }
            if ("subEventType" in subInfo) {
              resInfo.type = subInfo.subEventType;
            }
            if ("popup" in subInfo) {
              resInfo.notes = subInfo.popup;
            }
            //same special case as above
            const key =
              resultType === "BlockSeriesMetaColumn"
                ? subInfo.label + " - " + "Block"
                : subInfo.label + " - " + resultType;
            if (!results.has(key)) {
              results.set(key, []);
            }
            const eventGroup = results.get(key)!;
            eventGroup.push(resInfo);
            count++;
          }
        }
      }
    }
  }

  const groupedEvents: GroupedEventSearchInfo[] = [];
  results.forEach((info: EventSearchInfo[], key: string) => {
    groupedEvents.push({ key: key, info: [...info] });
  });
  setGroupedEvents(groupedEvents);
  searchEventsAbortController = null;
  return count;
});

export const setGroupedEvents = action((groupedEvents: GroupedEventSearchInfo[]) => {
  state.settingsTabs.groupedEvents = groupedEvents;
});

export const changeAgeColumnJustification = action((column: ColumnInfo, newJustification: "left" | "right") => {
  if (column.columnDisplayType !== "Ruler" || !/^Age \d+ for .+$/.test(column.name)) {
    console.log("WARNING: tried to change justification on a column which is not Age");
    return;
  }
  assertRulerSettings(column.columnSpecificSettings);
  column.columnSpecificSettings.justification = newJustification;
});
export const changeZoneColumnOrientation = action((column: ColumnInfo, newOrientation: "normal" | "vertical") => {
  if (column.columnDisplayType !== "Zone") {
    console.log("WARNING: tried to change orientation on a column which is not Zone");
    return;
  }
  assertZoneSettings(column.columnSpecificSettings);
  column.columnSpecificSettings.orientation = newOrientation;
});
export const setShowOfAllChildren = action(async (column: ColumnInfo, isShown: boolean, counter = { count: 0 }) => {
  column.show = isShown;
  await yieldControl(counter, 30);
  for (const child of column.children) {
    await setShowOfAllChildren(child, isShown, counter);
  }
});

export const setExpansionOfAllChildren = action(
  async (column: ColumnInfo, isExpanded: boolean, counter = { count: 0 }) => {
    column.expanded = isExpanded;
    await yieldControl(counter, 30);
    for (const child of column.children) {
      await setExpansionOfAllChildren(child, isExpanded, counter);
    }
  }
);

export const setInheritable = action((target: ValidFontOptions, isInheritable: boolean, column: ColumnInfo) => {
  column.fontsInfo[target].inheritable = isInheritable;
});

export const setFontOptionOn = action((target: ValidFontOptions, isOn: boolean, column: ColumnInfo) => {
  column.fontsInfo[target].on = isOn;
});

export const setFontFace = action(
  (target: ValidFontOptions, face: "Arial" | "Courier" | "Verdana", column: ColumnInfo) => {
    column.fontsInfo[target].fontFace = face;
  }
);

export const setFontSize = action((target: ValidFontOptions, fontSize: number, column: ColumnInfo) => {
  column.fontsInfo[target].size = fontSize;
});

export const setBold = action((target: ValidFontOptions, isBold: boolean, column: ColumnInfo) => {
  column.fontsInfo[target].bold = isBold;
});

export const setItalic = action((target: ValidFontOptions, isItalic: boolean, column: ColumnInfo) => {
  column.fontsInfo[target].italic = isItalic;
});

export const setColor = action((target: ValidFontOptions, color: string, column: ColumnInfo) => {
  column.fontsInfo[target].color = color;
});

export const setEnableTitle = action((isOn: boolean, column: ColumnInfo) => {
  column.enableTitle = isOn;
});

export const setRGB = action((color: RGB, column: ColumnInfo) => {
  column.rgb = color;
});

export const setShow = action((show: boolean, column: ColumnInfo) => {
  column.show = show;
});

export const setExpanded = action((expanded: boolean, column: ColumnInfo) => {
  column.expanded = expanded;
});

export const setShowAgeLabels = action((isOn: boolean, column: ColumnInfo) => {
  column.showAgeLabels = isOn;
});

export const setShowUncertaintyLabels = action((isOn: boolean, column: ColumnInfo) => {
  column.showUncertaintyLabels = isOn;
});

export const setColumnSearchTerm = action((term: string) => {
  state.settingsTabs.columnSearchTerm = term;
});

export const setEventSearchTerm = action((term: string) => {
  state.settingsTabs.eventSearchTerm = term;
});

// The following settings should wrap around if it overflows. Ex: last element that gets decremeneted should go to the top
export const incrementColumnPosition = action((column: ColumnInfo) => {
  const parent = state.settingsTabs.columnHashMap.get(column.parent!);
  if (!parent) return;
  const index = parent.children.indexOf(column);
  if (index > 0) {
    // If it's not the first element, swap with the previous one
    [parent.children[index], parent.children[index - 1]] = [parent.children[index - 1], parent.children[index]];
  } else if (index === 0) {
    const firstElement = parent.children.shift();
    if (firstElement) {
      parent.children.push(firstElement);
    }
  }
});

export const decrementColumnPosition = action((column: ColumnInfo) => {
  const parent = state.settingsTabs.columnHashMap.get(column.parent!);
  if (!parent) return;
  const index = parent.children.indexOf(column);
  if (index < parent.children.length - 1 && index !== -1) {
    // If it's not the last element, swap with the next one
    [parent.children[index], parent.children[index + 1]] = [parent.children[index + 1], parent.children[index]];
  } else if (index === parent.children.length - 1) {
    const lastElement = parent.children.pop();
    if (lastElement) {
      parent.children.unshift(lastElement);
    }
  }
});
