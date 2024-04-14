import { action } from "mobx";
import { state } from "../state";
import { assertFontsInfo, ColumnInfo, ValidFontOptions } from "@tsconline/shared";
import React from "react";

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

export const setFontFace = action((target: ValidFontOptions, fontFace: "Arial" | "Courier" | "Verdana") => {
  if (!state.settingsTabs.columnSelected) {
    throw new Error("state.settingsTabs.columnSelected is null");
  }

  const columnHashMapEntry = state.settingsTabs.columnHashMap.get(state.settingsTabs.columnSelected);

  if (!columnHashMapEntry) {
    throw new Error(`Entry for ${state.settingsTabs.columnSelected} not found in columnHashMap`);
  }
  assertFontsInfo(columnHashMapEntry.fontsInfo);

  columnHashMapEntry.fontsInfo[target].fontFace = fontFace;
  assertFontsInfo(columnHashMapEntry?.fontsInfo);
});

export const setFontSize = action((target: ValidFontOptions, fontSize: number) => {
  if (state.settingsTabs.columnSelected === null) {
    throw new Error("state.settingsTabs.columnSelected is null");
  }

  const columnHashMapEntry = state.settingsTabs.columnHashMap.get(state.settingsTabs.columnSelected);

  if (!columnHashMapEntry) {
    throw new Error(`Entry for ${state.settingsTabs.columnSelected} not found in columnHashMap`);
  }
  assertFontsInfo(columnHashMapEntry.fontsInfo);

  columnHashMapEntry.fontsInfo[target].size = fontSize;
  assertFontsInfo(columnHashMapEntry?.fontsInfo);
});

export const setBold = action((target: ValidFontOptions, isBold: boolean) => {
  if (state.settingsTabs.columnSelected === null) {
    throw new Error("state.settingsTabs.columnSelected is null");
  }

  const columnHashMapEntry = state.settingsTabs.columnHashMap.get(state.settingsTabs.columnSelected);

  if (!columnHashMapEntry) {
    throw new Error(`Entry for ${state.settingsTabs.columnSelected} not found in columnHashMap`);
  }
  assertFontsInfo(columnHashMapEntry.fontsInfo);

  columnHashMapEntry.fontsInfo[target].bold = isBold;
  assertFontsInfo(columnHashMapEntry?.fontsInfo);
});

export const setItalic = action((target: ValidFontOptions, isItalic: boolean) => {
  if (state.settingsTabs.columnSelected === null) {
    throw new Error("state.settingsTabs.columnSelected is null");
  }

  const columnHashMapEntry = state.settingsTabs.columnHashMap.get(state.settingsTabs.columnSelected);

  if (!columnHashMapEntry) {
    throw new Error(`Entry for ${state.settingsTabs.columnSelected} not found in columnHashMap`);
  }
  assertFontsInfo(columnHashMapEntry.fontsInfo);

  columnHashMapEntry.fontsInfo[target].italic = isItalic;
  assertFontsInfo(columnHashMapEntry?.fontsInfo);
});

export const setColor = action((target: ValidFontOptions, color: React.SetStateAction<string>) => {
  if (state.settingsTabs.columnSelected === null) {
    throw new Error("state.settingsTabs.columnSelected is null");
  }

  const columnHashMapEntry = state.settingsTabs.columnHashMap.get(state.settingsTabs.columnSelected);

  if (!columnHashMapEntry) {
    throw new Error(`Entry for ${state.settingsTabs.columnSelected} not found in columnHashMap`);
  }
  assertFontsInfo(columnHashMapEntry.fontsInfo);

  if (typeof color === "string") {
    columnHashMapEntry.fontsInfo[target].color = color;
  }
  assertFontsInfo(columnHashMapEntry?.fontsInfo);
});
