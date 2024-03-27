import { action } from "mobx";
import { state } from "../state";
import { ColumnInfo, RGB, ValidFontOptions } from "@tsconline/shared";

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

export const updateEditName = action((newName: string) => {
  if (state.settingsTabs.columnSelected === null) {
    console.log("WARNING: tried to access state.settingsTabs.columnSelected, but is null");
    return;
  }
  if (!state.settingsTabs.columnHashMap.has(state.settingsTabs.columnSelected)) {
    console.log(
      "WARNING: tried to access",
      state.settingsTabs.columnSelected,
      "in state.settingsTabs.columnHashMap, but map does not this key"
    );
  }
  state.settingsTabs.columnHashMap.get(state.settingsTabs.columnSelected)!.editName = newName;
  return;
});

export const updateWidth = action((newWidth: number) => {
  if (state.settingsTabs.columnSelected === null) {
    console.log("WARNING: tried to access state.settingsTabs.columnSelected, but is null");
    return;
  }
  if (!state.settingsTabs.columnHashMap.has(state.settingsTabs.columnSelected)) {
    console.log(
      "WARNING: tried to access",
      state.settingsTabs.columnSelected,
      "in state.settingsTabs.columnHashMap, but map does not this key"
    );
  }
  if (isNaN(newWidth)) return;
  state.settingsTabs.columnHashMap.get(state.settingsTabs.columnSelected)!.width = newWidth;
  return;
});

export const setcolumnSelected = action((name: string) => {
  state.settingsTabs.columnSelected = name;
  if (!state.settingsTabs.columnHashMap.has(name)) {
    console.log("WARNING: state.settingsTabs.columnHashMap does not have", name);
  }
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

export const setRGB = action((column: ColumnInfo, color: RGB) => {
  column.rgb = color;
});
