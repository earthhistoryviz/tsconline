import { action, runInAction } from "mobx";
import { state, State } from "../state";
import { ColumnInfo } from "@tsconline/shared";

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
    console.log(
      "WARNING: tried to get",
      name,
      "in state.columnHashMap, but is undefined"
    );
    return;
  } else curcol = state.settingsTabs.columnHashMap.get(name)!;
  //toggle current column, save it, and move to parent
  curcol.on = !curcol.on;
  let checkStatus = curcol.on;
  if(!curcol.parent) return
  if (state.settingsTabs.columnHashMap.get(curcol.parent) === undefined) {
    console.log(
      "WARNING: tried to get",
      curcol.parent,
      "in state.settingsTabs.columnHashMap, but is undefined"
    );
    return;
  } else curcol = state.settingsTabs.columnHashMap.get(curcol.parent!)!;
  while (curcol) {
    if (!curcol.on && checkStatus === true) {
      curcol.on = true;
    }
    if (!curcol.parent) break
    if (state.settingsTabs.columnHashMap.get(curcol.parent) === undefined) {
      console.log(
        "WARNING: tried to get",
        curcol.parent,
        "in state.settingsTabs.columnHashMap, but is undefined"
      );
      return;
    } else curcol = state.settingsTabs.columnHashMap.get(curcol.parent!)!;
  }
});

export const updateEditName = action((newName: string) => {
  if (state.settingsTabs.columnSelected === null) {
    console.log(
      "WARNING: tried to access state.settingsTabs.columnSelected, but is null"
    );
    return;
  }
  if (!state.settingsTabs.columnHashMap.has(state.settingsTabs.columnSelected)) {
    console.log(
      "WARNING: tried to access",
      state.settingsTabs.columnSelected,
      "in state.settingsTabs.columnHashMap, but map does not this key"
    );
  }
  state.settingsTabs.columnHashMap.get(state.settingsTabs.columnSelected)!.editName =
    newName;
  return;
});

export const setcolumnSelected = action((name: string) => {
  state.settingsTabs.columnSelected = name;
  if (!state.settingsTabs.columnHashMap.has(name)) {
    console.log("WARNING: state.settingsTabs.columnHashMap does not have", name);
  }
});