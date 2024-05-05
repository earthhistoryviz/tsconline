import { createReadStream } from "fs";
import {
  ColumnInfo,
  Facies,
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
  assertSubEventInfo,
  Range,
  ColumnHeaderProps,
  SubRangeInfo,
  assertSubRangeInfo,
  Chron,
  SubChronInfo,
  assertSubChronInfo,
  Point,
  assertSubPointInfo,
  SubPointInfo,
  Sequence,
  assertSubSequenceInfo,
  SubSequenceInfo,
  Transect,
  SubTransectInfo,
  assertSubTransectInfo,
  Freehand,
  SubFreehandInfo,
  assertSubFreehandInfo,
  assertColumnHeaderProps,
  ValidFontOptions,
  allFontOptions,
  DisplayedColumnTypes,
  ColumnInfoTypeMap,
  ColumnInfoType,
  assertSubInfo,
  SubInfo,
  assertDatapackParsingPack
} from "@tsconline/shared";
import { trimInvisibleCharacters, grabFilepaths, hasVisibleCharacters, capitalizeFirstLetter } from "./util.js";
import { createInterface } from "readline";
const patternForColor = /^(\d+\/\d+\/\d+)$/;
const patternForLineStyle = /^(solid|dashed|dotted)$/;
const patternForAbundance = /^(TOP|missing|rare|common|frequent|abundant|sample|flood)$/;

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
  fontOptions: ValidFontOptions[];
};
/**
 * parses the METACOLUMN and info of the children string
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
 * @param decryptFilePath the decryption folder location
 * @param files the files to be parsed
 * @returns
 */
export async function parseDatapacks(file: string, decryptFilePath: string): Promise<DatapackParsingPack | null> {
  const decryptPaths = await grabFilepaths([file], decryptFilePath, "datapacks");
  if (decryptPaths.length == 0)
    throw new Error(`Did not find any datapacks for ${file} in decryptFilePath ${decryptFilePath}`);
  const columnInfoArray: ColumnInfo[] = [];
  const isChild: Set<string> = new Set();
  const allEntries: Map<string, ParsedColumnEntry> = new Map();
  const faciesMap: Map<string, Facies> = new Map();
  const blocksMap: Map<string, Block> = new Map();
  const eventMap: Map<string, Event> = new Map();
  const rangeMap: Map<string, Range> = new Map();
  const chronMap: Map<string, Chron> = new Map();
  const pointMap: Map<string, Point> = new Map();
  const sequenceMap: Map<string, Sequence> = new Map();
  const transectMap: Map<string, Transect> = new Map();
  const freehandMap: Map<string, Freehand> = new Map();
  const blankMap: Map<string, ColumnHeaderProps> = new Map();
  const loneColumns: ColumnInfo[] = [];
  const returnValue: FaciesFoundAndAgeRange = {
    faciesFound: false,
    minAge: 99999,
    maxAge: -99999,
    fontOptions: ["Column Header"]
  };
  let topAge: number | null = null;
  let baseAge: number | null = null;
  let chartTitle = "Chart Title";
  let ageUnits = "Ma";
  let defaultChronostrat = "UNESCO";
  let date: string | null = null;
  let verticalScale: number | null = null;
  let formatVersion = 1.5;
  try {
    for (const decryptPath of decryptPaths) {
      const { units, title, chronostrat, datapackDate, vertScale, version, top, base } = await getAllEntries(
        decryptPath,
        allEntries,
        isChild
      );
      topAge = top;
      baseAge = base;
      chartTitle = title;
      defaultChronostrat = chronostrat;
      ageUnits = units;
      if (datapackDate) date = datapackDate;
      if (vertScale) verticalScale = vertScale;
      if (version) formatVersion = version;
      const allParsedEntries = Array.from(allEntries.keys()).concat(Array.from(isChild));
      await getColumnTypes(
        decryptPath,
        faciesMap,
        blocksMap,
        eventMap,
        rangeMap,
        chronMap,
        pointMap,
        sequenceMap,
        transectMap,
        freehandMap,
        blankMap,
        allParsedEntries,
        loneColumns,
        ageUnits
      );
      // all the entries parsed thus far (only from parent and child relationships)
      // only iterate over parents. if we encounter one that is a child, the recursive function
      // should have already processed it.
      allEntries.forEach((children, parent) => {
        // if the parent is not a child
        if (!isChild.has(parent)) {
          const compare = recursive(
            chartTitle,
            parent,
            children,
            columnInfoArray,
            allEntries,
            faciesMap,
            blocksMap,
            eventMap,
            rangeMap,
            chronMap,
            pointMap,
            sequenceMap,
            transectMap,
            freehandMap,
            blankMap,
            ageUnits
          );
          returnValue.maxAge = Math.max(returnValue.maxAge, compare.maxAge);
          returnValue.minAge = Math.min(returnValue.minAge, compare.minAge);
          returnValue.fontOptions = Array.from(
            new Set<ValidFontOptions>([...compare.fontOptions, ...returnValue.fontOptions])
          );
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
    return null;
  }
  const columnInfo = columnInfoArray.concat(loneColumns);
  columnInfo.unshift({
    name: ageUnits.split(" ")[0]!,
    editName: ageUnits.split(" ")[0]!,
    fontsInfo: JSON.parse(JSON.stringify(defaultFontsInfo)),
    fontOptions: ["Column Header", "Ruler Label"],
    on: true,
    width: 100,
    enableTitle: true,
    rgb: {
      r: 255,
      g: 255,
      b: 255
    },
    popup: "",
    children: [],
    parent: chartTitle,
    minAge: Number.MIN_VALUE,
    maxAge: Number.MAX_VALUE,
    units: ageUnits,
    columnDisplayType: "Ruler"
  });
  const chartColumn: ColumnInfo = {
    name: chartTitle,
    editName: chartTitle,
    fontsInfo: JSON.parse(JSON.stringify(defaultFontsInfo)),
    fontOptions: returnValue.fontOptions,
    on: true,
    width: 100,
    enableTitle: true,
    rgb: {
      r: 255,
      g: 255,
      b: 255
    },
    popup: "",
    children: columnInfo,
    parent: "Chart Root",
    minAge: returnValue.minAge,
    maxAge: returnValue.maxAge,
    units: ageUnits,
    columnDisplayType: "RootColumn"
  };
  const datapackParsingPack = { columnInfo: chartColumn, ageUnits, defaultChronostrat, formatVersion };
  assertDatapackParsingPack(datapackParsingPack);
  if (date) datapackParsingPack.date = date;
  if (topAge || topAge === 0) datapackParsingPack.topAge = topAge;
  if (baseAge || baseAge === 0) datapackParsingPack.baseAge = baseAge;
  if (verticalScale) datapackParsingPack.verticalScale = verticalScale;
  return datapackParsingPack;
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
  isChild: Set<string>
) {
  const fileStream = createReadStream(filename);
  const readline = createInterface({ input: fileStream, crlfDelay: Infinity });
  let top: number | null = null;
  let base: number | null = null;
  let date: string | null = null;
  let ageUnits: string = "Ma";
  let chartTitle: string = "Chart Title";
  let defaultChronostrat = "UNESCO";
  let formatVersion = 1.5;
  let vertScale: number | null = null;
  for await (const line of readline) {
    if (!line) continue;
    // grab any datapack properties
    const split = line.split("\t");
    let value = split[1];
    if (value) {
      switch (split[0]) {
        case "SetTop:":
          if (!isNaN(Number(value.trim()))) top = Number(value);
          break;
        case "SetBase:":
          if (!isNaN(Number(value.trim()))) base = Number(value);
          break;
        case "chart title:":
          chartTitle = value.trim();
          break;
        case "age units:":
          ageUnits = value.trim();
          break;
        case "default chronostrat:":
          if (!/^(USGS|UNESCO)$/.test(value.trim())) {
            console.error(
              "Default chronostrat value in datapack is neither USGS nor UNESCO, setting to default UNESCO"
            );
            break;
          }
          defaultChronostrat = value.trim();
          break;
        case "date:":
          if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) value = value.split("/").reverse().join("-");
          date = new Date(value).toISOString().split("T")[0] || null;
          break;
        case "format version:":
          formatVersion = Number(value.trim());
          if (isNaN(formatVersion)) {
            console.error("Format version is not a number, setting to default 1.5");
            formatVersion = 1.5;
          }
          break;
        case "SetScale:":
          vertScale = Number(value);
          if (isNaN(vertScale)) {
            console.error("Vertical scale is not a number, setting to default null");
            vertScale = null;
          }
          break;
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
  return {
    title: chartTitle,
    units: ageUnits,
    top,
    base,
    chronostrat: defaultChronostrat,
    datapackDate: date,
    vertScale,
    version: formatVersion
  };
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
  eventMap: Map<string, Event>,
  rangeMap: Map<string, Range>,
  chronMap: Map<string, Chron>,
  pointMap: Map<string, Point>,
  sequenceMap: Map<string, Sequence>,
  transectMap: Map<string, Transect>,
  freehandMap: Map<string, Freehand>,
  blankMap: Map<string, ColumnHeaderProps>,
  allParsedEntries: string[],
  loneColumns: ColumnInfo[],
  units: string
) {
  const fileStream = createReadStream(filename);
  const readline = createInterface({ input: fileStream, crlfDelay: Infinity });
  const freehand: Freehand = {
    ...createDefaultColumnHeaderProps(),
    subFreehandInfo: []
  };
  const transect: Transect = {
    ...createDefaultColumnHeaderProps(),
    subTransectInfo: []
  };
  const sequence: Sequence = {
    ...createDefaultColumnHeaderProps(),
    subSequenceInfo: []
  };
  const point: Point = {
    ...createDefaultColumnHeaderProps(),
    subPointInfo: []
  };
  const range: Range = {
    ...createDefaultColumnHeaderProps(),
    subRangeInfo: []
  };
  const event: Event = {
    ...createDefaultColumnHeaderProps(),
    subEventInfo: [],
    width: 150,
    on: false
  };
  const facies: Facies = {
    ...createDefaultColumnHeaderProps(),
    subFaciesInfo: []
  };
  const block: Block = {
    ...createDefaultColumnHeaderProps(),
    subBlockInfo: []
  };
  const chron: Chron = {
    ...createDefaultColumnHeaderProps(),
    subChronInfo: []
  };
  const blank: ColumnHeaderProps = createDefaultColumnHeaderProps();
  let inFaciesBlock = false;
  let inBlockBlock = false;
  let inEventBlock = false;
  let inRangeBlock = false;
  let inChronBlock = false;
  let inPointBlock = false;
  let inSequenceBlock = false;
  let inTransectBlock = false;
  let inFreehandBlock = false;

  for await (const line of readline) {
    if (!line || trimInvisibleCharacters(line) === "") {
      // we reached the end and store the key value pairs in to faciesMap
      if (inFaciesBlock) {
        inFaciesBlock = processColumn(
          "Facies",
          facies,
          "subFaciesInfo",
          allParsedEntries,
          addFaciesToFaciesMap,
          faciesMap,
          units,
          loneColumns
        );
      } else if (inBlockBlock) {
        inBlockBlock = processColumn(
          "Block",
          block,
          "subBlockInfo",
          allParsedEntries,
          addBlockToBlockMap,
          blocksMap,
          units,
          loneColumns
        );
      } else if (inEventBlock) {
        inEventBlock = processColumn(
          "Event",
          event,
          "subEventInfo",
          allParsedEntries,
          addEventToEventMap,
          eventMap,
          units,
          loneColumns
        );
      } else if (inRangeBlock) {
        inRangeBlock = processColumn(
          "Range",
          range,
          "subRangeInfo",
          allParsedEntries,
          addRangeToRangeMap,
          rangeMap,
          units,
          loneColumns
        );
      } else if (inChronBlock) {
        inChronBlock = processColumn(
          "Chron",
          chron,
          "subChronInfo",
          allParsedEntries,
          addChronToChronMap,
          chronMap,
          units,
          loneColumns
        );
      } else if (inPointBlock) {
        inPointBlock = processColumn(
          "Point",
          point,
          "subPointInfo",
          allParsedEntries,
          addPointToPointMap,
          pointMap,
          units,
          loneColumns
        );
      } else if (inSequenceBlock) {
        inSequenceBlock = processColumn(
          "Sequence",
          sequence,
          "subSequenceInfo",
          allParsedEntries,
          addSequenceToSequenceMap,
          sequenceMap,
          units,
          loneColumns
        );
      } else if (inTransectBlock) {
        inTransectBlock = processColumn(
          "Transect",
          transect,
          "subTransectInfo",
          allParsedEntries,
          addTransectToTransectMap,
          transectMap,
          units,
          loneColumns
        );
      } else if (inFreehandBlock) {
        inFreehandBlock = processColumn(
          "Freehand",
          freehand,
          "subFreehandInfo",
          allParsedEntries,
          addFreehandToFreehandMap,
          freehandMap,
          units,
          loneColumns
        );
      }
      continue;
    }

    const tabSeparated = line.split("\t");
    if (tabSeparated[1] === "blank") {
      setColumnHeaders(blank, tabSeparated);
      blankMap.set(blank.name, JSON.parse(JSON.stringify(blank)));
      Object.assign(blank, { ...createDefaultColumnHeaderProps() });
      continue;
    }
    if (
      !inFreehandBlock &&
      (tabSeparated[1] === "freehand" ||
        tabSeparated[1] === "freehand-overlay" ||
        tabSeparated[1] === "freehand-underlay")
    ) {
      setColumnHeaders(freehand, tabSeparated);
      inFreehandBlock = true;
    } else if (inFreehandBlock) {
      const subFreehandInfo = processFreehand(line);
      if (subFreehandInfo) {
        freehand.subFreehandInfo.push(subFreehandInfo);
      }
    }
    if (!inTransectBlock && tabSeparated[1] === "transect") {
      setColumnHeaders(transect, tabSeparated);
      inTransectBlock = true;
    } else if (inTransectBlock) {
      if (tabSeparated[0] === "POLYGON" || tabSeparated[0] === "TEXT") {
        addTransectToTransectMap(transect, transectMap);
        inTransectBlock = false;
        continue;
      }
      const subTransectInfo = processTransect(line);
      if (subTransectInfo) {
        transect.subTransectInfo.push(subTransectInfo);
      }
    }
    if (!inSequenceBlock && (tabSeparated[1] === "sequence" || tabSeparated[1] === "trend")) {
      setColumnHeaders(sequence, tabSeparated);
      inSequenceBlock = true;
    } else if (inSequenceBlock) {
      const subSequenceInfo = processSequence(line);
      if (subSequenceInfo) {
        sequence.subSequenceInfo.push(subSequenceInfo);
      }
    }
    if (!inPointBlock && tabSeparated[1] === "point") {
      setColumnHeaders(point, tabSeparated);
      inPointBlock = true;
    } else if (inPointBlock) {
      const subPointInfo = processPoint(line);
      if (subPointInfo) {
        point.subPointInfo.push(subPointInfo);
      }
    }
    if (!inRangeBlock && tabSeparated[1] === "range") {
      setColumnHeaders(range, tabSeparated);
      inRangeBlock = true;
    } else if (inRangeBlock) {
      const subRangeInfo = processRange(line);
      if (subRangeInfo) {
        range.subRangeInfo.push(subRangeInfo);
      }
    }
    // we found an event block
    if (!inEventBlock && tabSeparated[1] === "event") {
      setColumnHeaders(event, tabSeparated);
      inEventBlock = true;
    } else if (inEventBlock) {
      const subEventInfo = processEvent(line);
      if (subEventInfo) {
        event.subEventInfo.push(subEventInfo);
      }
    }
    // we found a facies block
    if (!inFaciesBlock && tabSeparated[1] === "facies") {
      setColumnHeaders(facies, tabSeparated);
      inFaciesBlock = true;
    } else if (inFaciesBlock) {
      const subFaciesInfo = processFacies(line);
      if (subFaciesInfo) {
        facies.subFaciesInfo.push(subFaciesInfo);
      }
    }

    if (!inChronBlock && (tabSeparated[1] === "chron" || tabSeparated[1] === "chron-only")) {
      setColumnHeaders(chron, tabSeparated);
      inChronBlock = true;
    } else if (inChronBlock) {
      const subChronInfo = processChron(line);
      if (subChronInfo) {
        chron.subChronInfo.push(subChronInfo);
      }
    }

    // we found a block
    if (!inBlockBlock && tabSeparated[1] === "block") {
      setColumnHeaders(block, tabSeparated);
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
    processColumn(
      "Facies",
      facies,
      "subFaciesInfo",
      allParsedEntries,
      addFaciesToFaciesMap,
      faciesMap,
      units,
      loneColumns
    );
  } else if (inBlockBlock) {
    processColumn("Block", block, "subBlockInfo", allParsedEntries, addBlockToBlockMap, blocksMap, units, loneColumns);
  } else if (inEventBlock) {
    processColumn("Event", event, "subEventInfo", allParsedEntries, addEventToEventMap, eventMap, units, loneColumns);
  } else if (inRangeBlock) {
    processColumn("Range", range, "subRangeInfo", allParsedEntries, addRangeToRangeMap, rangeMap, units, loneColumns);
  } else if (inChronBlock) {
    processColumn("Chron", chron, "subChronInfo", allParsedEntries, addChronToChronMap, chronMap, units, loneColumns);
  } else if (inPointBlock) {
    processColumn("Point", point, "subPointInfo", allParsedEntries, addPointToPointMap, pointMap, units, loneColumns);
  } else if (inSequenceBlock) {
    processColumn(
      "Sequence",
      sequence,
      "subSequenceInfo",
      allParsedEntries,
      addSequenceToSequenceMap,
      sequenceMap,
      units,
      loneColumns
    );
  } else if (inTransectBlock) {
    processColumn(
      "Transect",
      transect,
      "subTransectInfo",
      allParsedEntries,
      addTransectToTransectMap,
      transectMap,
      units,
      loneColumns
    );
  } else if (inFreehandBlock) {
    processColumn(
      "Freehand",
      freehand,
      "subFreehandInfo",
      allParsedEntries,
      addFreehandToFreehandMap,
      freehandMap,
      units,
      loneColumns
    );
  }
}

/**
 * Set a general column header and all it's properties
 * @param column
 * @param tabSeparated
 */
function setColumnHeaders(column: ColumnHeaderProps, tabSeparated: string[]) {
  column.name = tabSeparated[0]!;
  const width = Number(tabSeparated[2]!);
  const rgb = tabSeparated[3];
  const enableTitle = tabSeparated[4];
  const on = tabSeparated[5];
  column.popup = tabSeparated[6] || "";
  if (width) {
    if (isNaN(width)) {
      console.log(`Error found while processing column width, got: ${width} and will be setting width to 100`);
    } else {
      column.width = width;
    }
  }
  if (rgb && patternForColor.test(rgb)) {
    const rgbArray = rgb.split("/");
    column.rgb.r = Number(rgbArray[0]!);
    column.rgb.g = Number(rgbArray[1]!);
    column.rgb.b = Number(rgbArray[2]!);
  }
  if (enableTitle && enableTitle === "notitle") {
    column.enableTitle = false;
  }
  if (on === "off") {
    column.on = false;
  } else if (on === "on") {
    column.on = true;
  }
  try {
    assertColumnHeaderProps(column);
  } catch (e) {
    console.log(`Error ${e} found while processing column header, setting to default`);
    Object.assign(column, { ...createDefaultColumnHeaderProps() });
  }
}

/**
 * adds a freehand object to the map. will reset the freehand object.
 * @param transect
 * @param transectMap
 */
function addFreehandToFreehandMap(freehand: Freehand, freehandMap: Map<string, Freehand>) {
  for (const subFreehand of freehand.subFreehandInfo) {
    freehand.minAge = Math.min(subFreehand.topAge, freehand.minAge);
    freehand.maxAge = Math.max(subFreehand.baseAge, freehand.maxAge);
  }
  freehandMap.set(freehand.name, JSON.parse(JSON.stringify(freehand)));
  Object.assign(freehand, { ...createDefaultColumnHeaderProps(), subFreehandInfo: [] });
}
/**
 * adds a transect object to the map. will reset the transect object.
 * @param transect
 * @param transectMap
 */
function addTransectToTransectMap(transect: Transect, transectMap: Map<string, Transect>) {
  for (const subTransect of transect.subTransectInfo) {
    transect.minAge = Math.min(subTransect.age, transect.minAge);
    transect.maxAge = Math.max(subTransect.age, transect.maxAge);
  }
  transectMap.set(transect.name, JSON.parse(JSON.stringify(transect)));
  Object.assign(transect, { ...createDefaultColumnHeaderProps(), subTransectInfo: [] });
}
/**
 * adds a sequence object to the map. will reset the sequence object.
 * @param sequence
 * @param sequenceMap
 */
function addSequenceToSequenceMap(sequence: Sequence, sequenceMap: Map<string, Sequence>) {
  for (const subSequence of sequence.subSequenceInfo) {
    sequence.minAge = Math.min(subSequence.age, sequence.minAge);
    sequence.maxAge = Math.max(subSequence.age, sequence.maxAge);
  }
  sequenceMap.set(sequence.name, JSON.parse(JSON.stringify(sequence)));
  Object.assign(sequence, { ...createDefaultColumnHeaderProps(), subSequenceInfo: [] });
}

/**
 * adds a point object to the map. will reset the point object.
 * @param point
 * @param pointMap
 */
function addPointToPointMap(point: Point, pointMap: Map<string, Point>) {
  for (const subPoint of point.subPointInfo) {
    point.minAge = Math.min(subPoint.age, point.minAge);
    point.maxAge = Math.max(subPoint.age, point.maxAge);
  }
  pointMap.set(point.name, JSON.parse(JSON.stringify(point)));
  Object.assign(point, { ...createDefaultColumnHeaderProps(), subPointInfo: [] });
}

/**
 * adds a chron object to the map. will reset the chron object.
 * @param chron
 * @param chronMap
 */
function addChronToChronMap(chron: Chron, chronMap: Map<string, Chron>) {
  for (const subChron of chron.subChronInfo) {
    chron.minAge = Math.min(subChron.age, chron.minAge);
    chron.maxAge = Math.max(subChron.age, chron.maxAge);
  }
  chronMap.set(chron.name, JSON.parse(JSON.stringify(chron)));
  Object.assign(chron, { ...createDefaultColumnHeaderProps(), subChronInfo: [] });
}

/**
 * adds a range object to the range map and resets the range object
 * @param range
 * @param rangeMap
 */
function addRangeToRangeMap(range: Range, rangeMap: Map<string, Range>) {
  for (const subRange of range.subRangeInfo) {
    range.minAge = Math.min(subRange.age, range.minAge);
    range.maxAge = Math.max(subRange.age, range.maxAge);
  }
  rangeMap.set(range.name, JSON.parse(JSON.stringify(range)));
  Object.assign(range, { ...createDefaultColumnHeaderProps(), subRangeInfo: [] });
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
  eventMap.set(event.name, JSON.parse(JSON.stringify(event)));
  Object.assign(event, { ...createDefaultColumnHeaderProps({ width: 150, on: false }), subEventInfo: [] });
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
  faciesMap.set(facies.name, JSON.parse(JSON.stringify(facies)));
  Object.assign(facies, { ...createDefaultColumnHeaderProps(), subFaciesInfo: [] });
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
  blocksMap.set(block.name, JSON.parse(JSON.stringify(block)));
  Object.assign(block, { ...createDefaultColumnHeaderProps(), subBlockInfo: [] });
}

/**
 * processes a single freehand line
 * @param line
 * @returns
 */
export function processFreehand(line: string): SubFreehandInfo | null {
  const subFreehandInfo = {
    topAge: 0,
    baseAge: 0
  };
  const tabSeparated = line.split("\t");
  if (tabSeparated.length < 4 || tabSeparated.length > 5 || line.includes("POLYGON")) return null;
  if (tabSeparated[0] === "image") {
    subFreehandInfo.topAge = Number(tabSeparated[2]!);
    subFreehandInfo.baseAge = Number(tabSeparated[3]!);
  } else {
    subFreehandInfo.topAge = Number(tabSeparated[3]!);
    subFreehandInfo.baseAge = Number(tabSeparated[4]!);
  }
  try {
    assertSubFreehandInfo(subFreehandInfo);
  } catch (e) {
    console.log(`Error ${e} found while processing subFreehandInfo, returning null`);
    return null;
  }
  return subFreehandInfo;
}
/**
 * processes a single subTransectInfo line
 * @param line
 * @returns
 */
export function processTransect(line: string): SubTransectInfo | null {
  const subTransectInfo = {
    age: 0
  };
  const tabSeparated = line.split("\t");
  if (tabSeparated.length < 2 || tabSeparated[0] || !tabSeparated[1]) return null;
  const age = Number(tabSeparated[1]!);
  if (isNaN(age)) throw new Error("Error processing transect line, age: " + tabSeparated[1]! + " is NaN");
  subTransectInfo.age = age;
  try {
    assertSubTransectInfo(subTransectInfo);
  } catch (e) {
    console.log(`Error ${e} found while processing subTransectInfo, returning null`);
    return null;
  }
  return subTransectInfo;
}

/**
 * processes a single subSequenceInfo line
 * @param line
 * @returns
 */
export function processSequence(line: string): SubSequenceInfo | null {
  let subSequenceInfo = {};
  const tabSeparated = line.split("\t");
  if (tabSeparated.length > 6 || tabSeparated.length < 5 || tabSeparated[0]) return null;
  const label = tabSeparated[1];
  const direction = tabSeparated[2]!;
  const age = Number(tabSeparated[3]!);
  const severity = capitalizeFirstLetter(tabSeparated[4]!);
  const popup = tabSeparated[5];
  if (isNaN(age) || !tabSeparated[3])
    throw new Error("Error processing sequence line, age: " + tabSeparated[2]! + " is NaN");
  if (label) {
    subSequenceInfo = {
      label,
      direction,
      age,
      severity,
      popup: popup || ""
    };
  } else {
    subSequenceInfo = {
      direction,
      age,
      severity,
      popup: popup || ""
    };
  }
  try {
    assertSubSequenceInfo(subSequenceInfo);
  } catch (e) {
    console.log(`Error ${e} found while processing subSequenceInfo, returning null`);
    return null;
  }
  return subSequenceInfo;
}
/**
 * process a single subChronInfo line
 * @param line
 * @returns
 */
export function processChron(line: string): SubChronInfo | null {
  let subChronInfo = {};
  const tabSeparated = line.split("\t");
  if (tabSeparated.length < 4 || tabSeparated.length > 5 || line.includes("Primary")) return null;
  const polarity = tabSeparated[1]!;
  const label = tabSeparated[2]!;
  const age = Number(tabSeparated[3]!);
  if (isNaN(age) || !tabSeparated[3])
    throw new Error(
      "Error processing chron line with label: " +
        label +
        ", and polarity: " +
        polarity +
        ", age: " +
        tabSeparated[3]! +
        " is NaN"
    );
  const popup = tabSeparated[4] || "";
  if (label) {
    subChronInfo = {
      polarity,
      age,
      label,
      popup
    };
  } else {
    subChronInfo = {
      polarity,
      age,
      popup
    };
  }
  try {
    assertSubChronInfo(subChronInfo);
  } catch (e) {
    console.log(`Error ${e} found while processing subBlockInfo, returning null`);
    return null;
  }
  return subChronInfo;
}
/**
 * process a single subRangeInfo line
 * @param line
 * @returns
 */
export function processRange(line: string): SubRangeInfo | null {
  const subRangeInfo = {
    label: "",
    age: 0,
    abundance: "TOP",
    popup: ""
  };
  const tabSeparated = line.split("\t");
  if (tabSeparated.length < 3 || tabSeparated.length > 5) return null;
  const label = tabSeparated[1]!;
  const age = Number(tabSeparated[2]!);
  if (isNaN(age) || !tabSeparated[2])
    throw new Error("Error processing range line, age: " + tabSeparated[2]! + " is NaN");
  const abundance = tabSeparated[3];
  const popup = tabSeparated[4];
  subRangeInfo.label = label;
  subRangeInfo.age = age;
  if (abundance && patternForAbundance.test(abundance)) {
    subRangeInfo.abundance = abundance;
  }
  if (popup) {
    subRangeInfo.popup = popup;
  }
  try {
    assertSubRangeInfo(subRangeInfo);
  } catch (e) {
    console.log(`Error ${e} found while processing subBlockInfo, returning null`);
    return null;
  }
  return subRangeInfo;
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
  if (isNaN(age) || !tabSeparated[2])
    throw new Error("Error processing event line, age: " + tabSeparated[2]! + " is NaN");
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
export function processPoint(line: string): SubPointInfo | null {
  const subPointInfo = {
    age: 0,
    xVal: 0,
    popup: ""
  };
  const tabSeparated = line.split("\t");
  if (tabSeparated.length < 2 || tabSeparated.length > 4 || tabSeparated[0]) return null;
  const age = Number(tabSeparated[1]!);
  const xVal = Number(tabSeparated[2]!);
  const popup = tabSeparated[3];
  if (isNaN(age) || !tabSeparated[1])
    throw new Error("Error processing point line, age: " + tabSeparated[1]! + " is NaN");
  subPointInfo.age = age;
  // sometimes they don't exist, contrary to file documentation
  if (!isNaN(xVal)) {
    subPointInfo.xVal = xVal;
  }
  if (popup) {
    subPointInfo.popup = popup;
  }
  try {
    assertSubPointInfo(subPointInfo);
  } catch (e) {
    console.log(`Error ${e} found while processing subPointInfo, returning null`);
    return null;
  }
  return subPointInfo;
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
  if (isNaN(age) || !tabSeparated[2])
    throw new Error("Error processing block line, age: " + tabSeparated[2]! + " is NaN");
  const lineStyle = tabSeparated[3];
  const rgb = tabSeparated[5];
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
    currentSubBlockInfo.rgb = {
      r: Number(rgbSeperated[0]!),
      g: Number(rgbSeperated[1]!),
      b: Number(rgbSeperated[2]!)
    };
    try {
      assertRGB(currentSubBlockInfo.rgb);
    } catch (e) {
      console.log(`Error ${e} found while processing block rgb, setting rgb to white`);
      currentSubBlockInfo.rgb = defaultColor;
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
  if (isNaN(age) || !tabSeparated[3])
    throw new Error("Error processing facies line, age: " + tabSeparated[3]! + " is NaN");
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
  eventMap: Map<string, Event>,
  rangeMap: Map<string, Range>,
  chronMap: Map<string, Chron>,
  pointMap: Map<string, Point>,
  sequenceMap: Map<string, Sequence>,
  transectMap: Map<string, Transect>,
  freehandMap: Map<string, Freehand>,
  blankMap: Map<string, ColumnHeaderProps>,
  units: string
): FaciesFoundAndAgeRange {
  const currentColumnInfo: ColumnInfo = {
    name: trimInvisibleCharacters(currentColumn),
    editName: trimInvisibleCharacters(currentColumn),
    on: true,
    enableTitle: true,
    fontsInfo: JSON.parse(JSON.stringify(defaultFontsInfo)),
    popup: "",
    children: [],
    parent: parent,
    minAge: Number.MAX_VALUE,
    maxAge: Number.MIN_VALUE,
    rgb: {
      r: 255,
      g: 255,
      b: 255
    },
    fontOptions: ["Column Header"],
    units,
    columnDisplayType: "MetaColumn"
  };
  const returnValue: FaciesFoundAndAgeRange = {
    faciesFound: false,
    minAge: 99999,
    maxAge: -99999,
    fontOptions: ["Column Header"]
  };

  if (parsedColumnEntry) {
    currentColumnInfo.on = parsedColumnEntry.on;
    currentColumnInfo.popup = parsedColumnEntry.info;
    currentColumnInfo.enableTitle = parsedColumnEntry.enableTitle;
  }
  if (transectMap.has(currentColumn)) {
    const { subTransectInfo, ...currentTransect } = transectMap.get(currentColumn)!;
    // TODO NOTE FOR FUTURE: @Paolo - Java file appends all fonts to this, but from trial and error, only column header makes sense. If this case changes here we would change it
    Object.assign(currentColumnInfo, {
      ...currentTransect,
      columnDisplayType: "Transect",
      subInfo: JSON.parse(JSON.stringify(subTransectInfo))
    });
    returnValue.minAge = currentColumnInfo.minAge;
    returnValue.maxAge = currentColumnInfo.maxAge;
  }
  if (sequenceMap.has(currentColumn)) {
    const { subSequenceInfo, ...currentSequence } = sequenceMap.get(currentColumn)!;
    Object.assign(currentColumnInfo, {
      ...currentSequence,
      fontOptions: getValidFontOptions("Sequence"),
      columnDisplayType: "Sequence",
      subInfo: JSON.parse(JSON.stringify(subSequenceInfo))
    });
    returnValue.fontOptions = currentColumnInfo.fontOptions;
    returnValue.minAge = currentColumnInfo.minAge;
    returnValue.maxAge = currentColumnInfo.maxAge;
  }
  if (blocksMap.has(currentColumn)) {
    const { subBlockInfo, ...currentBlock } = blocksMap.get(currentColumn)!;
    Object.assign(currentColumnInfo, {
      ...currentBlock,
      fontOptions: getValidFontOptions("Block"),
      columnDisplayType: "Zone",
      subInfo: JSON.parse(JSON.stringify(subBlockInfo))
    });
    returnValue.fontOptions = currentColumnInfo.fontOptions;
    returnValue.minAge = currentColumnInfo.minAge;
    returnValue.maxAge = currentColumnInfo.maxAge;
  }
  if (rangeMap.has(currentColumn)) {
    const { subRangeInfo, ...currentRange } = rangeMap.get(currentColumn)!;
    Object.assign(currentColumnInfo, {
      ...currentRange,
      fontOptions: getValidFontOptions("Range"),
      columnDisplayType: "Range",
      subInfo: JSON.parse(JSON.stringify(subRangeInfo))
    });
    returnValue.fontOptions = currentColumnInfo.fontOptions;
    returnValue.minAge = currentColumnInfo.minAge;
    returnValue.maxAge = currentColumnInfo.maxAge;
  }
  if (faciesMap.has(currentColumn)) {
    const { width, subFaciesInfo, ...currentFacies } = faciesMap.get(currentColumn)!;
    Object.assign(currentColumnInfo, {
      ...currentFacies,
      columnDisplayType: "BlockSeriesMetaColumn",
      subInfo: JSON.parse(JSON.stringify(subFaciesInfo))
    });
    addFaciesChildren(
      currentColumnInfo.children,
      currentColumnInfo.name,
      width,
      currentColumnInfo.minAge,
      currentColumnInfo.maxAge,
      currentColumnInfo.rgb,
      currentColumnInfo.fontOptions,
      units
    );
    returnValue.fontOptions = currentColumnInfo.fontOptions;
    returnValue.subFaciesInfo = subFaciesInfo;
    returnValue.minAge = currentColumnInfo.minAge;
    returnValue.maxAge = currentColumnInfo.maxAge;
  }
  if (eventMap.has(currentColumn)) {
    const { subEventInfo, ...currentEvent } = eventMap.get(currentColumn)!;
    Object.assign(currentColumnInfo, {
      ...currentEvent,
      fontOptions: getValidFontOptions("Event"),
      subInfo: JSON.parse(JSON.stringify(subEventInfo))
    });
    returnValue.fontOptions = currentColumnInfo.fontOptions;
    returnValue.maxAge = currentColumnInfo.maxAge;
    returnValue.minAge = currentColumnInfo.minAge;
  }
  if (chronMap.has(currentColumn)) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { width, subChronInfo, ...currentChron } = chronMap.get(currentColumn)!;
    Object.assign(currentColumnInfo, {
      ...currentChron,
      subInfo: JSON.parse(JSON.stringify(subChronInfo))
    });
    addChronChildren(
      currentColumnInfo.children,
      currentColumnInfo.name,
      currentColumnInfo.minAge,
      currentColumnInfo.maxAge,
      currentColumnInfo.rgb,
      currentColumnInfo.fontOptions,
      units
    );
    returnValue.fontOptions = currentColumnInfo.fontOptions;
    returnValue.maxAge = currentColumnInfo.maxAge;
    returnValue.minAge = currentColumnInfo.minAge;
  }
  if (pointMap.has(currentColumn)) {
    const { subPointInfo, ...currentPoint } = pointMap.get(currentColumn)!;
    Object.assign(currentColumnInfo, {
      ...currentPoint,
      fontOptions: getValidFontOptions("Point"),
      subInfo: JSON.parse(JSON.stringify(subPointInfo))
    });
    returnValue.fontOptions = currentColumnInfo.fontOptions;
    returnValue.maxAge = currentColumnInfo.maxAge;
    returnValue.minAge = currentColumnInfo.minAge;
  }
  if (freehandMap.has(currentColumn)) {
    const { subFreehandInfo, ...currentFreehand } = freehandMap.get(currentColumn)!;
    // TODO NOTE FOR FUTURE: @Paolo - Java file appends all fonts to this, but from trial and error, only column header makes sense. If this case changes here we would change it
    Object.assign(currentColumnInfo, {
      ...currentFreehand,
      subInfo: JSON.parse(JSON.stringify(subFreehandInfo))
    });
    returnValue.maxAge = currentColumnInfo.maxAge;
    returnValue.minAge = currentColumnInfo.minAge;
  }
  if (blankMap.has(currentColumn)) {
    const currentBlank = blankMap.get(currentColumn)!;
    // TODO NOTE FOR FUTURE: @Paolo - Java file appends all fonts to this, but from trial and error, only column header makes sense. If this case changes here we would change it
    Object.assign(currentColumnInfo, currentBlank);
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
        eventMap,
        rangeMap,
        chronMap,
        pointMap,
        sequenceMap,
        transectMap,
        freehandMap,
        blankMap,
        units
      );
      returnValue.minAge = Math.min(compareValue.minAge, returnValue.minAge);
      returnValue.maxAge = Math.max(compareValue.maxAge, returnValue.maxAge);
      currentColumnInfo.fontOptions = Array.from(
        new Set([...currentColumnInfo.fontOptions, ...compareValue.fontOptions])
      );
      returnValue.fontOptions = currentColumnInfo.fontOptions;
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
        if (compareValue.subFaciesInfo) currentColumnInfo.subInfo = compareValue.subFaciesInfo;
      }
    });
  }
  return returnValue;
}

export function createDefaultColumnHeaderProps(overrides: Partial<ColumnHeaderProps> = {}): ColumnHeaderProps {
  const defaultRGB: RGB = { r: 255, g: 255, b: 255 };
  const defaultProps: ColumnHeaderProps = {
    name: "",
    minAge: Number.MAX_VALUE,
    maxAge: Number.MIN_VALUE,
    enableTitle: true,
    on: true,
    width: 100,
    popup: "",
    rgb: defaultRGB
  };

  return { ...defaultProps, ...overrides };
}

/**
 * facies columns consist of 4 different "columns" and we need to add them to the children array
 * since they are manually added in the java file
 * @param children the children to add to
 * @param name the parent
 * @param width the width of the parent
 * @param minAge the minage of the parent
 * @param maxAge  the maxage of the parent
 */
function addFaciesChildren(
  children: ColumnInfo[],
  name: string,
  width: number,
  minAge: number,
  maxAge: number,
  rgb: RGB,
  fontOptions: ValidFontOptions[],
  units: string
) {
  children.push({
    name: `${name} Facies`,
    editName: name,
    on: true,
    enableTitle: false,
    fontsInfo: JSON.parse(JSON.stringify(defaultFontsInfo)),
    fontOptions: getValidFontOptions("Facies"),
    popup: "",
    children: [],
    parent: name,
    minAge,
    maxAge,
    width: width * 0.4,
    rgb,
    units,
    columnDisplayType: "Facies"
  });
  children.push({
    name: `${name} Members`,
    editName: "Members",
    on: false,
    enableTitle: false,
    fontOptions: getValidFontOptions("Zone"),
    fontsInfo: JSON.parse(JSON.stringify(defaultFontsInfo)),
    popup: "",
    children: [],
    parent: name,
    minAge,
    maxAge,
    width,
    rgb,
    units,
    columnDisplayType: "Zone"
  });
  children.push({
    name: `${name} Facies Label`,
    editName: "Facies Label",
    on: true,
    enableTitle: false,
    fontsInfo: JSON.parse(JSON.stringify(defaultFontsInfo)),
    fontOptions: getValidFontOptions("Zone"),
    popup: "",
    children: [],
    parent: name,
    minAge,
    maxAge,
    width: width * 0.4,
    rgb,
    units,
    columnDisplayType: "Zone"
  });
  children.push({
    name: `${name} Series Label`,
    editName: "Series Label",
    on: true,
    enableTitle: false,
    fontsInfo: JSON.parse(JSON.stringify(defaultFontsInfo)),
    fontOptions: getValidFontOptions("Zone"),
    popup: "",
    children: [],
    parent: name,
    minAge,
    maxAge,
    rgb,
    width: width * 0.2,
    units,
    columnDisplayType: "Zone"
  });
  for (const child of children) {
    for (const fontOption of child.fontOptions) {
      if (!fontOptions.includes(fontOption)) {
        fontOptions.push(fontOption);
      }
    }
  }
}

/**
 * Chrons columns consist of three sub columns
 * Currently from trial and error, even if there is a width on the parent chrons
 * the children will have a width of 60, 40, 40
 * TODO check to make sure this is okay in the future
 * @param children
 * @param name
 * @param width
 * @param minAge
 * @param maxAge
 * @param rgb
 * @param fontOptions
 */
function addChronChildren(
  children: ColumnInfo[],
  name: string,
  minAge: number,
  maxAge: number,
  rgb: RGB,
  fontOptions: ValidFontOptions[],
  units: string
) {
  children.push({
    name: `${name} Chron`,
    editName: name,
    on: true,
    enableTitle: false,
    fontOptions: getValidFontOptions("Chron"),
    fontsInfo: JSON.parse(JSON.stringify(defaultFontsInfo)),
    popup: "",
    children: [],
    parent: name,
    minAge,
    maxAge,
    width: 60,
    rgb,
    units,
    columnDisplayType: "Chron"
  });
  children.push({
    name: `${name} Chron Label`,
    editName: "Chron Label",
    on: false,
    enableTitle: false,
    fontOptions: getValidFontOptions("Zone"),
    fontsInfo: JSON.parse(JSON.stringify(defaultFontsInfo)),
    popup: "",
    children: [],
    parent: name,
    minAge,
    maxAge,
    width: 40,
    rgb,
    units,
    columnDisplayType: "Zone"
  });
  children.push({
    name: `${name} Series Label`,
    editName: "Series Label",
    on: true,
    enableTitle: false,
    fontOptions: getValidFontOptions("Zone"),
    fontsInfo: JSON.parse(JSON.stringify(defaultFontsInfo)),
    popup: "",
    children: [],
    parent: name,
    minAge,
    maxAge,
    width: 40,
    rgb,
    units,
    columnDisplayType: "Zone"
  });
  for (const child of children) {
    for (const fontOption of child.fontOptions) {
      if (!fontOptions.includes(fontOption)) {
        fontOptions.push(fontOption);
      }
    }
  }
}

/**
 * For columns that don't have any parents
 * @param props
 * @param fontOptions
 * @param units
 * @param subInfo
 * @returns
 */
function createLoneColumn(
  props: ColumnHeaderProps,
  fontOptions: ValidFontOptions[],
  units: string,
  subInfo: SubInfo[],
  type: DisplayedColumnTypes
): ColumnInfo {
  // block changes to zone for display
  if (type === "Block") type = "Zone";
  return {
    ...props,
    editName: props.name,
    fontOptions,
    fontsInfo: JSON.parse(JSON.stringify(defaultFontsInfo)),
    children: [],
    parent: "",
    units,
    subInfo,
    columnDisplayType: type
  };
}

function getValidFontOptions(type: DisplayedColumnTypes): ValidFontOptions[] {
  switch (type) {
    case "Block":
    case "Zone":
      return ["Column Header", "Age Label", "Zone Column Label"];
    case "Chron":
      return ["Column Header", "Age Label"];
    case "Event":
      return ["Column Header", "Age Label", "Event Column Label", "Uncertainty Label", "Range Label"];
    case "Facies":
      return ["Column Header", "Age Label", "Uncertainty Label"];
    case "Point":
      return ["Column Header", "Point Column Scale Label"];
    case "Range":
      return [...allFontOptions];
    case "Sequence":
      return ["Column Header", "Age Label", "Sequence Column Label"];
    case "Ruler":
    case "AgeAge":
      return ["Column Header", "Age Label"];
    case "Transect":
      return ["Column Header"];
    case "Freehand":
      return ["Column Header"];
    default:
      return ["Column Header"];
  }
}

function processColumn<T extends ColumnInfoType>(
  type: T,
  column: ColumnInfoTypeMap[T],
  subInfoKey: keyof ColumnInfoTypeMap[T],
  allParsedEntries: string[],
  addFunction: (col: ColumnInfoTypeMap[T], map: Map<string, ColumnInfoTypeMap[T]>) => void,
  map: Map<string, ColumnInfoTypeMap[T]>,
  units: string,
  loneColumns: ColumnInfo[]
): boolean {
  if (allParsedEntries.includes(column.name)) {
    addFunction(column, map);
  } else {
    const { [subInfoKey]: subInfo, ...columnHeaderProps } = column;
    assertColumnHeaderProps(columnHeaderProps);
    assertSubInfo(subInfo);
    loneColumns.push(createLoneColumn(columnHeaderProps, getValidFontOptions(type), units, subInfo, type));
  }
  return false;
}
