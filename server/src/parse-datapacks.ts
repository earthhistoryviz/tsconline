import { createReadStream } from "fs";
import {
  ColumnInfo,
  Facies,
  DatapackAgeInfo,
  DatapackParsingPack,
  SubBlockInfo,
  Block,
  RGB,
  assertSubBlockInfo,
  assertRGB,
  defaultFontsInfo,
  SubFaciesInfo,
  assertSubFaciesInfo,
  Event,
  SubEventInfo,
  assertSubEventInfo
} from "@tsconline/shared";
import { trimQuotes, trimInvisibleCharacters, grabFilepaths, hasVisibleCharacters } from "./util.js";
import { createInterface } from "readline";
const patternForColor = /\d+\/\d+\/\d+/;
const patternForLineStyle = /solid|dashed|dotted/;
export type ParsedColumnEntry = {
  children: string[];
  on: boolean;
  info: string;
  enableTitle: boolean;
};

type FaciesFoundAndAgeRange = {
  faciesFound: boolean;
  subFaciesInfo?: SubFaciesInfo[];
  minAge: number;
  maxAge: number;
};
/**
 * parses the METACOLUMN and info of the children string
 * TODO: add TITLEOFF
 * @param array the children string to parse
 * @returns the correctly parsed children string array
 */
export function spliceArrayAtFirstSpecialMatch(array: string[]): ParsedColumnEntry {
  const parsedColumnEntry: ParsedColumnEntry = {
    children: [],
    on: true,
    info: "",
    enableTitle: true
  };
  for (let i = 0; i < array.length; i++) {
    if (array[i]?.includes("METACOLUMN")) {
      if (array[i] === "_METACOLUMN_ON") {
        parsedColumnEntry.on = true;
      } else {
        parsedColumnEntry.on = false;
      }
      array.splice(i, 1);
      i = i - 1;
    }
    if (array[i]?.includes("TITLE")) {
      if (array[i] === "_TITLE_ON") {
        parsedColumnEntry.enableTitle = true;
      } else {
        parsedColumnEntry.enableTitle = false;
      }
      array.splice(i, 1);
      i = i - 1;
    }
    if (!array[i] && i + 1 < array.length) {
      parsedColumnEntry.info = array[i + 1]!;
      array.splice(i + 1, 1);
      array.splice(i, 1);
      i = i - 1;
    }
  }
  parsedColumnEntry.children = array;
  return parsedColumnEntry;
}

/**
 * Main Function...
 * Get columns based on a decrypt_filepath that leads to the decrypted directory
 * and an amount of files in a string array that should pop up in that decrypted directory
 * Have not checked edge cases in which a file doesn't show up, will only return any that are correct.
 * Maybe add functionality in the future to check if all the files exist
 * @param decryptFilePath the decryption folder location
 * @param files the files to be parsed
 * @returns
 */
export async function parseDatapacks(decryptFilePath: string, files: string[]): Promise<DatapackParsingPack> {
  const decryptPaths = await grabFilepaths(files, decryptFilePath, "datapacks");
  if (decryptPaths.length == 0) throw new Error(`Did not find any datapacks for ${files}`);
  const columnInfoArray: ColumnInfo[] = [];
  const isChild: Set<string> = new Set();
  const allEntries: Map<string, ParsedColumnEntry> = new Map();
  const datapackAgeInfo: DatapackAgeInfo = { datapackContainsSuggAge: false };
  const faciesMap: Map<string, Facies> = new Map();
  const blocksMap: Map<string, Block> = new Map();
  const eventMap: Map<string, Event> = new Map();
  try {
    for (const decryptPath of decryptPaths) {
      //get the facies/blocks first
      await getColumnTypes(decryptPath, faciesMap, blocksMap, eventMap);
      // Originally the first step, gather all parents and their direct children
      await getAllEntries(decryptPath, allEntries, isChild, datapackAgeInfo);
      // only iterate over parents. if we encounter one that is a child, the recursive function
      // should have already processed it.
      allEntries.forEach((children, parent) => {
        // if the parent is not a child
        if (!isChild.has(parent)) {
          recursive("Root", parent, children, columnInfoArray, allEntries, faciesMap, blocksMap, eventMap);
        }
      });
    }
    if (
      columnInfoArray.length == 1 &&
      columnInfoArray[0]!.name.length == 0 &&
      columnInfoArray[0]!.maxAge == Number.MIN_VALUE &&
      columnInfoArray[0]!.minAge == Number.MAX_VALUE
    )
      throw new Error(`No columns found for path ${decryptPaths}`);
  } catch (e) {
    console.log("ERROR: failed to read columns for path " + decryptPaths + ". ", e);
    return { columnInfoArray: [], datapackAgeInfo: { datapackContainsSuggAge: false } };
  }
  return { columnInfoArray, datapackAgeInfo };
}
/**
 * This will populate a mapping of all parents : childen[]
 * We need this to recursively iterate correctly. We do not want
 *
 * @param filename the filename to parse
 * @param allEntries all entries (parent -> [child, child,...])
 * @param isChild the set of all children
 * @param datapackAgeInfo the datapack age info
 */
export async function getAllEntries(
  filename: string,
  allEntries: Map<string, ParsedColumnEntry>,
  isChild: Set<string>,
  datapackAgeInfo: DatapackAgeInfo
) {
  const fileStream = createReadStream(filename);
  const readline = createInterface({ input: fileStream, crlfDelay: Infinity });
  let topAge: number | null = null;
  let bottomAge: number | null = null;
  for await (const line of readline) {
    if (!line) continue;
    if (line.includes("SetTop") || line.includes("SetBase")) {
      const parts = line.split(":");
      if (parts.length >= 2) {
        const key = parts[0] ? parts[0].trim() : null;
        const value = parts[1] ? parseInt(parts[1].trim(), 10) : NaN;
        if (!isNaN(value)) {
          if (key === "SetTop") {
            topAge = value;
          } else if (key === "SetBase") {
            bottomAge = value;
          }
        }
      }
    }
    if (!line.includes("\t:\t")) {
      continue;
    }
    const parent = line.split("\t:\t")[0];

    //THIS ACTUALLY DOESN'T MATTER ANYMORE BUT I WILL LEAVE IT HERE JUST IN CASE
    //TODO
    //to replace quotations surrounding the column name for future parsing access in state.
    //if this is not done, then the keys in the state for columns have quotations surrounding it
    //which is not consistent with the equivalent keys found in the parsed settings json object.
    //ex "North Belgium -- Oostende, Brussels, Antwerp, Campine, Maastrichen" vs
    //North Belgium -- Oostende, Brussels, Antwerp, Campine, Maastrichen

    const childrenstring = line.split("\t:\t")[1];
    if (!parent || !hasVisibleCharacters(parent) || !childrenstring || !hasVisibleCharacters(childrenstring)) continue;
    // childrenstring = childrenstring!.split("\t\t")[0];
    const parsedChildren = spliceArrayAtFirstSpecialMatch(childrenstring!.split("\t"));
    //if the entry is a child, add it to a set.
    for (const child of parsedChildren.children) {
      isChild.add(child);
    }
    allEntries.set(parent, parsedChildren);
  }
  //set the age info if it exists
  datapackAgeInfo.datapackContainsSuggAge = topAge != null && bottomAge != null;
  if (topAge != null && bottomAge != null) {
    datapackAgeInfo.topAge = topAge;
    datapackAgeInfo.bottomAge = bottomAge;
  }
}
/**
 * This function will populate the maps with the parsed entries in the filename
 * using a read stream
 * @param filename the filename
 * @param faciesMap the facies map to add to
 * @param blocksMap  the blocks map to add to
 */
export async function getColumnTypes(
  filename: string,
  faciesMap: Map<string, Facies>,
  blocksMap: Map<string, Block>,
  eventMap: Map<string, Event>
) {
  const fileStream = createReadStream(filename);
  const readline = createInterface({ input: fileStream, crlfDelay: Infinity });
  const facies: Facies = {
    title: "",
    subFaciesInfo: [],
    minAge: Number.MAX_VALUE,
    maxAge: Number.MIN_VALUE,
    popup: "",
    on: true,
    width: 100,
    enableTitle: true,
    rgb: {
      r: 255,
      g: 255,
      b: 255
    }
  };
  const block: Block = {
    title: "",
    subBlockInfo: [],
    width: 100,
    minAge: Number.MAX_VALUE,
    maxAge: Number.MIN_VALUE,
    popup: "",
    on: true,
    enableTitle: true,
    rgb: { r: 255, g: 255, b: 255 }
  };
  const event: Event = {
    title: "",
    subEventInfo: [],
    enableTitle: true,
    width: 150,
    rgb: {
      r: 255,
      g: 255,
      b: 255
    },
    minAge: Number.MAX_VALUE,
    maxAge: Number.MIN_VALUE,
    popup: "",
    on: false
  };
  let inFaciesBlock = false;
  let inBlockBlock = false;
  let inEventBlock = false;

  for await (const line of readline) {
    if (!line || trimInvisibleCharacters(line) === "") {
      // we reached the end and store the key value pairs in to faciesMap
      if (inFaciesBlock) {
        inFaciesBlock = false;
        addFaciesToFaciesMap(facies, faciesMap);
        continue;
      }
      // reached the end and store the key value pairs into blocksMap
      if (inBlockBlock) {
        inBlockBlock = false;
        addBlockToBlockMap(block, blocksMap);
        continue;
      }
      // reached the end and store the key value pairs into eventMap
      if (inEventBlock) {
        inEventBlock = false;
        addEventToEventMap(event, eventMap);
        continue;
      }
    }
    const tabSeparated = line.split("\t");
    // we found an event block
    if (!inEventBlock && tabSeparated[1] === "event") {
      setEventHeaders(event, tabSeparated);
      inEventBlock = true;
    } else if (inEventBlock) {
      const subEventInfo = processEvent(line);
      if (subEventInfo) {
        event.subEventInfo.push(subEventInfo);
      }
    }
    // we found a facies block
    if (!inFaciesBlock && tabSeparated[1] === "facies") {
      facies.title = trimQuotes(tabSeparated[0]!);
      facies.popup = tabSeparated[6] || "";
      if (tabSeparated[5] && (tabSeparated[5] === "off" || tabSeparated[5].length == 0)) {
        facies.on = false;
      }
      inFaciesBlock = true;
    } else if (inFaciesBlock) {
      const subFaciesInfo = processFacies(line);
      if (subFaciesInfo) {
        facies.subFaciesInfo.push(subFaciesInfo);
      }
    }

    // we found a block
    if (!inBlockBlock && tabSeperated[1] === "block") {
      setBlockHeader(block, tabSeperated);
      inBlockBlock = true;
    } else if (inBlockBlock) {
      //get a single sub block

      //make sure we don't pass by reference
      const subBlockInfo = processBlock(line, {
        r: block.rgb.r,
        g: block.rgb.g,
        b: block.rgb.b
      });

      if (subBlockInfo) {
        block.subBlockInfo.push(subBlockInfo);
      }
    }
  }

  if (inFaciesBlock) {
    addFaciesToFaciesMap(facies, faciesMap);
  }
  if (inEventBlock) {
    addEventToEventMap(event, eventMap);
  }
  if (inBlockBlock) {
    addBlockToBlockMap(block, blocksMap);
  }
}

/**
 * This function will set the header for block
 * @param block the block
 * @param tabSeperated the string array which contains all information of the block
 */
function setBlockHeader(block: Block, tabSeperated: string[]) {
  block.title = trimQuotes(tabSeperated[0]!);

  if (tabSeperated[2]) {
    block.width = Number(tabSeperated[2]);
    if (isNaN(block.width)) {
      console.log(`Error found while processing block width, setting width to 100`);
      block.width = 100;
    }
  }

  if (tabSeperated[3] && patternForColor.test(tabSeperated[3])) {
    const rgbSeperated = tabSeperated[3].split("/");
    block.rgb.r = Number(rgbSeperated[0]!);
    block.rgb.g = Number(rgbSeperated[1]!);
    block.rgb.b = Number(rgbSeperated[2]!);
    try {
      assertRGB(block.rgb);
    } catch (e) {
      console.log(`Error ${e} found while processing block rgb, setting rgb to white`);
      block.rgb.r = 255;
      block.rgb.g = 255;
      block.rgb.b = 255;
    }
  }

  if (tabSeperated[4] && tabSeperated[4] === "notitle") {
    block.enableTitle = false;
  }
  if (tabSeperated[5] && tabSeperated[5] === "off") {
    block.on = false;
  }

  if (tabSeperated[6]) {
    block.popup = tabSeperated[6];
  }
}

/**
 * Set the appropriate headers for the event object
 * @param event
 * @param tabSeparated
 */
function setEventHeaders(event: Event, tabSeparated: string[]) {
  event.title = trimQuotes(tabSeparated[0]!);
  event.popup = tabSeparated[6] || "";
  if (tabSeparated[2]) {
    event.width = Number(tabSeparated[2]!);
    if (isNaN(event.width)) {
      console.log(`Error found while processing event width, got: ${event.width} and will be setting width to 150`);
      event.width = 150;
    }
  }
  if (tabSeparated[3] && patternForColor.test(tabSeparated[3])) {
    const rgb = tabSeparated[3].split("/");
    event.rgb.r = Number(rgb[0]!);
    event.rgb.g = Number(rgb[1]!);
    event.rgb.b = Number(rgb[2]!);
  }
  if (tabSeparated[4] && tabSeparated[4] === "notitle") {
    event.enableTitle = false;
  }
  if (tabSeparated[5] && tabSeparated[5] === "on") {
    event.on = true;
  }
}
/**
 * add an event object to the event map and resets event object
 * @param event
 * @param eventMap
 */
function addEventToEventMap(event: Event, eventMap: Map<string, Event>) {
  for (const subEvent of event.subEventInfo) {
    event.minAge = Math.min(subEvent.age, event.minAge);
    event.maxAge = Math.max(subEvent.age, event.maxAge);
  }
  eventMap.set(event.title, JSON.parse(JSON.stringify(event)));
  event.title = "";
  event.subEventInfo = [];
  event.minAge = Number.MAX_VALUE;
  event.maxAge = Number.MIN_VALUE;
  event.popup = "";
  event.enableTitle = true;
  event.width = 150;
  event.rgb = {
    r: 255,
    g: 255,
    b: 255
  }
  event.on = false;
}

/**
 * add a facies object to the map. will reset the facies object.
 * @param facies the facies objec to add
 * @param faciesMap the map to add to
 */
function addFaciesToFaciesMap(facies: Facies, faciesMap: Map<string, Facies>) {
  for (const block of facies.subFaciesInfo) {
    facies.minAge = Math.min(block.age, facies.minAge);
    facies.maxAge = Math.max(block.age, facies.maxAge);
  }
  faciesMap.set(facies.title, JSON.parse(JSON.stringify(facies)));
  facies.title = "";
  facies.subFaciesInfo = [];
  facies.minAge = Number.MAX_VALUE;
  facies.maxAge = Number.MIN_VALUE;
  facies.popup = "";
  facies.on = true;
  facies.enableTitle = true;
  facies.width = 100;
  facies.rgb = {
    r: 255,
    g: 255,
    b: 255
  };
}

/**
 * add a block into blocksMap. will reset the block var
 * @param block the block to be added
 * @param blocksMap the map of blocks
 */
function addBlockToBlockMap(block: Block, blocksMap: Map<string, Block>) {
  for (const subBlock of block.subBlockInfo) {
    block.minAge = Math.min(subBlock.age, block.minAge);
    block.maxAge = Math.max(subBlock.age, block.maxAge);
  }
  blocksMap.set(block.title, JSON.parse(JSON.stringify(block)));
  block.title = "";
  block.subBlockInfo = [];
  block.minAge = Number.MAX_VALUE;
  block.maxAge = Number.MIN_VALUE;
  block.popup = "";
  block.on = true;
  block.enableTitle = true;
  block.rgb = { r: 255, g: 255, b: 255 };
}

/**
 * process a SubEventInfo
 * @param line 
 * @returns 
 */
export function processEvent(line: string): SubEventInfo | null {
  const subEventInfo = {
    label: "",
    age: 0,
    popup: "",
    lineStyle: "solid"
  };
  const tabSeparated = line.split("\t");
  if (tabSeparated.length < 3 || tabSeparated.length > 5) return null;
  const label = tabSeparated[1]!;
  const age = Number(tabSeparated[2]!);
  if (isNaN(age)) throw new Error("Error processing facies line, age: " + tabSeparated[2]! + " is NaN");
  const lineStyle = tabSeparated[3];
  const popup = tabSeparated[4];
  subEventInfo.label = label;
  subEventInfo.age = age;
  if (popup) {
    subEventInfo.popup = popup;
  }
  if (lineStyle && patternForLineStyle.test(lineStyle)) {
    subEventInfo.lineStyle = lineStyle;
  }
  try {
    assertSubEventInfo(subEventInfo);
  } catch (e) {
    console.log(`Error ${e} found while processing subBlockInfo, returning null`);
    return null;
  }
  return subEventInfo;
}
/**
 * Processes a single subBlockInfo line
 * @param line the line to be processed
 * @returns A subBlock object
 */
export function processBlock(line: string, defaultColor: RGB): SubBlockInfo | null {
  const currentSubBlockInfo = {
    label: "",
    age: 0,
    popup: "",
    lineStyle: "solid",
    rgb: defaultColor //if Block has color, set to that. If not, set to white
  };
  const tabSeparated = line.split("\t");
  if (tabSeparated.length < 3) return null;
  const label = tabSeparated[1];
  const age = Number(tabSeparated[2]!);
  const popup = tabSeparated[4];
  if (isNaN(age)) throw new Error("Error processing block line, age: " + tabSeparated[2]! + " is NaN");
  const lineStyle = tabSeparated[3];
  const rgb = tabSeperated[5];
  if (label) {
    currentSubBlockInfo.label = label;
  }
  currentSubBlockInfo.age = age;

  if (popup) {
    currentSubBlockInfo.popup = popup;
  }

  if (lineStyle && patternForLineStyle.test(lineStyle)) {
    switch (lineStyle) {
      case "dashed": {
        currentSubBlockInfo.lineStyle = "dashed";
        break;
      }
      case "dotted": {
        currentSubBlockInfo.lineStyle = "dotted";
        break;
      }
    }
  }
  if (rgb && patternForColor.test(rgb)) {
    const rgbSeperated = rgb.split("/");
    currentSubBlockInfo.rgb.r = Number(rgbSeperated[0]!);
    currentSubBlockInfo.rgb.g = Number(rgbSeperated[1]!);
    currentSubBlockInfo.rgb.b = Number(rgbSeperated[2]!);
    try {
      assertRGB(currentSubBlockInfo.rgb);
    } catch (e) {
      console.log(`Error ${e} found while processing block rgb, setting rgb to white`);
      currentSubBlockInfo.rgb.r = 255;
      currentSubBlockInfo.rgb.g = 255;
      currentSubBlockInfo.rgb.b = 255;
    }
  }

  try {
    assertSubBlockInfo(currentSubBlockInfo);
  } catch (e) {
    console.log(`Error ${e} found while processing subBlockInfo, returning null`);
    return null;
  }
  return currentSubBlockInfo;
}

/**
 * Processes a single facies line
 * @param line the line to be processed
 * @returns A FaciesTimeBlock object
 */
export function processFacies(line: string): SubFaciesInfo | null {
  let subFaciesInfo = {};
  if (line.toLowerCase().includes("primary")) {
    return null;
  }
  const tabSeparated = line.split("\t");
  if (tabSeparated.length < 4 || tabSeparated.length > 5) return null;
  const age = Number(tabSeparated[3]!);
  if (isNaN(age)) throw new Error("Error processing facies line, age: " + tabSeparated[3]! + " is NaN");
  // label doesn't exist for TOP or GAP
  if (!tabSeparated[2]) {
    subFaciesInfo = {
      rockType: tabSeparated[1]!,
      age,
      info: ""
    };
  } else {
    subFaciesInfo = {
      rockType: tabSeparated[1]!,
      label: tabSeparated[2]!,
      age,
      info: ""
    };
  }
  if (tabSeparated[4]) {
    subFaciesInfo = {
      ...subFaciesInfo,
      info: tabSeparated[4]
    };
  }
  try {
    assertSubFaciesInfo(subFaciesInfo);
  } catch (e) {
    console.log(`Error ${e} found while processing facies, returning null`);
    return null;
  }
  return subFaciesInfo;
}
/**
 * This is a recursive function meant to instantiate all columns.
 * Datapack is encrypted as <parent>\t:\t<child>\t<child>\t<child>
 * Where children could be parents later on
 * Propogates changes to min and max age recursively to give each ColumnInfo
 * variable the correct min and max age
 *
 * @param parent the parent of the currenColumn
 * @param currentColumnName the name of the column we are currently making
 * @param parsedColumnEntry the parsed entry that was parsed in allEntries (could be null)
 * @param childrenArray the children array to push to ( this is the parent's array )
 * @param allEntries the allEntries map that has <parent> => [child, child]
 * @param faciesMap the facies map that has all the facies blocks
 * @param blocksMap the blocks map that has all the block blocks
 * @returns
 */
function recursive(
  parent: string | null,
  currentColumn: string,
  parsedColumnEntry: ParsedColumnEntry | null,
  childrenArray: ColumnInfo[],
  allEntries: Map<string, ParsedColumnEntry>,
  faciesMap: Map<string, Facies>,
  blocksMap: Map<string, Block>,
  eventMap: Map<string, Event>
): FaciesFoundAndAgeRange {
  const currentColumnInfo: ColumnInfo = {
    name: trimInvisibleCharacters(currentColumn),
    editName: currentColumn,
    on: true,
    enableTitle: true,
    fontsInfo: JSON.parse(JSON.stringify(defaultFontsInfo)),
    info: "",
    children: [],
    parent: parent,
    minAge: Number.MAX_VALUE,
    maxAge: Number.MIN_VALUE,
    width: 100,
    enableTitle: true,
    rgb: {
      r: 255,
      g: 255,
      b: 255
    }
  };
  const returnValue: FaciesFoundAndAgeRange = {
    faciesFound: false,
    minAge: 99999,
    maxAge: -99999
  };

  if (parsedColumnEntry) {
    currentColumnInfo.on = parsedColumnEntry.on;
    currentColumnInfo.info = parsedColumnEntry.info;
    currentColumnInfo.enableTitle = parsedColumnEntry.enableTitle;
  }
  if (blocksMap.has(currentColumn)) {
    const currentBlock = blocksMap.get(currentColumn)!;
    currentColumnInfo.subBlockInfo = JSON.parse(JSON.stringify(currentBlock.subBlockInfo));
    currentColumnInfo.on = currentBlock.on;
    currentColumnInfo.minAge = Math.min(currentBlock.minAge, currentColumnInfo.minAge);
    currentColumnInfo.maxAge = Math.max(currentBlock.maxAge, currentColumnInfo.maxAge);
    currentColumnInfo.enableTitle = currentBlock.enableTitle;
    returnValue.minAge = currentColumnInfo.minAge;
    returnValue.maxAge = currentColumnInfo.maxAge;
  }
  if (faciesMap.has(currentColumn)) {
    const currentFacies = faciesMap.get(currentColumn)!;
    currentColumnInfo.subFaciesInfo = JSON.parse(JSON.stringify(currentFacies.subFaciesInfo));
    currentColumnInfo.maxAge = Math.max(currentColumnInfo.maxAge, currentFacies.maxAge);
    currentColumnInfo.minAge = Math.min(currentColumnInfo.minAge, currentFacies.minAge);
    returnValue.subFaciesInfo = currentFacies.subFaciesInfo;
    currentColumnInfo.info = currentFacies.popup;
    currentColumnInfo.on = currentFacies.on;
    returnValue.minAge = currentColumnInfo.minAge;
    returnValue.maxAge = currentColumnInfo.maxAge;
  }
  if (eventMap.has(currentColumn)) {
    const currentEvent = eventMap.get(currentColumn)!;
    currentColumnInfo.subEventInfo = currentEvent.subEventInfo;
    currentColumnInfo.maxAge = Math.max(currentColumnInfo.maxAge, currentEvent.maxAge);
    currentColumnInfo.minAge = Math.min(currentColumnInfo.minAge, currentEvent.minAge);
    returnValue.maxAge = currentColumnInfo.maxAge;
    returnValue.minAge = currentColumnInfo.minAge;
    currentColumnInfo.rgb = currentEvent.rgb;
    currentColumnInfo.width = currentEvent.width;
    currentColumnInfo.enableTitle = currentEvent.enableTitle;
    currentColumnInfo.info = currentEvent.popup;
    currentColumnInfo.on = currentEvent.on;
  }

  childrenArray.push(currentColumnInfo);

  if (parsedColumnEntry) {
    parsedColumnEntry.children.forEach((child) => {
      // if the child is named the same as the parent, this will create an infinite loop
      if (!child || child === currentColumn) return;
      const children = allEntries.get(child) || null;
      const compareValue: FaciesFoundAndAgeRange = recursive(
        currentColumn, // the current column becomes the parent
        child, // the child is now the current column
        children, // the children that allEntries has or [] if this child is the parent to no children
        currentColumnInfo.children, // the array to push all the new children into
        allEntries, // the mapping of all parents to children
        faciesMap,
        blocksMap,
        eventMap
      );
      returnValue.minAge = Math.min(compareValue.minAge, returnValue.minAge);
      returnValue.maxAge = Math.max(compareValue.maxAge, returnValue.maxAge);
      currentColumnInfo.minAge = returnValue.minAge;
      currentColumnInfo.maxAge = returnValue.maxAge;
      returnValue.faciesFound = compareValue.faciesFound || returnValue.faciesFound;
      // we take the first child's facies info
      // this is due to map points taking their first child's facies information
      // Therefore meaning the child has the facies information but the map point is not
      // called by the child name but is called the parent name
      // parent -> child -> facies
      // displayed as parent -> facies
      // facies event exists for this map point
      if (!returnValue.faciesFound && faciesMap.has(child)) {
        returnValue.faciesFound = true;
        if (compareValue.subFaciesInfo) currentColumnInfo.subFaciesInfo = compareValue.subFaciesInfo;
      }
    });
  }
  return returnValue;
}
