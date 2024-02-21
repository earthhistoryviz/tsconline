import { createReadStream } from "fs";
import {
  ColumnInfo,
  Facies,
  DatapackAgeInfo,
  DatapackParsingPack,
  SubBlockInfo,
  Block,
  assertSubBlockInfo,
  defaultFontsInfo,
  Aliases,
  SubFaciesInfo,
  assertSubFaciesInfo,
} from "@tsconline/shared";
import { trimQuotes, trimInvisibleCharacters, grabFilepaths } from "./util.js";
import { createInterface } from "readline";

type ParsedColumnEntry = {
  children: string[];
  on: boolean;
  info: string;
};

type FaciesFoundAndAgeRange = {
  faciesFound: boolean;
  minAge: number;
  maxAge: number;
};
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
    info: "",
  };
  for (var i = 0; i < array.length; i++) {
    if (array[i]?.includes("METACOLUMN") || array[i]?.includes("TITLE")) {
      if (array[i]?.includes("METACOLUMN")) {
        metacolumn = array[i]!;
      }
      array.splice(i, 1);
      i = i - 1;
    }
    if (!array[i] && i+1 < array.length) {
      ref = array[i + 1]!;
      array = array.splice(i + 1, 1);
      array = array.splice(i, 1);
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
  if (decrypt_paths.length == 0)
    throw new Error(`Did not find any datapacks for ${files}`);
  let columnInfoArray: ColumnInfo[] = [];
  const isChild: Set<string> = new Set();
  const isFacies: Set<string> = new Set();
  const allEntries: Map<string, ParsedColumnEntry> = new Map();
  let datapackAgeInfo: DatapackAgeInfo = { datapackContainsSuggAge: false };
  const faciesMap: Map<string, Facies> = new Map();
  const blocksMap: Map<string, Block> = new Map();
  let aliases: Aliases = {}
  //const faciesMap: Map<String, string[]> = new Map();
  try {
    for (let decrypt_path of decrypt_paths) {
      //get the facies/blocks first
      await getFaciesOrBlock(decrypt_path, faciesMap, blocksMap, isFacies);
      // Originally the first step, gather all parents and their direct children
      await getAllEntries(
        decrypt_path,
        allEntries,
        isChild,
        datapackAgeInfo
      );
      // only iterate over parents. if we encounter one that is a child, the recursive function
      // should have already processed it.
      allEntries.forEach((children, parent) => {
        // if the parent is not a child
        if (!isChild.has(parent)) {
          recursive(
            "Root",
            parent,
            children,
            columnInfoArray,
            allEntries,
            isFacies,
            faciesMap,
            blocksMap,
            aliases
          );
        }
      });
    }
  } catch (e: any) {
    console.log(
      "ERROR: failed to read columns for path " +
        decrypt_paths +
        ".  Error was: ",
      e
    );
  }
  return { columnInfoArray, datapackAgeInfo, aliases };
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
async function getAllEntries(
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
    let parsedChildren = spliceArrayAtFirstSpecialMatch(
      childrenstring!.split("\t")
    );
    //if the entry is a child, add it to a set.
    for (const child of parsedChildren.children) {
      isChild.add(child);
    }
    allEntries.set(parent, parsedChildren);
  }
  //set the age info if it exists
  datapackAgeInfo.datapackContainsSuggAge  = topAge != null || bottomAge != null
  if (topAge)
    datapackAgeInfo.topAge = topAge
  if(bottomAge)
    datapackAgeInfo.bottomAge = bottomAge
}
/**
 * This function will populate the param facies with the correct facies events
 * using a read stream
 * @param filename the filename to be parsed
 * @param facies the facies object containing all of the facies events
 */
async function getFaciesOrBlock(
  filename: string,
  faciesMap: Map<string, Facies>,
  blocksMap: Map<string, Block>,
  isFacies: Set<string>
) {
  const fileStream = createReadStream(filename);
  const readline = createInterface({ input: fileStream, crlfDelay: Infinity });
  let facies: Facies = {
    name: "",
    subFaciesInfo: [],
    minAge: 0,
    maxAge: 0,
    info: "",
    on: true,
  }
  let block: Block = {
    name: "",
    subBlockInfo: [],
    minAge: 0,
    maxAge: 0,
    info: "",
    on: true,
  };
  let name = "";
  let inFaciesBlock = false;
  let inBlockBlock = false;
  let blockName = "";
  let SubBlockInfos: SubBlockInfo[] = [];

  for await (const line of readline) {
    // we reached the end
    if ((!line || trimInvisibleCharacters(line) === "") && inFaciesBlock) {
      inFaciesBlock = false;
      addFaciesToFaciesMap(facies, faciesMap)
      continue;
    }
    // reached the end and store the key value pairs into blocksMap
    if ((!line || trimInvisibleCharacters(line) === "") && inBlockBlock) {
      inBlockBlock = false;
      addBlockToBlockMap(block, SubBlockInfos, blocksMap, blockName);
      continue;
    }
    let tabSeperated = line.split("\t");
    // we found a facies event location
    if (!inFaciesBlock && tabSeperated[1] === "facies") {
      isFacies.add(trimInvisibleCharacters(tabSeperated[0]!));
      facies.name = trimQuotes(tabSeperated[0]!);
      facies.info = tabSeperated[6] || ""
      if (tabSeperated[5] && (tabSeperated[5] === "off" || tabSeperated[5].length == 0 )) {
        facies.on = false
      }
      inFaciesBlock = true;
    } else if (inFaciesBlock) {
      let subFaciesInfo = processFacies(line);
      if (subFaciesInfo) {
        facies.subFaciesInfo.push(subFaciesInfo)
      }
    }

    // we found a block
    if (!inBlockBlock && tabSeperated[1] === "block") {
      blockName = trimQuotes(tabSeperated[0]!);
      let offIndex = tabSeperated.indexOf("off");
      if (offIndex != -1) {
        block.on = false;
      }

      let info = tabSeperated[tabSeperated.length - 1];
      const pattern = /\"*\"/;

      if (info && pattern.test(info)) {
        block.info = info;
      }

      inBlockBlock = true;
    } else if (inBlockBlock) {
      //get a single sub block
      let SubBlockInfo = processBlock(line);
      if (SubBlockInfo) {
        SubBlockInfos.push(SubBlockInfo);
      }
    }
  }

  if (inFaciesBlock) {
    addFaciesToFaciesMap(facies, faciesMap)
  }
  if (inBlockBlock) {
    addBlockToBlockMap(block, SubBlockInfos, blocksMap, blockName);
  }
}

function addFaciesToFaciesMap(facies: Facies, faciesMap: Map<string, Facies>) {
  for (const block of facies.subFaciesInfo) {
    facies.minAge = Math.min(block.age, facies.minAge)
    facies.maxAge = Math.max(block.age, facies.maxAge)
  }
  faciesMap.set(trimInvisibleCharacters(facies.name), facies)
  facies = {
    name: "",
    subFaciesInfo: [],
    minAge: 0,
    maxAge: 0,
    info: "",
    on: true,
  }
}

/**
 * add a block into blocksMap
 * @param block the block to be added
 * @param subBlockInfos the subBlockInfo of the block
 * @param blocksMap the map of blocks
 * @param blockName the name of the block
 */
function addBlockToBlockMap(
  block: Block,
  subBlockInfos: SubBlockInfo[],
  blocksMap: Map<string, Block>,
  blockName: string
) {
  let min = 0;
  let max = 0;

  if (subBlockInfos[0]) {
    min = subBlockInfos[0].age;
    max = subBlockInfos[0].age;
    block.subBlockInfo = subBlockInfos;
    for (let i = 1; i < subBlockInfos.length; i++) {
      if (subBlockInfos[i]) {
        let currentAge = subBlockInfos[i]!.age;
        min = Math.min(currentAge, min);
        max = Math.max(currentAge, max);
      }
    }
    block.minAge = min;
    block.maxAge = max;
  }
  blocksMap.set(blockName, block);
  block = {
    name: "",
    subBlockInfo: [],
    minAge: 0,
    maxAge: 0,
    info: "",
    on: true,
  };
  subBlockInfos = [];
}

/**
 * Processes a single subBlockInfo line
 * @param line the line to be processed
 * @returns A subBlock object
 */
function processBlock(line: string): SubBlockInfo | null {
  let currentSubBlockInfo = {
    label: "",
    age: 0,
    info: "",
    lineType: "",
  };
  const tabSeperated = line.split("\t");
  if (tabSeperated.length < 3) return null;
  const label = tabSeperated[1];
  const age = Number(tabSeperated[2]!);
  const info = tabSeperated[4];
  if (isNaN(age))
    throw new Error(
      "Error processing facies line, age: " + tabSeperated[2]! + " is NaN"
    );
  const lineType = tabSeperated[3];
  if (label) {
    currentSubBlockInfo.label = label;
  }
  currentSubBlockInfo.age = age;
  if (info) {
    currentSubBlockInfo.info = info;
  }
  if (lineType) {
    currentSubBlockInfo.lineType = lineType;
  }
  try {
    assertSubBlockInfo(currentSubBlockInfo);
  } catch (e) {
    console.log(
      `Error ${e} found while processing subBlockInfo, returning null`
    );
    return null;
  }
  return currentSubBlockInfo;
}

/**
 * Processes a single facies line
 * @param line the line to be processed
 * @returns A FaciesTimeBlock object
 */
function processFacies(line: string): SubFaciesInfo | null {
  let subFaciesInfo = {};
  if (line.toLowerCase().includes("primary")) {
    return null;
  }
  const tabSeperated = line.split("\t");
  if (tabSeperated.length < 4) return null;
  const age = Number(tabSeperated[3]!);
  if (isNaN(age))
    throw new Error(
      "Error processing facies line, age: " + tabSeperated[3]! + " is NaN"
    );
  // label doesn't exist for TOP or GAP
  if (!tabSeperated[2]) {
    subFaciesInfo = {
      rockType: tabSeperated[1]!,
      age,
      info: tabSeperated[3],
    };
  } else {
    subFaciesInfo = {
      rockType: tabSeperated[1]!,
      label: tabSeperated[2]!,
      age,
      info: tabSeperated[3]
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
  faciesMap: Map<string, Facies>,
  blocksMap: Map<string, Block>,
  aliases: Aliases,
): FaciesFoundAndAgeRange {
  const currentColumnInfo: ColumnInfo = {
    name: currentColumn,
    editName: currentColumn,
    on: true,
    fontsInfo: JSON.parse(JSON.stringify(defaultFontsInfo)),
    info: "",
    children: [],
    parent: parent,
    minAge: 0,
    maxAge: 0,
  };
  let returnValue: FaciesFoundAndAgeRange = {
    faciesFound: false,
    minAge: 99999,
    maxAge: -99999,
  };

  if (parsedColumnEntry) {
    currentColumnInfo.on = parsedColumnEntry.on;
    currentColumnInfo.info = parsedColumnEntry.info;
  }
  if (currentColumn && blocksMap.has(currentColumn)) {
    const currentBlock = blocksMap.get(currentColumn)!;

    currentColumnInfo.subBlockInfo = JSON.parse(JSON.stringify(currentBlock.subBlockInfo));

    currentColumnInfo.on = currentBlock.on;

    returnValue.minAge = currentBlock.minAge;
    returnValue.maxAge = currentBlock.maxAge;
  }
  if (faciesMap.has(trimInvisibleCharacters(currentColumn))) {
    const currentFacies = faciesMap.get(currentColumn)!
    currentColumnInfo.subFaciesInfo = JSON.parse(JSON.stringify(currentFacies.subFaciesInfo))
    returnValue.maxAge, currentColumnInfo.maxAge = Math.max(currentColumnInfo.maxAge, currentFacies.maxAge)
    returnValue.minAge, currentColumnInfo.minAge = Math.min(currentColumnInfo.minAge, currentFacies.minAge)
    currentColumnInfo.info = currentFacies.info
    currentColumnInfo.on = currentFacies.on
  }

childrenArray.push(currentColumnInfo);

  if (parsedColumnEntry) {
    parsedColumnEntry.children.forEach((child) => {
      // if the child is named the same as the parent, this will create an infinite loop
      if (!child || child === currentColumn) return;
      // if this is the final child then we store this as a potential alias
      // if (
      //   !allEntries.get(child) &&
      //   parsedColumnEntry.children.length == 1 &&
      //   isFacies.has(trimInvisibleCharacters(child))
      // ) {
      //   aliases[trimInvisibleCharacters(currentColumn)] = {
      //     altname: trimInvisibleCharacters(child)
      //   }
      //   returnValue.faciesFound = true;
      // }
      //check if it is a block


      const children = allEntries.get(child) || null;
      let compareValue: FaciesFoundAndAgeRange = recursive(
        currentColumn, // the current column becomes the parent
        child, // the child is now the current column
        children, // the children that allEntries has or [] if this child is the parent to no children
        currentColumnInfo.children, // the array to push all the new children into
        allEntries, // the mapping of all parents to children
        isFacies, // the set of all facies event names
        faciesMap,
        blocksMap,
        aliases, // aliases for any facies objects
      );
      returnValue.minAge = Math.min(compareValue.minAge, returnValue.minAge);
      returnValue.maxAge = Math.max(compareValue.minAge, returnValue.minAge);
      returnValue.faciesFound = compareValue.faciesFound;
      if (
        !returnValue.faciesFound &&
        isFacies.has(trimInvisibleCharacters(child))
      ) {
        returnValue.faciesFound = true;
        aliases[trimInvisibleCharacters(currentColumn)] = {
          altname: trimInvisibleCharacters(child)
        }
      }
    });
  }
  return returnValue;
}

