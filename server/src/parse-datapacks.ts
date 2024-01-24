import { readFile } from "fs/promises";
import pmap from "p-map";
import type { ColumnInfo } from "@tsconline/shared";
import { grabFilepaths } from "./util.js";

/**
 * TODO:
 * This function is meant to catch all strange occurences at the end
 * of the tab seperated decrypted file. Should get rid of METACOLUMN_OFF
 * and any extraneuous info bits that shouldn't be a togglable column.
 * At the moment, is not currently working
 */
function spliceArrayAtFirstSpecialMatch(array: string[]): string[] {
  for (var i = 0; i < array.length; i++) {
    if (array[i]?.includes("METACOLUMN") || ((array[i]?.includes("[For details click")) && (i == array.length - 1)) || array[i]?.includes("TITLE") || (!array[i])) {
      array.splice(i, 1);
      i = i - 1;
    }
  }
  return array;
}

/**
 * This is a recursive function meant to instantiate all columns.
 * Datapack is encrypted as <parent>\t:\t<child>\t<child>\t<child>
 * Where children could be parents later on
 */
function recursive(
  parents: string[],
  lastparent: string,
  children: string[],
  columnInfo: ColumnInfo,
  allEntries: any
) {
  // taking this out for now for @Jaqui's task
  // //if somehow the data at this point is _METACOLUMN_OFF, remove it
  // const index = lastparent.indexOf("_METACOLUMN_OFF");
  // if (index != -1) {
  //   lastparent = lastparent.slice(0, index);
  // }
  columnInfo[lastparent] = {
    editName: lastparent,
    on: true,
    children: {},
    parents: parents,
  };
  const newParents = [...parents, lastparent];
  children.forEach((child) => {
    if (child && allEntries.get(child)) {
      recursive(
        newParents,
        child,
        allEntries.get(child),
        columnInfo[lastparent]!.children,
        allEntries
      );
    } else if (!allEntries.get(child)) {
      recursive(
        newParents,
        child,
        [],
        columnInfo[lastparent]!.children,
        allEntries
      );
    }
  });
}

/**
 * Main Function...
 * Get columns based on a decrypt_filepath that leads to the decrypted directory
 * and an amount of files in a string array that should pop up in that decrypted directory
 * Have not checked edge cases in which a file doesn't show up, will only return any that are correct.
 * Maybe add functionality in the future to check if all the files exist
 */
export async function parseDatapacks(
  decrypt_filepath: string,
  files: string[]
): Promise<{ columns: ColumnInfo }> {
  const decrypt_paths = await grabFilepaths(
    files,
    decrypt_filepath,
    "datapacks"
  );
  if (decrypt_paths.length == 0) return { columns: {} };
  // let fileSettingsMap: { [filePath: string]: ColumnInfo } = {};
  let decryptedfiles: String = "";
  let columnInfo: ColumnInfo = {};
  //put all contents into one string for parsing
  await pmap(decrypt_paths, async (decryptedfile) => {
    const contents = (await readFile(decryptedfile)).toString();
    decryptedfiles = decryptedfiles + "\n" + contents;
  });
  try {
    const isChild: Set<string> = new Set();
    let lines = decryptedfiles.split("\n");
    const allEntries: Map<string, string[]> = new Map();

    // First, gather all parents and their direct children
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      if (!line.includes("\t:\t")) {
        if (line.includes(":") && line.split(":")[0]!.includes("age units")) {
          //create MA setting since this doesn't follow the standard format of "\t:\t"
          columnInfo["MA"] = {
            editName: "MA",
            on: true,
            children: {},
            parents: [],
          };
        }
        continue;
      }
      let parent = line.split("\t:\t")[0];
      //THIS ACTUALLY DOESN'T MATTER ANYMORE BUT I WILL LEAVE IT HERE JUST IN CASE
      //TODO
      //to replace quotations surrounding the column name for future parsing access in state.
      //if this is not done, then the keys in the state for columns have quotations surrounding it
      //which is not consistent with the equivalent keys found in the parsed settings json object.
      //ex "North Belgium -- Oostende, Brussels, Antwerp, Campine, Maastrichen" vs
      //North Belgium -- Oostende, Brussels, Antwerp, Campine, Maastrichen
      let childrenstring = line.split("\t:\t")[1];
      if (!parent || !childrenstring) continue;
      childrenstring = childrenstring!.split("\t\t")[0];
      let children = spliceArrayAtFirstSpecialMatch(
        childrenstring!.split("\t")
      );


      allEntries.set(parent, children);
    }
    //if the entry is a child, add it to a set.
    allEntries.forEach((children) => {
      children.forEach((child) => {
        isChild.add(child);
      });
    });
    // only iterate over parents. if we encounter one that is a child, the recursive function
    // should have already processed it.
    allEntries.forEach((children, parent) => {
      if (!isChild.has(parent)) {
        recursive([], parent, children, columnInfo, allEntries);
      }
    });
    // console.log(JSON.stringify(settings, null, 2));
  } catch (e: any) {
    console.log(
      "ERROR: failed to read columns for path " +
      decryptedfiles +
      ".  Error was: ",
      e
    );
  }
  return { columns: columnInfo };
}
