import { createReadStream } from "fs";
import { ColumnInfo, Facies, FaciesLocations, FaciesTimeBlock, assertFaciesTimeBlock, DatapackAgeInfo, DatapackParsingPack, FontsInfo } from "@tsconline/shared";
import { trimQuotes, trimInvisibleCharacters, grabFilepaths } from "./util.js";
import { createInterface } from "readline";

type ParsedColumnEntry = {
  children: string[],
  on: boolean,
  info: string
}
let fontsInfo: FontsInfo = {
    "Age Label": {
        bold: false,
        color: "",
        fontFace: "Arial",
        inheritable: false,
        italic: false,
        size: 6
    },
    "Column Header": {bold: false, color: "#000000", fontFace: "Arial", inheritable: false, italic: false, size: 14},
    "Event Column Label": {bold: false, color: "#000000", fontFace: "Arial", inheritable: false, italic: false, size: 11},
    "Legend Column Name": {inheritable: false},
    "Legend Column Source": {inheritable: false},
    "Legend Title": {inheritable: false},
    "Point Column Scale Label": {inheritable: false},
    "Popup Body": {inheritable: false},
    "Range Box Label": {inheritable: false},
    "Range Label": {bold: false, color: "#000000", fontFace: "Arial", inheritable: false, italic: false, size: 12},
    "Ruler Label": {inheritable: false},
    "Ruler Tick Mark Label": {inheritable: false},
    "Sequence Column Label": {inheritable: false},
    "Uncertainty Label": {bold: false, color: "#000000", fontFace: "Arial", inheritable: false, italic: false, size: 5},
    "Zone Column Label": {bold: false, color: "#000000", fontFace: "Arial", inheritable: false, italic: false, size: 12}
}
/**
 * TODO:
 * This function is meant to catch all strange occurences at the end
 * of the tab seperated decrypted file. Should get rid of METACOLUMN_OFF
 * and any extraneuous info bits that shouldn't be a togglable column.
 * 
 */
function spliceArrayAtFirstSpecialMatch(array: string[]): ParsedColumnEntry {

  let ref = "";
  let metacolumn = "";
  let ParsedColumnEntry: ParsedColumnEntry = {
    children: [],
    on: true,
    info: ""
  }
  for (var i = 0; i < array.length; i++) {
    if (array[i]?.includes("METACOLUMN") || array[i]?.includes("TITLE")) {
      if (array[i]?.includes("METACOLUMN")) {
        metacolumn = array[i]!;
      }
      array.splice(i, 1);
      i = i - 1;
    }
    if (!array[i]) {
      ref = array[i + 1]!;
      array.splice(i + 1, 1);
      array.splice(i, 1);
      i = i - 1;
    }
  }
  ParsedColumnEntry.children = array;
  if (metacolumn) {
    ParsedColumnEntry.on = false;
  }
  ParsedColumnEntry.info = ref;

  return ParsedColumnEntry;
}

/**
 * Main Function...
 * Get columns based on a decrypt_filepath that leads to the decrypted directory
 * and an amount of files in a string array that should pop up in that decrypted directory
 * Have not checked edge cases in which a file doesn't show up, will only return any that are correct.
 * Maybe add functionality in the future to check if all the files exist
 * @param decrypt_filepath the decryption folder location
 * @param files the files to be parsed
 * @returns 
 */
export async function parseDatapacks(
  decrypt_filepath: string,
  files: string[]
): Promise<DatapackParsingPack> {
  const decrypt_paths = await grabFilepaths(
    files,
    decrypt_filepath,
    "datapacks"
  );
  if (decrypt_paths.length == 0) throw new Error(`Did not find any datapacks for ${files}`);
  let columnInfoArray: ColumnInfo[] = []
  let facies: Facies = {
    locations: {},
    minAge: 999999,
    maxAge: -99999,
    aliases: {}
  }
  const isChild: Set<string> = new Set();
  const isFacies: Set<string> = new Set();
  const allEntries: Map<string, ParsedColumnEntry> = new Map();
  let datapackAgeInfo: DatapackAgeInfo = { datapackContainsSuggAge: false };
  try {
    for (let decrypt_path of decrypt_paths) {
      // First, gather all parents and their direct children
      datapackAgeInfo = await getAllEntries(decrypt_path, allEntries, isFacies, isChild);
      // only iterate over parents. if we encounter one that is a child, the recursive function
      // should have already processed it.
      allEntries.forEach((children, parent) => {
        // if the parent is not a child
        if (!isChild.has(parent)) {

          recursive("Root", parent, children, columnInfoArray, allEntries, isFacies, facies);
        }

      });
      //next we get the facies events
      await getFacies(decrypt_path, facies)
    }
  } catch (e: any) {
    console.log(
      "ERROR: failed to read columns for path " +
      decrypt_paths +
      ".  Error was: ",
      e
    );
  }
  return { columnInfoArray, facies, datapackAgeInfo };
}
/**
 * This will populate a mapping of all parents : childen[]
 * We need this to recursively iterate correctly. We do not want 
 * @param filename 
 * @param allEntries 
 * @param columnInfo 
 * @param isFacies 
 * @param isChild 
 */
async function getAllEntries(filename: string, allEntries: Map<string, ParsedColumnEntry>, isFacies: Set<string>, isChild: Set<string>):
  Promise<DatapackAgeInfo> {
  const fileStream = createReadStream(filename)
  const readline = createInterface({ input: fileStream, crlfDelay: Infinity })
  let topAge: number | null = null;
  let bottomAge: number | null = null;
  for await (const line of readline) {
    if (!line) continue;
    if (line.includes("SetTop") || line.includes("SetBase")) {
      const parts = line.split(':');
      if (parts.length >= 2) {
        const key = parts[0] ? parts[0].trim() : null;
        const value = parts[1] ? parseInt(parts[1].trim(), 10) : NaN;
        if (!isNaN(value)) {
          if (key === 'SetTop') {
            topAge = value;
          } else if (key === 'SetBase') {
            bottomAge = value;
          }
        }
      }
    }
    if (!line.includes("\t:\t")) {
      const splitLine = line.split('\t')
      if (splitLine && splitLine.length > 1 && splitLine[1] === 'facies') {
        isFacies.add(trimInvisibleCharacters(splitLine[0]!))
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
    let parsedChildren = spliceArrayAtFirstSpecialMatch(childrenstring!.split("\t"));
    //if the entry is a child, add it to a set.
    for (const child of parsedChildren.children) {
      isChild.add(child)
    }
    allEntries.set(parent, parsedChildren);
  }
  let datapackAgeInfo: DatapackAgeInfo = { datapackContainsSuggAge: topAge != null && bottomAge != null };
  if (topAge !== null && bottomAge !== null) {
    datapackAgeInfo.topAge = topAge;
    datapackAgeInfo.bottomAge = bottomAge;
  }
  return datapackAgeInfo;
}
/**
 * This function will populate the param facies with the correct facies events
 * using a read stream
 * @param filename the filename to be parsed
 * @param facies the facies object containing all of the facies events
 */
async function getFacies(filename: string, facies: Facies) {
  const fileStream = createReadStream(filename)
  const readline = createInterface({ input: fileStream, crlfDelay: Infinity })
  let location: FaciesLocations[string] = {
    faciesTimeBlockArray: [],
    minAge: 999999,
    maxAge: -99999
  }
  let name = ""
  let inFaciesBlock = false
  for await (const line of readline) {
    // we reached the end
    if ((!line || trimInvisibleCharacters(line) === '') && inFaciesBlock) {
      inFaciesBlock = false
      if (location.faciesTimeBlockArray.length == 0) {
        location.maxAge = 0
        location.minAge = 0
      }
      facies.locations[name] = location
      facies.minAge = Math.min(facies.minAge, location.minAge)
      facies.maxAge = Math.max(facies.maxAge, location.maxAge)
      //reset the location variable
      location = {
        faciesTimeBlockArray: [],
        minAge: 999999,
        maxAge: -99999
      }
      continue
    }
    // we found a facies event location
    if (!inFaciesBlock && line.split('\t')[1] === "facies") {
      name = trimQuotes(line.split('\t')[0]!)
      inFaciesBlock = true
    } else if (inFaciesBlock) {
      let faciesTimeBlock = processFacies(line)
      if (faciesTimeBlock) {
        location.faciesTimeBlockArray.push(faciesTimeBlock)
        location.minAge = Math.min(location.minAge, faciesTimeBlock.age)
        location.maxAge = Math.max(location.maxAge, faciesTimeBlock.age)
      }
    }
  }
  if (inFaciesBlock) {
    if (location.faciesTimeBlockArray.length == 0) {
      location.maxAge = 0
      location.minAge = 0
    }
    facies.locations[name] = location
    facies.minAge = Math.min(facies.minAge, location.minAge)
    facies.maxAge = Math.max(facies.maxAge, location.maxAge)
  }
}
/**
 * Processes a single facies line
 * @param line the line to be processed
 * @returns A FaciesTimeBlock object
 */
function processFacies(line: string): FaciesTimeBlock | null {
  let faciesTimeBlock = {}
  if (line.toLowerCase().includes('primary')) {
    return null
  }
  const tabSeperated = line.split('\t')
  if (tabSeperated.length < 4) return null
  const age = Number(tabSeperated[3]!)
  if (isNaN(age)) throw new Error("Error processing facies line, age: " + tabSeperated[3]! + " is NaN")
  // label doesn't exist for TOP or GAP
  if (!tabSeperated[2]) {
    faciesTimeBlock = {
      rockType: tabSeperated[1]!,
      age
    }
  } else {
    faciesTimeBlock = {
      rockType: tabSeperated[1]!,
      label: tabSeperated[2]!,
      age
    }
  }
  try {
    assertFaciesTimeBlock(faciesTimeBlock)
  } catch (e) {
    console.log(`Error ${e} found while processing facies, returning null`)
    return null
  }
  return faciesTimeBlock
}
/**
 * 
 * This is a recursive function meant to instantiate all columns.
 * Datapack is encrypted as <parent>\t:\t<child>\t<child>\t<child>
 * Where children could be parents later on
 * This is an inline-function because we must update faciesAbbreviations above, to be used later
 * Additionally we return a boolean that tracks whether we have found the corressponding facies
 * event with the parent
 * @param parents the parents string that lists all the parents of this column
 * @param currentcolumn the current column we are on
 * @param children the children of the current column
 * @param columnInfo the overarching columnInfo object storing all columns
 * @param allEntries all entries of parent\t:\tchild
 * @param isFacies the set of all facies event labels
 * @param facies the facies object
 * @returns 
 */
function recursive(
  parent: string | null,
  currentColumn: string,
  parsedColumnEntry: ParsedColumnEntry | null,
  childrenArray: ColumnInfo[],
  allEntries: Map<string, ParsedColumnEntry>,
  isFacies: Set<string>,
  facies: Facies
): boolean {
  const currentColumnInfo = {
    name: currentColumn,
    editName: currentColumn,
    on: true,
    fontsInfo: fontsInfo,
    info: "",
    children: [],
    parent: parent,
  }
  let faciesFound = false;

  if (parsedColumnEntry) {
    currentColumnInfo.on = parsedColumnEntry.on;


    currentColumnInfo.info = parsedColumnEntry.info;
  }

  childrenArray.push(currentColumnInfo);

  if (parsedColumnEntry) {
    parsedColumnEntry.children.forEach((child) => {
      // if the child is named the same as the parent, this will create an infinite loop
      if (!child || child === currentColumn) return
      // if this is the final child then we store this as a potential alias
      if (!allEntries.get(child) && (parsedColumnEntry.children.length == 1 && isFacies.has(trimInvisibleCharacters(child)))) {
        facies.aliases[trimInvisibleCharacters(currentColumn)] = trimInvisibleCharacters(child)
        faciesFound = true
      }
      const children = allEntries.get(child) || null
      faciesFound = recursive(
        currentColumn, // the current column becomes the parent
        child, // the child is now the current column
        children, // the children that allEntries has or [] if this child is the parent to no children
        currentColumnInfo.children, // the array to push all the new children into
        allEntries, // the mapping of all parents to children
        isFacies, // the set of all facies event names
        facies // the facies object used to garner aliases for map point usage
      ) || faciesFound
      if (!faciesFound && isFacies.has(trimInvisibleCharacters(child))) {
        faciesFound = true
        facies.aliases[trimInvisibleCharacters(currentColumn)] = trimInvisibleCharacters(child)
      }
    });
  }
  return faciesFound;

}

