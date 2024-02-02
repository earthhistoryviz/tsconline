import { action, runInAction } from "mobx";
import { state, State } from "../state";
import { ColumnInfo } from "@tsconline/shared";

export const initializeColumnHashMap = action((columnInfo: ColumnInfo) => {
  state.columnHashMap.set(columnInfo.name, columnInfo);
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
  if (state.columnHashMap.get(name) === undefined) {
    console.log(
      "WARNING: tried to get",
      name,
      "in state.columnHashMap, but is undefined"
    );
    return;
  } else curcol = state.columnHashMap.get(name)!;
  //toggle current column, save it, and move to parent
  curcol.on = !curcol.on;
  console.log(curcol.on);
  let checkStatus = curcol.on;
  if (curcol.parent === null) {
    console.log(
      "WARNING: tried to access parent of ",
      curcol.name,
      "but is null"
    );
  }
  if (state.columnHashMap.get(curcol.parent) === undefined) {
    console.log(
      "WARNING: tried to get",
      curcol.parent,
      "in state.columnHashMap, but is undefined"
    );
    return;
  } else curcol = state.columnHashMap.get(curcol.parent)!;
  while (curcol.name != "Chart Root") {
    if (!curcol.on && checkStatus === true) {
      curcol.on = true;
    }
    if (curcol.parent === null) {
      console.log(
        "WARNING: tried to access parent of ",
        curcol.name,
        "but is null"
      );
    }
    if (state.columnHashMap.get(curcol.parent) === undefined) {
      console.log(
        "WARNING: tried to get",
        curcol.parent,
        "in state.columnHashMap, but is undefined"
      );
      return;
    } else curcol = state.columnHashMap.get(curcol.parent)!;
  }
});
// export const toggleSettingsTabColumn = action(
//     "toggleSettingsTabColumn",
//     (name: string, parent: ColumnInfo) => {
//   let curcol: ColumnInfo | null = state.settingsTabs.columns;
//   const orig = curcol;
//   // Walk down the path of parents in the tree of columns
//   //console.log("name: ", name);
//   let i = 1;
//   for (const item of parents) {
//     i++;
//   }
//   i = 1;
//   for (const p of parents) {
//     console.log("accessing ", p, " of count: ", i);
//     i++;
//     if (!curcol) {
//       console.log(
//         "WARNING: tried to access path at parent ",
//         p,
//         " from path ",
//         parents,
//         " in settings tabs column list, but children was null at this level."
//       );
//       return;
//     }
//     curcol = curcol["children"];
//   }
//   // console.log(JSON.stringify(curcol[name], null, 2));
//   //need this to check if curcol is null for typescript to be happy in future operations
//   if (!curcol) {
//     console.log(
//       "WARNING: tried to access path at ",
//       name,
//       "settings tabs column list, but children was null at this level."
//     );
//     return;
//   }
//   if (!curcol[name]) {
//     console.log(
//       "WARNING: tried to access name ",
//       name,
//       " from path ",
//       parents,
//       " in settings tabs column list, but object[name] was null here."
//     );
//     return;
//   }
//   curcol[name].on = !curcol[name].on;
//   // setSettingsTabsColumns(orig)
//   // console.log(JSON.stringify(curcol[name], null, 2));
//   setcolumnSelected(curcol[name].editName, parents);
//   //console.log("the selected column: ", name);
//   // console.log("state after my change: ", state);
//   //if the column is unchecked, then no need to check the parents
//   if (!curcol[name].on) {
//     //updateSettings();
//     return;
//   }
//   //since column is checked, toggle parents on if they were previously off
//   curcol = state.settingsTabs.columns;
//   for (const p of parents) {
//     if (!curcol) {
//       console.log(
//         "WARNING: tried to access path at parent ",
//         p,
//         " from path ",
//         parents,
//         " in settings tabs column list, but children was null at this level."
//       );
//       return;
//     }
//     if (!curcol[p].on) curcol[p].on = true;
//     curcol = curcol[p]["children"];
//   }
//   //updateSettings();
//     }
//   );

/**
 * Update @Jay
 */
// export const updateEditName = action((newName: string) => {
//   if (!state.settingsTabs.columnSelected) {
//     console.log("WARNING: the user hasn't selected a column.");
//     return;
//   }
//   let curcol: ColumnInfo | null = state.settingsTabs.columns;
//   let oldName = state.settingsTabs.columnSelected.name;
//   let parents = state.settingsTabs.columnSelected.parents;
//   // Walk down the path of parents in the tree of columns
//   for (const p of parents) {
//     if (!curcol) {
//       console.log(
//         "WARNING: tried to access path at parent ",
//         p,
//         " from path ",
//         parents,
//         " in settings tabs column list, but children was null at this level."
//       );
//       return;
//     }
//     curcol = curcol[p]["children"];
//   }
//   if (!curcol) {
//     console.log(
//       "WARNING: tried to access path at ",
//       oldName,
//       "settings tabs column list, but children was null at this level."
//     );
//     return;
//   }
//   if (!curcol[oldName]) {
//     console.log(
//       "WARNING: tried to access name ",
//       oldName,
//       " from path ",
//       parents,
//       " in settings tabs column list, but object[name] was null here."
//     );
//     return;
//   }
//   curcol[oldName].editName = newName;
//   console.log("edited name: ", newName);
// });
