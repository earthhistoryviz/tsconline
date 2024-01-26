import { readFile } from "fs/promises";
import pmap from "p-map";
import type { ColumnInfo, Facies, FaciesLocations } from "@tsconline/shared";
import { grabFilepaths } from "./util.js";

/**
 * TODO:
 * This function is meant to catch all strange occurences at the end
 * of the tab seperated decrypted file. Should get rid of METACOLUMN_OFF
 * and any extraneuous info bits that shouldn't be a togglable column.
 * At the moment, is not currently working
 */
function spliceArrayAtFirstSpecialMatch(array: string[]): string[] {
  return array;
}

type faciesAbbreviationType = {
  [child: string]: string
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
): Promise<{ columns: ColumnInfo, facies: Facies }> {
  const decrypt_paths = await grabFilepaths(
    files,
    decrypt_filepath,
    "datapacks"
  );
  if (decrypt_paths.length == 0) throw new Error('Did not find any datapacks');
  let decryptedfiles: String = "";
  let columnInfo: ColumnInfo = {};
  let facies: Facies = {
    locations: {},
    minAge: 999999,
    maxAge: -99999
  }
  //put all contents into one string for parsing
  await pmap(decrypt_paths, async (decryptedfile) => {
    const contents = (await readFile(decryptedfile)).toString();
    decryptedfiles = decryptedfiles + "\n" + contents;
  });
  try {
    const isChild: Set<string> = new Set();
    // For facies events that have multi layers, or for facies that are abbreviated or generalized,
    // we change the facies name for the map front end
    let faciesAbbreviations: faciesAbbreviationType = {}
    let lines = decryptedfiles.split("\n");
    const allEntries: Map<string, string[]> = new Map();
    /**
     * This is a recursive function meant to instantiate all columns.
     * Datapack is encrypted as <parent>\t:\t<child>\t<child>\t<child>
     * Where children could be parents later on
     * This is an inline-function because we must update faciesAbbreviations above, to be used later
     */
    function recursive(
      parents: string[],
      lastparent: string,
      children: string[],
      columnInfo: ColumnInfo,
      allEntries: Map<string, string[]> 
    ) {
      columnInfo[lastparent] = {
        editName: lastparent,
        on: true,
        children: {},
        parents: parents,
      };
      const newParents = [...parents, lastparent];
      children.forEach((child) => {
        if (!child) return
        // if it has a certain suffix at the end, this is the parent's map facies label.
        if (!allEntries.get(child) && ((new RegExp(/ - shallow| - general| - shallow"/)).test(child))) {
          faciesAbbreviations[child] = lastparent
        }
        const children = allEntries.get(child) || []
        recursive(
          newParents,
          child,
          children,
          columnInfo[lastparent]!.children,
          allEntries
        );
    });
  }

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
      // childrenstring = childrenstring!.split("\t\t")[0];
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
      // if the parent is not a child
      if (!isChild.has(parent)) {
        recursive([], parent, children, columnInfo, allEntries);
      }
    });
    //TODO figure out a better way to parse such that we can do both this
    // and find the children/parent nesting situation at the same time
    // at the moment we "go" through the file 4 times. So O(4n)
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i]
      if (line && line.split('\t')[1] === "facies") {
        const processedEvent = processFacies(faciesAbbreviations, lines, i)
        if (processedEvent) {
          facies.locations[processedEvent.name] = processedEvent.faciesEvent
          facies.minAge = Math.min(facies.minAge, processedEvent.faciesEvent.minAge)
          facies.maxAge = Math.max(facies.maxAge, processedEvent.faciesEvent.maxAge)
          i = processedEvent.nextIndex
        }
      }
    }
  } catch (e: any) {
    console.log(
      "ERROR: failed to read columns for path " +
        decryptedfiles +
        ".  Error was: ",
      e
    );
  }
  return { columns: columnInfo, facies};
}
function processFacies(faciesAbbreviations: faciesAbbreviationType, lines: string[], i: number): {name: string, faciesEvent: FaciesLocations[string], nextIndex: number} | null {
  let faciesEvent: FaciesLocations[string] = {
    faciesTimeBlockArray: [],
    minAge: 999999,
    maxAge: -99999
  }
  let line = lines[i]
  if (!line) return null
  let name = line.split('\t')[0]!
  // if the facies is one of the select few that use shallow, general, or shallow"
  // we replace it here
  if (faciesAbbreviations[name]) {
    name = faciesAbbreviations[name]!
  }
  i += 1
  line = lines[i]
  while (line && !line.startsWith('\n')) {
    // if primary, skip
    if (line.toLowerCase().includes('primary')) {
      i += 1
      line = lines[i]
      continue
    }
    const tabSeperated = line.split('\t')
    if (tabSeperated.length < 4) break
    const age = Number(tabSeperated[3]!)
    // label doesn't exist for TOP or GAP
    if (!tabSeperated[2]) {
      faciesEvent.faciesTimeBlockArray.push({rockType: tabSeperated[1]!, age})
    } else {
      faciesEvent.faciesTimeBlockArray.push({rockType: tabSeperated[1]!, label: tabSeperated[2]!, age})
    }
    faciesEvent.minAge = Math.min(faciesEvent.minAge, age)
    faciesEvent.maxAge = Math.max(faciesEvent.maxAge, age)
    i += 1
    line = lines[i]
  }
  return {name, faciesEvent, nextIndex: i}
}
