import { action, observable } from "mobx";
import { state } from "../state";
import {
  ChronSettings,
  ColumnInfo,
  ColumnInfoTSC,
  DataMiningChronDataType,
  DataMiningPointDataType,
  DataMiningSettings,
  EventFrequency,
  EventSettings,
  PointSettings,
  RGB,
  RangeSettings,
  SequenceSettings,
  ValidFontOptions,
  assertChronSettings,
  assertEventColumnInfoTSC,
  assertEventSettings,
  assertPointColumnInfoTSC,
  assertPointSettings,
  assertSequenceColumnInfoTSC,
  assertSequenceSettings,
  assertSubChronInfoArray,
  assertSubEventInfoArray,
  assertSubPointInfoArray,
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
  WindowStats,
  convertDataMiningPointDataTypeToDataMiningStatisticApproach
} from "../../types";
import {
  computeWindowStatistics,
  computeWindowStatisticsForDataPoints,
  findRangeOfWindowStats
} from "../../util/data-mining";
import { yieldControl } from "../../util";
import { altUnitNamePrefix } from "../../util/constant";

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
        setEventColumnSettings(column.columnSpecificSettings, { type: settings.type, rangeSort: settings.rangeSort });
      break;
    case "PointColumn":
      {
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
          upperRange: settings.maxWindow
        });
      }
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
export const applyChartColumnSettings = action("applyChartColumnSettings", (settings: ColumnInfoTSC) => {
  const columnName = extractName(settings._id);
  let curcol: ColumnInfo | undefined =
    state.settingsTabs.columnHashMap.get(columnName) ||
    state.settingsTabs.columnHashMap.get("Chart Title in " + columnName);
  if (curcol === undefined) {
    //const errorDesc: string = "Unknown column name found while loading settings: ";
    //makes website super slow if a lot of unknown columns (ex. if loaded settings for a different datapack)
    //pushSnackbar(errorDesc + columnName.substring(0, snackbarTextLengthLimit - errorDesc.length - 1), "warning");
  } else setColumnProperties(curcol, settings);
  if (extractColumnType(settings._id) === "BlockSeriesMetaColumn") {
    for (let i = 0; i < settings.children.length; i++) {
      curcol = state.settingsTabs.columnHashMap.get(columnName + " " + extractName(settings.children[i]._id));
      if (curcol !== undefined) setColumnProperties(curcol, settings.children[i]);
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

export const toggleSettingsTabColumn = action((column: ColumnInfo) => {
  column.on = !column.on;
  if (!column.on || !column.parent) return;
  if (state.settingsTabs.columnHashMap.get(column.parent) === undefined) {
    console.log("WARNING: tried to get", column.parent, "in state.settingsTabs.columnHashMap, but is undefined");
    return;
  } else column = state.settingsTabs.columnHashMap.get(column.parent!)!;
  while (column) {
    if (!column.on) column.on = true;
    if (!column.parent) break;
    if (state.settingsTabs.columnHashMap.get(column.parent) === undefined) {
      console.log("WARNING: tried to get", column.parent, "in state.settingsTabs.columnHashMap, but is undefined");
      return;
    } else column = state.settingsTabs.columnHashMap.get(column.parent!)!;
  }
});
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
  state.settingsTabs.columnSelected = name;
  if (!state.settingsTabs.columnHashMap.has(name)) {
    console.log("WARNING: state.settingsTabs.columnHashMap does not have", name);
  }
});

export const searchColumns = action(async (searchTerm: string, counter = { count: 0 }) => {
  await yieldControl(counter, 30);
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
    setShow(false, columnInfo);
    setExpanded(false, columnInfo);
  }

  for (const columnInfo of state.settingsTabs.columnHashMap.values()) {
    if (columnInfo.show != true && columnInfo.name.toLowerCase().includes(searchTerm.toLowerCase())) {
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
  }
);

export const removeDataMiningColumn = action((column: ColumnInfo, type: string) => {
  const columnToRemove = type + " for " + column.name;
  if (!column.parent) {
    console.log("WARNING: tried to remove a data mining column from a column with no parent");
    return;
  }
  const parent = state.settingsTabs.columnHashMap.get(column.parent);
  if (!parent) {
    console.log("WARNING: tried to get", column.parent, "in state.settingsTabs.columnHashMap, but is undefined");
    return;
  }
  const index = parent.children.findIndex((child) => child.name === columnToRemove);
  if (index === -1) {
    return;
  }
  parent.children.splice(index, 1);
  state.settingsTabs.columnHashMap.delete(columnToRemove);
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

export const setEventInContext = action((inContext: boolean) => {
  state.settingsTabs.eventInContext = inContext;
});

export const InsertEventInContextTopList = action((term: { key: string; age: number }, unit: string) => {
  if (!state.settingsTabs.eventInContextTopList) {
    state.settingsTabs.eventInContextTopList = { [unit]: [term] };
  } else if (!state.settingsTabs.eventInContextTopList[unit]) {
    state.settingsTabs.eventInContextTopList[unit] = [term];
  } else {
    const topList = state.settingsTabs.eventInContextTopList[unit];
    const prevLength = topList.length;
    let index = 0;
    for (index; index < topList.length; index++) {
      const compareEvent = topList[index];
      if (term.age === compareEvent.age && term.key === compareEvent.key) {
        return;
      } else if (term.age <= compareEvent.age) {
        topList.splice(index, 0, term);
        break;
      }
    }
    if (index === prevLength) {
      topList.push(term);
    }
  }
});

export const InsertEventInContextBaseList = action((term: { key: string; age: number }, unit: string) => {
  if (!state.settingsTabs.eventInContextBaseList) {
    state.settingsTabs.eventInContextBaseList = { [unit]: [term] };
  } else if (!state.settingsTabs.eventInContextBaseList[unit]) {
    state.settingsTabs.eventInContextBaseList[unit] = [term];
  } else {
    const baseList = state.settingsTabs.eventInContextBaseList[unit];
    const prevLength = baseList.length;
    let index = 0;
    for (index; index < baseList.length; index++) {
      const compareEvent = baseList[index];
      if (term.age === compareEvent.age && term.key === compareEvent.key) {
        return;
      } else if (term.age >= compareEvent.age) {
        baseList.splice(index, 0, term);
        break;
      }
    }
    if (index === prevLength) {
      baseList.push(term);
    }
  }
});

export const removeEventInContextTopList = action((term: { key: string; age: number }, unit: string) => {
  if (!state.settingsTabs.eventInContextTopList || !state.settingsTabs.eventInContextTopList[unit]) {
    return;
  } else {
    const topList = state.settingsTabs.eventInContextTopList[unit];
    for (let i = 0; i < topList.length; i++) {
      const compareEvent = topList[i];
      if (term.key === compareEvent.key && term.age === compareEvent.age) {
        topList.splice(i, 1);
      }
    }
    if (topList.length === 0) {
      delete state.settingsTabs.eventInContextTopList[unit];
    }
  }
});

export const removeEventInContextBaseList = action((term: { key: string; age: number }, unit: string) => {
  if (!state.settingsTabs.eventInContextBaseList || !state.settingsTabs.eventInContextBaseList[unit]) {
    return;
  } else {
    const baseList = state.settingsTabs.eventInContextBaseList[unit];
    for (let i = 0; i < baseList.length; i++) {
      const compareEvent = baseList[i];
      if (term.key === compareEvent.key && term.age === compareEvent.age) {
        baseList.splice(i, 1);
      }
    }
    if (baseList.length === 0) {
      delete state.settingsTabs.eventInContextBaseList[unit];
    }
  }
});

export const resetEventInContextLists = action(() => {
  state.settingsTabs.eventInContextBaseList = null;
  state.settingsTabs.eventInContextTopList = null;
});

export const createAgeBeforeContext = action(() => {
  for (const unit in state.settings.timeSettings) {
    const unitAges = state.settings.timeSettings[unit];
    if (!state.settingsTabs.ageBeforeContext) {
      state.settingsTabs.ageBeforeContext = {
        [unit]: { topAge: unitAges.topStageAge, baseAge: unitAges.baseStageAge }
      };
    } else {
      state.settingsTabs.ageBeforeContext[unit] = { topAge: unitAges.topStageAge, baseAge: unitAges.baseStageAge };
    }
  }
});

export const resetAgeBeforeContext = action(() => {
  state.settingsTabs.ageBeforeContext = null;
});

export const initAddSearchResultToChart = action((count: number) => {
  for (let i = 0; i < count; i++) {
    state.settingsTabs.addSearchResultToChart.push(false);
  }
});

export const setAddSearchResultToChart = action((term: boolean, index: number) => {
  if (index < 0 || index >= state.settingsTabs.addSearchResultToChart.length) return;
  state.settingsTabs.addSearchResultToChart[index] = term;
});

export const resetAddSearchResultToChart = action(() => {
  state.settingsTabs.addSearchResultToChart = [];
});

export const incrementColumnPosition = action((column: ColumnInfo) => {
  const parent = state.settingsTabs.columnHashMap.get(column.parent!);
  if (!parent) return;
  const index = parent.children.indexOf(column);
  if (index > 0) {
    [parent.children[index], parent.children[index - 1]] = [parent.children[index - 1], parent.children[index]];
  }
});

export const decrementColumnPosition = action((column: ColumnInfo) => {
  const parent = state.settingsTabs.columnHashMap.get(column.parent!);
  if (!parent) return;
  const index = parent.children.indexOf(column);
  if (index < parent.children.length - 1 && index > -1) {
    [parent.children[index], parent.children[index + 1]] = [parent.children[index + 1], parent.children[index]];
  }
});
