import { action } from "mobx";
import { state } from "../state";
import {
  ColumnInfo,
  ColumnInfoTSC,
  EventSettings,
  PointSettings,
  RGB,
  ValidFontOptions,
  assertEventColumnInfoTSC,
  assertEventSettings,
  assertPointColumnInfoTSC,
  assertPointSettings,
  calculateAutoScale,
  convertPointTypeToPointShape
} from "@tsconline/shared";
import { cloneDeep } from "lodash";
import { pushSnackbar } from "./general-actions";
import { snackbarTextLengthLimit } from "../../util/constant";

function extractName(text: string): string {
  return text.substring(text.indexOf(":") + 1, text.length);
}
function extractColumnType(text: string): string {
  return text.substring(text.indexOf(".") + 1, text.indexOf(":"));
}
export const applyChartColumnSettings = action("applyChartColumnSettings", (settings: ColumnInfoTSC) => {
  function setColumnProperties(column: ColumnInfo, settings: ColumnInfoTSC) {
    setEditName(settings.title, column);
    setEnableTitle(settings.drawTitle, column);
    setShowUncertaintyLabels(settings.drawUncertaintyLabel, column);
    setShowAgeLabels(settings.drawAgeLabel, column);
    setColumnOn(settings.isSelected, column);
    if (settings.width) setWidth(settings.width, column);
    if (settings.backgroundColor.text) setRGB(settings.backgroundColor.text, column);
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
            pointShape: convertPointTypeToPointShape(settings.pointType),
            smoothed: settings.drawSmooth,
            lowerRange: settings.minWindow,
            upperRange: settings.maxWindow
          });
        }
        break;
    }
  }
  const columnName = extractName(settings._id);
  let curcol: ColumnInfo | undefined =
    state.settingsTabs.columnHashMap.get(columnName) ||
    state.settingsTabs.columnHashMap.get("Chart Title in " + columnName);
  if (curcol === undefined) {
    const errorDesc: string = "Unknown column name found while loading settings: ";
    pushSnackbar(errorDesc + columnName.substring(0, snackbarTextLengthLimit - errorDesc.length - 1), "warning");
    console.log("WARNING: tried to get", columnName, "in state.columnHashMap, but is undefined");
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

export const initializeColumnHashMap = action((columnInfo: ColumnInfo) => {
  state.settingsTabs.columnHashMap.set(columnInfo.name, columnInfo);
  for (const childColumn of columnInfo.children) {
    initializeColumnHashMap(childColumn);
  }
});

/*
 * toggles the "on" state for a column that had its checkbox clicked
 * name: the name of the toggled column
 * parents: list of names that indicates the path from top to the toggled column
 */

export const toggleSettingsTabColumn = action((name: string) => {
  let curcol: ColumnInfo;
  if (state.settingsTabs.columnHashMap.get(name) === undefined) {
    console.log("WARNING: tried to get", name, "in state.columnHashMap, but is undefined");
    return;
  } else curcol = state.settingsTabs.columnHashMap.get(name)!;
  //toggle current column, save it, and move to parent
  curcol.on = !curcol.on;
  const checkStatus = curcol.on;
  if (!curcol.parent) return;
  if (state.settingsTabs.columnHashMap.get(curcol.parent) === undefined) {
    console.log("WARNING: tried to get", curcol.parent, "in state.settingsTabs.columnHashMap, but is undefined");
    return;
  } else curcol = state.settingsTabs.columnHashMap.get(curcol.parent!)!;
  while (curcol) {
    if (!curcol.on && checkStatus === true) {
      curcol.on = true;
    }
    if (!curcol.parent) break;
    if (state.settingsTabs.columnHashMap.get(curcol.parent) === undefined) {
      console.log("WARNING: tried to get", curcol.parent, "in state.settingsTabs.columnHashMap, but is undefined");
      return;
    } else curcol = state.settingsTabs.columnHashMap.get(curcol.parent!)!;
  }
});
export const setEventColumnSettings = action((eventSettings: EventSettings, newSettings: Partial<EventSettings>) => {
  Object.assign(eventSettings, newSettings);
});

export const setPointColumnSettings = action((pointSettings: PointSettings, newSettings: Partial<PointSettings>) => {
  Object.assign(pointSettings, newSettings);
});
export const setColumnOn = action((isOn: boolean, column: ColumnInfo) => {
  column.on = isOn;
});
export const setEditName = action((newName: string, column: ColumnInfo) => {
  column.editName = newName;
});

export const setAutoScale = action((pointSettings: PointSettings) => {
  const { lowerRange, upperRange, scaleStep } = calculateAutoScale(pointSettings.minX, pointSettings.maxX);
  pointSettings.scaleStep = scaleStep;
  pointSettings.lowerRange = lowerRange;
  pointSettings.upperRange = upperRange;
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

export const searchColumns = action(async (searchTerm: string) => {
  if (searchTerm === "") {
    state.settingsTabs.columnHashMap.forEach((columnInfo) => {
      columnInfo.show = true;
      columnInfo.expanded = false;
    });
    if (!state.settingsTabs.columns) return;
    for (const child of state.settingsTabs.columns.children) {
      child.expanded = true;
    }
    return;
  }
  state.settingsTabs.columnHashMap.forEach((columnInfo) => {
    columnInfo.show = false;
    columnInfo.expanded = false;
  });

  state.settingsTabs.columnHashMap.forEach((columnInfo) => {
    if (columnInfo.show != true && columnInfo.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      columnInfo.show = true;
      columnInfo.expanded = true;
      let parentName = columnInfo.parent;
      setExpansionOfAllChildren(columnInfo, false);
      setShowOfAllChildren(columnInfo, true);
      while (parentName) {
        const parentColumnInfo = state.settingsTabs.columnHashMap.get(parentName);
        if (parentColumnInfo && !parentColumnInfo.expanded && !parentColumnInfo.show) {
          parentColumnInfo.show = true;
          parentColumnInfo.expanded = true;
          parentName = parentColumnInfo.parent;
        } else {
          break;
        }
      }
    }
  });
});

export const setShowOfAllChildren = action((column: ColumnInfo, isShown: boolean) => {
  column.show = isShown;
  column.children.forEach((child) => {
    setShowOfAllChildren(child, isShown);
  });
});

export const setExpanded = action((column: ColumnInfo, isExpanded: boolean) => {
  column.expanded = isExpanded;
});

export const setExpansionOfAllChildren = action((column: ColumnInfo, isExpanded: boolean) => {
  column.expanded = isExpanded;
  column.children.forEach((child) => {
    setExpansionOfAllChildren(child, isExpanded);
  });
});

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

export const setShowAgeLabels = action((isOn: boolean, column: ColumnInfo) => {
  column.showAgeLabels = isOn;
});

export const setShowUncertaintyLabels = action((isOn: boolean, column: ColumnInfo) => {
  column.showUncertaintyLabels = isOn;
});

export const setColumnSearchTerm = action((term: string) => {
  state.settingsTabs.columnSearchTerm = term;
});
