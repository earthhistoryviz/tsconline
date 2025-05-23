import { createReadStream } from "fs";
import {
  ColumnInfo,
  Facies,
  BaseDatapackProps,
  SubBlockInfo,
  Block,
  RGB,
  assertSubBlockInfo,
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
  DisplayedColumnTypes,
  ColumnInfoTypeMap,
  ColumnInfoType,
  assertSubInfo,
  SubInfo,
  defaultEventSettings,
  isPointShape,
  assertPoint,
  defaultPointSettings,
  defaultPoint,
  calculateAutoScale,
  ColumnSpecificSettings,
  assertColumnSpecificSettings,
  isSubFreehandInfo,
  PointSettings,
  assertSubFaciesInfoArray,
  SubEventType,
  isSubEventType,
  defaultChronSettings,
  assertSubChronInfoArray,
  allColumnTypes,
  DatapackWarning,
  defaultRangeSettings,
  defaultZoneSettings,
  defaultSequenceSettings,
  assertSequence,
  SequenceSettings,
  ColumnTypeCounter,
  isDefaultChronostrat,
  DefaultChronostrat,
  DatapackMetadata,
  allFontOptions,
  Datapack,
  getUUIDOfDatapackType
} from "@tsconline/shared";
import {
  grabFilepaths,
  hasVisibleCharacters,
  capitalizeFirstLetter,
  formatColumnName,
  getClosestMatch,
  countFiles
} from "./util.js";
import { createInterface } from "readline";
import _ from "lodash";
import { join, parse } from "path";
import { parseMapPacks } from "./parse-map-packs.js";
import { DatapackParsingOptions } from "./load-packs.js";
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
const columnTypeCounter: ColumnTypeCounter = {
  Block: 0,
  Chron: 0,
  Event: 0,
  Facies: 0,
  Freehand: 0,
  Point: 0,
  Range: 0,
  Sequence: 0,
  Transect: 0,
  Blank: 0
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
    if (array[i]?.includes("off")) {
      array.splice(i, 1);
      i = i - 1;
    }
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
      array.splice(i + 2, 1);
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
export async function parseDatapacks(
  datapackMetadata: DatapackMetadata,
  decryptFilePath: string,
  options?: DatapackParsingOptions
): Promise<Datapack | null> {
  const decryptPaths = options?.nonStandardFilepath
    ? join(decryptFilePath, datapackMetadata.storedFileName)
    : await grabFilepaths([datapackMetadata.storedFileName], decryptFilePath, "datapacks");
  if (decryptPaths.length == 0)
    throw new Error(
      `Did not find any datapacks for ${datapackMetadata.originalFileName} in decryptFilePath ${decryptFilePath}`
    );
  const columnInfoArray: ColumnInfo[] = [];
  const isChild: Set<string> = new Set();
  const allEntries: Map<string, ParsedColumnEntry> = new Map();
  const loneColumns: Map<string, ColumnInfo> = new Map();
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
  let defaultChronostrat: DefaultChronostrat = "UNESCO";
  let date: string | null = null;
  let verticalScale: number | null = null;
  let formatVersion = 1.5;
  const warnings: DatapackWarning[] = [];
  // reset the columnTypeCounter IMPORTANT
  for (const columnType in columnTypeCounter) {
    columnTypeCounter[columnType as ColumnInfoType] = 0;
  }
  try {
    for (const decryptPath of decryptPaths) {
      const { units, title, chronostrat, datapackDate, vertScale, version, top, base, filePropertyLines } =
        await getAllEntries(decryptPath, allEntries, isChild);
      topAge = top;
      baseAge = base;
      chartTitle = title;
      defaultChronostrat = chronostrat;
      ageUnits = units;
      if (datapackDate) date = datapackDate;
      if (vertScale) verticalScale = vertScale;
      if (version) formatVersion = version;
      await getColumnTypes(decryptPath, loneColumns, ageUnits, filePropertyLines, warnings);
      // all the entries parsed thus far (only from parent and child relationships)
      // only iterate over parents. if we encounter one that is a child, the recursive function
      // should have already processed it.
      allEntries.forEach((children, parent) => {
        // if the parent is not a child
        if (!isChild.has(parent)) {
          const compare = recursive(
            "Chart Title",
            parent,
            children,
            columnInfoArray,
            allEntries,
            loneColumns,
            ageUnits,
            warnings
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
    throw new Error(`ERROR: failed to read columns for path ${decryptPaths}. ${e}`);
  }
  const columnInfo = columnInfoArray;
  loneColumns.forEach((column) => {
    if (isChild.has(column.name)) return;
    column.parent = "Chart Title";
    columnInfo.push(column);
  });
  columnInfo.unshift({
    name: ageUnits.split(" ")[0]!,
    editName: ageUnits.split(" ")[0]!,
    fontsInfo: _.cloneDeep(defaultFontsInfo),
    fontOptions: getValidFontOptions("Ruler"),
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
    parent: "Chart Title",
    minAge: Number.MIN_VALUE,
    maxAge: Number.MAX_VALUE,
    units: ageUnits,
    columnDisplayType: "Ruler",
    show: true,
    expanded: false
  });
  const chartColumn: ColumnInfo = {
    name: "Chart Title",
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
    columnDisplayType: "RootColumn",
    show: true,
    expanded: true
  };
  setShowLabels(chartColumn);

  const baseDatapackProps: BaseDatapackProps = {
    columnInfo: chartColumn,
    ageUnits,
    defaultChronostrat,
    formatVersion,
    columnTypeCount: _.cloneDeep(columnTypeCounter),
    datapackImageCount:
      (await countFiles(join(decryptFilePath, parse(datapackMetadata.storedFileName).name, "datapack-images"))) +
      (await countFiles(join(decryptFilePath, parse(datapackMetadata.storedFileName).name, "MapImages"))),
    totalColumns: Object.values(columnTypeCounter).reduce((a, b) => a + b, 0),
    mapPack: await parseMapPacks(
      [datapackMetadata.storedFileName],
      decryptFilePath,
      getUUIDOfDatapackType(datapackMetadata)
    )
  };
  const datapack: Datapack = {
    ...baseDatapackProps,
    ...datapackMetadata
  };
  // use datapack date if date not given by user
  if (date && !datapackMetadata.date) datapack.date = date;
  if (topAge || topAge === 0) datapack.topAge = topAge;
  if (baseAge || baseAge === 0) datapack.baseAge = baseAge;
  if (verticalScale) datapack.verticalScale = verticalScale;
  if (warnings.length > 0) datapack.warnings = warnings;
  return datapack;
}

/**
 * @Paolo I chose to implement this way to avoid creating crazy conditionals in the many ways we create columns since we have
 * to check multiple different types of columns and if the font options include a certain type of font option.
 * I also am not 100% sure of whether or not being specific about the font options is necessary, but I think it is.
 * (The xml gives everyone the ability to show labels, but I think it is better to be specific about it)
 * @param column
 */
function setShowLabels(column: ColumnInfo) {
  if (
    column.columnDisplayType !== "RootColumn" &&
    column.columnDisplayType !== "MetaColumn" &&
    column.columnDisplayType !== "BlockSeriesMetaColumn"
  ) {
    if (column.fontOptions.includes("Age Label")) column.showAgeLabels = false;
    if (column.fontOptions.includes("Uncertainty Label")) column.showUncertaintyLabels = false;
  }
  for (const child of column.children) {
    setShowLabels(child);
  }
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
  let defaultChronostrat: DefaultChronostrat = "UNESCO";
  let formatVersion = 1.5;
  let vertScale: number | null = null;
  let filePropertyLines = 0;
  for await (const line of readline) {
    if (!line) continue;
    // grab any datapack properties
    const split = line.split("\t");
    let value = split[1]?.trim();
    if (value) {
      switch (split[0]?.toLowerCase().trim()) {
        case "settop:":
          if (!isNaN(Number(value))) top = Number(value);
          filePropertyLines++;
          continue;
        case "setbase:":
          if (!isNaN(Number(value))) base = Number(value);
          filePropertyLines++;
          continue;
        case "chart title:":
          chartTitle = value;
          filePropertyLines++;
          continue;
        case "age units:":
          ageUnits = value;
          filePropertyLines++;
          continue;
        case "default chronostrat:":
          filePropertyLines++;
          if (!isDefaultChronostrat(value)) {
            console.error(
              "Default chronostrat value in datapack is neither USGS nor UNESCO, setting to default UNESCO"
            );
            continue;
          }
          defaultChronostrat = value;
          continue;
        case "date:":
          try {
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) value = value.split("/").reverse().join("-");
            date = new Date(value).toISOString().split("T")[0] || null;
            filePropertyLines++;
            continue;
          } catch (e) {
            // eslint-disable-next-line no-console
          }
          try {
            if (/^\d{2}\/\d{2}\/\d{2}$/.test(value)) value = value.split("/").reverse().join("-");
            date = new Date(value).toISOString().split("T")[0] || null;
            filePropertyLines++;
            continue;
          } catch (e) {
            // eslint-disable-next-line no-console
          }
          try {
            date = new Date(value).toISOString().split("T")[0] || null;
            filePropertyLines++;
            continue;
          } catch (e) {
            // eslint-disable-next-line no-console
          }
          filePropertyLines++;
          continue;
        case "format version:":
          formatVersion = Number(value);
          if (isNaN(formatVersion)) {
            console.error("Format version is not a number, setting to default 1.5");
            formatVersion = 1.5;
          }
          filePropertyLines++;
          continue;
        case "setscale:":
          vertScale = Number(value);
          if (isNaN(vertScale)) {
            console.error("Vertical scale is not a number, setting to default null");
            vertScale = null;
          }
          filePropertyLines++;
          continue;
      }
    }
    if (!line.includes("\t:\t")) {
      continue;
    }
    let parent = line.split("\t:\t")[0];

    const childrenstring = line.split("\t:\t")[1];
    if (!parent || !hasVisibleCharacters(parent) || !childrenstring || !hasVisibleCharacters(childrenstring)) continue;
    parent = formatColumnName(parent);
    const parsedChildren = spliceArrayAtFirstSpecialMatch(childrenstring!.split("\t"));
    //for formatted names in mapping
    for (let i = 0; i < parsedChildren.children.length; i++) {
      if (parsedChildren.children[i]) parsedChildren.children[i] = formatColumnName(parsedChildren.children[i]!);
    }
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
    version: formatVersion,
    filePropertyLines
  };
}
/**
 * This function will populate the maps with the parsed entries in the filename
 * using a read stream
 * @param filename the filename
 * @param loneColumns the lone columns
 * @param units the units
 * @param filePropertyLines the number of lines that are file properties
 */
export async function getColumnTypes(
  filename: string,
  loneColumns: Map<string, ColumnInfo>,
  units: string,
  filePropertyLines: number,
  warnings: DatapackWarning[]
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
    sequenceType: "sequence",
    subSequenceInfo: []
  };
  const point = {
    ...createDefaultColumnHeaderProps(),
    ..._.cloneDeep(defaultPoint)
  };
  assertPoint(point);
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

  let subEventType: SubEventType | null = null;
  let inFaciesBlock = false;
  let inBlockBlock = false;
  let inEventBlock = false;
  let inRangeBlock = false;
  let inChronBlock = false;
  let inPointBlock = false;
  let inSequenceBlock = false;
  let inTransectBlock = false;
  let inFreehandBlock = false;
  let inSkipBlock = false;
  let lineCount = 0;
  for await (const line of readline) {
    lineCount++;
    if (lineCount <= filePropertyLines) {
      continue;
    }
    if (!line.trim()) {
      // we reached the end and store the key value pairs in to faciesMap
      if (inFaciesBlock) {
        inFaciesBlock = processColumn("Facies", facies, "subFaciesInfo", units, loneColumns);
      } else if (inBlockBlock) {
        inBlockBlock = processColumn("Block", block, "subBlockInfo", units, loneColumns);
      } else if (inEventBlock) {
        // reset for any future event blocks
        inEventBlock = processColumn("Event", event, "subEventInfo", units, loneColumns);
        subEventType = null;
      } else if (inRangeBlock) {
        inRangeBlock = processColumn("Range", range, "subRangeInfo", units, loneColumns);
      } else if (inChronBlock) {
        inChronBlock = processColumn("Chron", chron, "subChronInfo", units, loneColumns);
      } else if (inPointBlock) {
        inPointBlock = processColumn("Point", point, "subPointInfo", units, loneColumns);
      } else if (inSequenceBlock) {
        inSequenceBlock = processColumn("Sequence", sequence, "subSequenceInfo", units, loneColumns);
      } else if (inTransectBlock) {
        inTransectBlock = processColumn("Transect", transect, "subTransectInfo", units, loneColumns);
      } else if (inFreehandBlock) {
        inFreehandBlock = processColumn("Freehand", freehand, "subFreehandInfo", units, loneColumns);
      } else if (inSkipBlock) {
        inSkipBlock = false;
      }
      continue;
    }
    const tabSeparated = line.split("\t");
    const colType = tabSeparated[1]?.trim().toLowerCase();
    if (colType?.includes("overlay")) {
      inSkipBlock = true;
      continue;
    } else if (inSkipBlock) {
      continue;
    }
    if (colType === "blank") {
      // has no subInfo so add straight
      setColumnHeaders(blank, tabSeparated, lineCount, warnings);
      loneColumns.set(blank.name, {
        ...blank,
        editName: blank.name,
        fontsInfo: JSON.parse(JSON.stringify(defaultFontsInfo)),
        fontOptions: getValidFontOptions("Blank"),
        children: [],
        parent: "",
        units,
        columnDisplayType: "Blank",
        show: true,
        expanded: false
      });
      Object.assign(blank, { ...createDefaultColumnHeaderProps() });
      continue;
    }
    if (!inFreehandBlock && colType === "freehand") {
      setColumnHeaders(freehand, tabSeparated, lineCount, warnings);
      inFreehandBlock = true;
      continue;
    } else if (inFreehandBlock) {
      const subFreehandInfo = processFreehand(line, lineCount, warnings);
      if (subFreehandInfo) {
        freehand.subFreehandInfo.push(subFreehandInfo);
      }
      continue;
    }
    if (!inTransectBlock && colType === "transect") {
      setColumnHeaders(transect, tabSeparated, lineCount, warnings);
      inTransectBlock = true;
      continue;
    } else if (inTransectBlock) {
      if (tabSeparated[0] === "POLYGON" || tabSeparated[0] === "TEXT") {
        processColumn("Transect", transect, "subTransectInfo", units, loneColumns);
        inSkipBlock = true;
        inTransectBlock = false;
        continue;
      }
      const subTransectInfo = processTransect(line, lineCount, warnings);
      if (subTransectInfo) {
        transect.subTransectInfo.push(subTransectInfo);
      }
      continue;
    }
    if (!inSequenceBlock && (colType === "sequence" || colType === "trend")) {
      setColumnHeaders(sequence, tabSeparated, lineCount, warnings);
      sequence.sequenceType = colType;
      inSequenceBlock = true;
      continue;
    } else if (inSequenceBlock) {
      const subSequenceInfo = processSequence(line, lineCount, warnings);
      if (subSequenceInfo) {
        sequence.subSequenceInfo.push(subSequenceInfo);
      }
      continue;
    }
    if (!inPointBlock && colType === "point") {
      setColumnHeaders(point, tabSeparated, lineCount, warnings);
      inPointBlock = true;
      continue;
    } else if (inPointBlock) {
      if (tabSeparated[0] && isPointShape(tabSeparated[0])) {
        configureOptionalPointSettings(tabSeparated, point);
      }
      const subPointInfo = processPoint(line, lineCount, warnings);
      if (subPointInfo) {
        point.subPointInfo.push(subPointInfo);
      }
      continue;
    }
    if (!inRangeBlock && colType === "range") {
      setColumnHeaders(range, tabSeparated, lineCount, warnings);
      inRangeBlock = true;
      continue;
    } else if (inRangeBlock) {
      const subRangeInfo = processRange(line, lineCount, warnings);
      if (subRangeInfo) {
        range.subRangeInfo.push(subRangeInfo);
      }
      continue;
    }
    // we found an event block
    if (!inEventBlock && colType === "event") {
      setColumnHeaders(event, tabSeparated, lineCount, warnings);
      inEventBlock = true;
      continue;
    } else if (inEventBlock) {
      const parsedSubEventType = tabSeparated[0]?.toUpperCase();
      if (isSubEventType(parsedSubEventType)) {
        subEventType = parsedSubEventType;
        continue;
      } else if (!subEventType) {
        warnings.push({
          lineNumber: lineCount,
          warning: `Line: ${lineCount} with event ${event.name}: no subEventType of FAD, LAD, EVENTS, or EVENT found. This event will be skipped and not processed.`
        });
        inEventBlock = false;
        Object.assign(event, { ...createDefaultColumnHeaderProps(), width: 150, on: false, subEventInfo: [] });
        continue;
      }
      const subEventInfo = processEvent(line, subEventType, lineCount, warnings);
      if (subEventInfo) {
        event.subEventInfo.push(subEventInfo);
      }
      continue;
    }
    // we found a facies block
    if (!inFaciesBlock && colType === "facies") {
      setColumnHeaders(facies, tabSeparated, lineCount, warnings);
      inFaciesBlock = true;
      continue;
    } else if (inFaciesBlock) {
      const subFaciesInfo = processFacies(line, lineCount, warnings);
      if (subFaciesInfo) {
        facies.subFaciesInfo.push(subFaciesInfo);
      }
      continue;
    }

    // TODO chron-only
    if (!inChronBlock && (colType === "chron" || colType === "chron-only")) {
      setColumnHeaders(chron, tabSeparated, lineCount, warnings);
      inChronBlock = true;
      continue;
    } else if (inChronBlock) {
      const subChronInfo = processChron(line, lineCount, warnings);
      if (subChronInfo) {
        chron.subChronInfo.push(subChronInfo);
      }
      continue;
    }

    // we found a block
    if (!inBlockBlock && colType === "block") {
      setColumnHeaders(block, tabSeparated, lineCount, warnings);
      inBlockBlock = true;
      continue;
    } else if (inBlockBlock) {
      //get a single sub block

      //make sure we don't pass by reference
      const subBlockInfo = processBlock(
        line,
        {
          r: block.rgb.r,
          g: block.rgb.g,
          b: block.rgb.b
        },
        lineCount,
        warnings
      );

      if (subBlockInfo) {
        block.subBlockInfo.push(subBlockInfo);
      }
      continue;
    }
    // make sure it's not a parent-child relationship and not a file property
    if (!tabSeparated.includes(":") && tabSeparated[0] && tabSeparated[1]) {
      const closest = getClosestMatch(tabSeparated[1]!, allColumnTypes, 3);
      if (closest) {
        warnings.push({
          lineNumber: lineCount,
          warning: `Error found while processing column type: "${tabSeparated[1]!}" for column ${tabSeparated[0]!}, closest match to existing column types found: ${closest}`,
          message: `Try using one of the following column types: ${allColumnTypes.join(", ")}`
        });
      } else {
        warnings.push({
          lineNumber: lineCount,
          warning: `Error found while processing column type: "${tabSeparated[1]!}" that doesn't match any existing column types (${allColumnTypes.join(", ")})`,
          message: `Try using one of the following column types: ${allColumnTypes.join(", ")}`
        });
      }
    }
  }

  if (inFaciesBlock) {
    processColumn("Facies", facies, "subFaciesInfo", units, loneColumns);
  } else if (inBlockBlock) {
    processColumn("Block", block, "subBlockInfo", units, loneColumns);
  } else if (inEventBlock) {
    processColumn("Event", event, "subEventInfo", units, loneColumns);
  } else if (inRangeBlock) {
    processColumn("Range", range, "subRangeInfo", units, loneColumns);
  } else if (inChronBlock) {
    processColumn("Chron", chron, "subChronInfo", units, loneColumns);
  } else if (inPointBlock) {
    processColumn("Point", point, "subPointInfo", units, loneColumns);
  } else if (inSequenceBlock) {
    processColumn("Sequence", sequence, "subSequenceInfo", units, loneColumns);
  } else if (inTransectBlock) {
    processColumn("Transect", transect, "subTransectInfo", units, loneColumns);
  } else if (inFreehandBlock) {
    processColumn("Freehand", freehand, "subFreehandInfo", units, loneColumns);
  }
  return warnings;
}

/**
 * Set a general column header and all it's properties
 * @param column
 * @param tabSeparated
 */
function setColumnHeaders(
  column: ColumnHeaderProps,
  tabSeparated: string[],
  lineCount: number,
  warnings: DatapackWarning[]
) {
  //for formatted names in ColumnInfo object
  column.name = formatColumnName(tabSeparated[0]!);
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
    warnings.push({
      warning: String(e),
      lineNumber: lineCount,
      message: `Error found while processing column header of ${column.name}, setting column to default`
    });
    Object.assign(column, { ...createDefaultColumnHeaderProps() });
  }
}

/**
 * processes a single freehand line
 * @param line
 * @returns
 */
export function processFreehand(line: string, lineCount: number, warnings: DatapackWarning[]): SubFreehandInfo | null {
  const subFreehandInfo = {
    topAge: 0,
    baseAge: 0
  };
  const tabSeparated = line.split("\t");
  if (tabSeparated.length < 4 || line.includes("POLYGON")) return null;
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
    warnings.push({
      lineNumber: lineCount,
      warning: String(e),
      message: `Line in Freehand column formatted incorrectly, this line will be skipped in processing`
    });
    return null;
  }
  return subFreehandInfo;
}
/**
 * processes a single subTransectInfo line
 * @param line
 * @returns
 */
export function processTransect(line: string, lineCount: number, warnings: DatapackWarning[]): SubTransectInfo | null {
  const subTransectInfo = {
    age: 0
  };
  const tabSeparated = line.split("\t");
  if (tabSeparated.length < 2 || tabSeparated[0] || !tabSeparated[1]) return null;
  const age = Number(tabSeparated[1]!);
  if (isNaN(age) || !tabSeparated[1]) {
    warnings.push({
      lineNumber: lineCount,
      warning: `Line in Transect column formatted incorrectly, age: ${tabSeparated[1]!} is not a valid number`,
      message: `This line will be skipped in processing`
    });
    return null;
  }
  subTransectInfo.age = age;
  try {
    assertSubTransectInfo(subTransectInfo);
  } catch (e) {
    warnings.push({
      lineNumber: lineCount,
      warning: String(e),
      message: `Line in Transect column formatted incorrectly, this line will be skipped in processing`
    });
    return null;
  }
  return subTransectInfo;
}

/**
 * processes a single subSequenceInfo line
 * @param line
 * @returns
 */
export function processSequence(line: string, lineCount: number, warnings: DatapackWarning[]): SubSequenceInfo | null {
  let subSequenceInfo = {};
  const tabSeparated = line.split("\t");
  if (tabSeparated.length < 5 || tabSeparated[0]?.trim()) {
    warnings.push({
      lineNumber: lineCount,
      warning: `Line in Sequence column formatted incorrectly`,
      message: `This line will be skipped in processing`
    });
    return null;
  }
  const label = tabSeparated[1];
  const direction = tabSeparated[2]!;
  const age = Number(tabSeparated[3]!);
  const severity = capitalizeFirstLetter(tabSeparated[4]!);
  const popup = tabSeparated[5];
  if (isNaN(age) || !tabSeparated[3]) {
    warnings.push({
      lineNumber: lineCount,
      warning: `Line in Sequence column formatted incorrectly, age: ${tabSeparated[3]!} is not a valid number`,
      message: `This line will be skipped in processing`
    });
    return null;
  }
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
    warnings.push({
      lineNumber: lineCount,
      warning: String(e),
      message: `Line in Sequence column formatted incorrectly, this line will be skipped in processing`
    });
    return null;
  }
  return subSequenceInfo;
}
/**
 * process a single subChronInfo line
 * @param line
 * @returns
 */
export function processChron(line: string, lineCount: number, warnings: DatapackWarning[]): SubChronInfo | null {
  let subChronInfo = {};
  const tabSeparated = line.split("\t");
  // skip primary lines
  if (line.toLowerCase().includes("primary")) return null;
  if (tabSeparated.length < 4 || tabSeparated[0]?.trim()) {
    warnings.push({
      lineNumber: lineCount,
      warning: `Line in Chron column formatted incorrectly`,
      message: `This line will be skipped in processing`
    });
    return null;
  }
  const polarity = tabSeparated[1]!;
  const label = tabSeparated[2]!;
  const age = Number(tabSeparated[3]!);
  if (isNaN(age) || !tabSeparated[3]) {
    warnings.push({
      lineNumber: lineCount,
      warning: `Line in Chron column formatted incorrectly, age: ${tabSeparated[3]!} is not a valid number`,
      message: `This line will be skipped in processing`
    });
    return null;
  }
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
    warnings.push({
      lineNumber: lineCount,
      warning: String(e),
      message: `Line in Chron column formatted incorrectly, this line will be skipped in processing`
    });
    return null;
  }
  return subChronInfo;
}
/**
 * process a single subRangeInfo line
 * @param line
 * @returns
 */
export function processRange(line: string, lineCount: number, warnings: DatapackWarning[]): SubRangeInfo | null {
  const subRangeInfo = {
    label: "",
    age: 0,
    abundance: "TOP",
    popup: ""
  };
  const tabSeparated = line.split("\t");
  if (tabSeparated.length < 3 || tabSeparated[0]?.trim()) {
    warnings.push({
      lineNumber: lineCount,
      warning: `Line in Range column formatted incorrectly`,
      message: `This line will be skipped in processing`
    });
    return null;
  }
  const label = tabSeparated[1]!;
  const age = Number(tabSeparated[2]!);
  if (isNaN(age) || !tabSeparated[2]) {
    warnings.push({
      lineNumber: lineCount,
      warning: `Line in Range column formatted incorrectly, age: ${tabSeparated[2]!} is not a valid number`,
      message: `This line will be skipped in processing`
    });
    return null;
  }
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
    warnings.push({
      lineNumber: lineCount,
      warning: String(e),
      message: `Line in Range column formatted incorrectly, this line will be skipped in processing`
    });
    return null;
  }
  return subRangeInfo;
}
/**
 * process a SubEventInfo
 * @param line
 * @returns
 */
export function processEvent(
  line: string,
  subEventType: SubEventType,
  lineCount: number,
  warnings: DatapackWarning[]
): SubEventInfo | null {
  const subEventInfo = {
    label: "",
    age: 0,
    popup: "",
    lineStyle: "solid",
    subEventType
  };
  const tabSeparated = line.split("\t");
  // some events wrap to the next line
  // TODO maybe ask professor ogg what the expected behavior is for wrapped events
  if (tabSeparated.length == 1 && tabSeparated[0]?.trim()) return null;
  if (tabSeparated.length < 3 || tabSeparated[0]?.trim()) {
    warnings.push({
      lineNumber: lineCount,
      warning: `Line in Event column formatted incorrectly`,
      message: `This line will be skipped in processing`
    });
    return null;
  }
  const label = tabSeparated[1]!;
  const age = Number(tabSeparated[2]!);
  if (isNaN(age) || !tabSeparated[2]) {
    warnings.push({
      lineNumber: lineCount,
      warning: `Line in Event column formatted incorrectly, age: ${tabSeparated[2]!} is not a valid number`,
      message: `This line will be skipped in processing`
    });
    return null;
  }
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
    warnings.push({
      lineNumber: lineCount,
      warning: String(e),
      message: `Line in Event column formatted incorrectly, this line will be skipped`
    });
    return null;
  }
  return subEventInfo;
}
export function processPoint(line: string, lineCount: number, warnings: DatapackWarning[]): SubPointInfo | null {
  const subPointInfo = {
    age: 0,
    xVal: 0,
    popup: ""
  };
  const tabSeparated = line.split("\t");
  if (isPointShape(tabSeparated[0]?.trim())) {
    return null;
  }
  if (tabSeparated.length < 2 || tabSeparated[0]?.trim()) {
    warnings.push({
      lineNumber: lineCount,
      warning: `Line in Point column formatted incorrectly`,
      message: `This line will be skipped in processing`
    });
    return null;
  }
  const age = parseFloat(tabSeparated[1]!);
  const xVal = parseFloat(tabSeparated[2]!);
  const popup = tabSeparated[3];
  if (isNaN(age) || !tabSeparated[1]) {
    warnings.push({
      lineNumber: lineCount,
      warning: `Line in Point column formatted incorrectly, age: ${tabSeparated[1]!} is not a valid number`,
      message: `This line will be skipped in processing`
    });
    return null;
  }
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
    warnings.push({
      lineNumber: lineCount,
      warning: String(e),
      message: `Line in Point column formatted incorrectly, this line will be skipped in processing`
    });
    return null;
  }
  return subPointInfo;
}
/**
 * Processes a single subBlockInfo line
 * @param line the line to be processed
 * @returns A subBlock object
 */
export function processBlock(
  line: string,
  defaultColor: RGB,
  lineCount: number,
  warnings: DatapackWarning[]
): SubBlockInfo | null {
  const currentSubBlockInfo = {
    label: "",
    age: 0,
    popup: "",
    lineStyle: "solid",
    rgb: defaultColor //if Block has color, set to that. If not, set to white
  };
  const tabSeparated = line.split("\t");
  if (tabSeparated.length < 3 || tabSeparated[0]?.trim()) {
    warnings.push({
      lineNumber: lineCount,
      warning: `Line in Block column formatted incorrectly`,
      message: `This line will be skipped in processing`
    });
    return null;
  }
  const label = tabSeparated[1];
  const age = Number(tabSeparated[2]!);
  const popup = tabSeparated[4];
  if (isNaN(age) || !tabSeparated[2]) {
    warnings.push({
      lineNumber: lineCount,
      warning: `Line in Block column formatted incorrectly, age: ${tabSeparated[2]!} is not a valid number`,
      message: `This line will be skipped in processing`
    });
    return null;
  }
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
  if (rgb?.trim() && rgb?.trim() !== "0") {
    if (patternForColor.test(rgb.trim())) {
      const rgbSeperated = rgb.split("/");
      currentSubBlockInfo.rgb = {
        r: Number(rgbSeperated[0]!),
        g: Number(rgbSeperated[1]!),
        b: Number(rgbSeperated[2]!)
      };
    } else {
      warnings.push({
        warning: `Invalid rgb found in block color "${rgb}", setting rgb to ${defaultColor.r}/${defaultColor.g}/${defaultColor.b}`,
        lineNumber: lineCount
      });
      currentSubBlockInfo.rgb = defaultColor;
    }
  }
  try {
    assertSubBlockInfo(currentSubBlockInfo);
  } catch (e) {
    warnings.push({
      warning: String(e),
      lineNumber: lineCount,
      message: `Line in Block column formatted incorrectly, this line will be skipped in processing`
    });
    return null;
  }
  return currentSubBlockInfo;
}

/**
 * Processes a single facies line
 * @param line the line to be processed
 * @returns A FaciesTimeBlock object
 */
export function processFacies(line: string, lineCount: number, warnings: DatapackWarning[]): SubFaciesInfo | null {
  let subFaciesInfo = {};
  if (line.toLowerCase().includes("primary")) {
    return null;
  }
  const tabSeparated = line.split("\t");
  if (tabSeparated.length < 4 || tabSeparated[0]?.trim()) {
    warnings.push({
      lineNumber: lineCount,
      warning: `Line in Facies column formatted incorrectly`,
      message: `This line will be skipped in processing`
    });
    return null;
  }
  const age = Number(tabSeparated[3]!);
  if (isNaN(age) || !tabSeparated[3]) {
    warnings.push({
      lineNumber: lineCount,
      warning: `Line in Facies column formatted incorrectly, age: ${tabSeparated[3]!} is not a valid number`,
      message: `This line will be skipped in processing`
    });
    return null;
  }
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
    warnings.push({
      lineNumber: lineCount,
      warning: String(e),
      message: `Line in Facies column formatted incorrectly, this line will be skipped in processing`
    });
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
  loneColumns: Map<string, ColumnInfo>,
  units: string,
  warnings: DatapackWarning[]
): FaciesFoundAndAgeRange {
  const returnValue: FaciesFoundAndAgeRange = {
    faciesFound: false,
    minAge: Number.MAX_SAFE_INTEGER,
    maxAge: Number.MIN_SAFE_INTEGER,
    fontOptions: ["Column Header"]
  };
  if (!loneColumns.has(currentColumn) && !allEntries.has(currentColumn)) {
    warnings.push({
      warning: `Column ${currentColumn} not found during datapack processing`,
      message: `In other words, this column was found as a child of a column, but information on it was not found in the file.`
    });
    return returnValue;
  }
  // lone column is a leaf column
  if (loneColumns.has(currentColumn)) {
    const currentColumnInfo = loneColumns.get(currentColumn)!;
    switch (currentColumnInfo.columnDisplayType) {
      case "Facies":
        currentColumnInfo.columnDisplayType = "BlockSeriesMetaColumn";
        assertSubFaciesInfoArray(currentColumnInfo.subInfo);
        addFaciesChildren(
          currentColumnInfo.children,
          currentColumnInfo.name,
          currentColumnInfo.width,
          currentColumnInfo.minAge,
          currentColumnInfo.maxAge,
          currentColumnInfo.rgb,
          currentColumnInfo.fontOptions,
          currentColumnInfo.subInfo,
          units
        );
        delete currentColumnInfo.width;
        assertSubFaciesInfoArray(currentColumnInfo.subInfo);
        returnValue.subFaciesInfo = currentColumnInfo.subInfo;
        break;
      case "Chron":
        currentColumnInfo.columnDisplayType = "BlockSeriesMetaColumn";
        assertSubChronInfoArray(currentColumnInfo.subInfo);
        addChronChildren(
          currentColumnInfo.children,
          currentColumnInfo.name,
          currentColumnInfo.minAge,
          currentColumnInfo.maxAge,
          currentColumnInfo.rgb,
          currentColumnInfo.fontOptions,
          currentColumnInfo.subInfo,
          units
        );
        delete currentColumnInfo.width;
        break;
    }
    returnValue.minAge = currentColumnInfo.minAge;
    returnValue.maxAge = currentColumnInfo.maxAge;
    returnValue.fontOptions = currentColumnInfo.fontOptions;
    currentColumnInfo.parent = parent;
    childrenArray.push(currentColumnInfo);
    return returnValue;
  }
  const currentColumnInfo: ColumnInfo = {
    name: currentColumn,
    editName: currentColumn,
    on: true,
    enableTitle: true,
    fontsInfo: JSON.parse(JSON.stringify(defaultFontsInfo)),
    popup: "",
    children: [],
    parent: parent,
    minAge: Number.MAX_VALUE,
    maxAge: Number.MIN_VALUE,
    show: true,
    rgb: {
      r: 255,
      g: 255,
      b: 255
    },
    fontOptions: ["Column Header"],
    units,
    columnDisplayType: "MetaColumn",
    expanded: false
  };

  if (parsedColumnEntry) {
    currentColumnInfo.on = parsedColumnEntry.on;
    currentColumnInfo.popup = parsedColumnEntry.info;
    currentColumnInfo.enableTitle = parsedColumnEntry.enableTitle;
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
        loneColumns,
        units,
        warnings
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
      if (!returnValue.faciesFound && compareValue.subFaciesInfo) {
        returnValue.faciesFound = true;
        currentColumnInfo.subInfo = compareValue.subFaciesInfo;
      }
    });
  }
  return returnValue;
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
  width: number = 150,
  minAge: number,
  maxAge: number,
  rgb: RGB,
  fontOptions: ValidFontOptions[],
  subFaciesInfo: SubFaciesInfo[],
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
    show: true,
    width: width * 0.4,
    rgb,
    units,
    columnDisplayType: "Facies",
    expanded: false,
    subInfo: subFaciesInfo
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
    show: true,
    width,
    rgb,
    units,
    columnDisplayType: "Zone",
    expanded: false,
    columnSpecificSettings: { orientation: "normal" }
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
    show: true,
    width: width * 0.4,
    rgb,
    units,
    columnDisplayType: "Zone",
    expanded: false,
    columnSpecificSettings: { orientation: "normal" }
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
    columnDisplayType: "Zone",
    show: true,
    expanded: false,
    columnSpecificSettings: { orientation: "vertical" }
  });
  columnTypeCounter.Block += 3;
  // add the font options present on children to parent
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
  subChronInfo: SubChronInfo[],
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
    columnDisplayType: "Chron",
    columnSpecificSettings: _.cloneDeep(defaultChronSettings),
    show: true,
    expanded: false,
    subInfo: subChronInfo
  });
  children.push({
    name: `${name} Chron Label`,
    editName: "Chron Label",
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
    columnDisplayType: "Zone",
    show: true,
    expanded: false,
    columnSpecificSettings: { orientation: "normal" }
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
    columnDisplayType: "Zone",
    show: true,
    expanded: false,
    columnSpecificSettings: { orientation: "vertical" }
  });
  columnTypeCounter.Block += 2;
  // add the font options present on children to parent
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
  type: DisplayedColumnTypes,
  columnSpecificSettings?: ColumnSpecificSettings
): ColumnInfo {
  // block changes to zone for display
  if (type === "Block") type = "Zone";
  const column: ColumnInfo = {
    ...props,
    editName: props.name,
    fontOptions,
    fontsInfo: JSON.parse(JSON.stringify(defaultFontsInfo)),
    children: [],
    parent: null,
    units,
    subInfo,
    columnDisplayType: type,
    show: true,
    expanded: false
  };
  addColumnSettings(column, columnSpecificSettings);
  return column;
}

function addColumnSettings(column: ColumnInfo, columnSpecificSettings?: ColumnSpecificSettings) {
  switch (column.columnDisplayType) {
    case "Event":
      column.columnSpecificSettings = _.cloneDeep(defaultEventSettings);
      break;
    case "Point":
      if (!columnSpecificSettings) {
        throw new Error("Error adding point column, no column specific settings found");
      }
      column.columnSpecificSettings = columnSpecificSettings;
      break;
    case "Range":
      column.columnSpecificSettings = _.cloneDeep(defaultRangeSettings);
      break;
    case "Sequence":
      if (!columnSpecificSettings) {
        throw new Error("Error adding sequence column, no column specific settings found");
      }
      column.columnSpecificSettings = columnSpecificSettings;
      break;
    case "Zone":
      column.columnSpecificSettings = _.cloneDeep(defaultZoneSettings);
      break;
    default:
      break;
  }
}

function processColumn<T extends ColumnInfoType>(
  type: T,
  column: ColumnInfoTypeMap[T],
  subInfoKey: keyof ColumnInfoTypeMap[T],
  units: string,
  loneColumns: Map<string, ColumnInfo>
): boolean {
  const { [subInfoKey]: subInfo, ...columnHeaderProps } = column;
  assertColumnHeaderProps(columnHeaderProps);
  assertSubInfo(subInfo, type);
  columnTypeCounter[type]++;
  for (const sub of subInfo) {
    // subFreehandInfo has a topAge and baseAge instead of age
    if (isSubFreehandInfo(sub)) {
      columnHeaderProps.maxAge = Math.max(sub.baseAge, columnHeaderProps.maxAge);
      columnHeaderProps.minAge = Math.min(sub.topAge, columnHeaderProps.minAge);
    } else {
      columnHeaderProps.maxAge = Math.max(sub.age, columnHeaderProps.maxAge);
      columnHeaderProps.minAge = Math.min(sub.age, columnHeaderProps.minAge);
    }
  }
  column.minAge = columnHeaderProps.minAge;
  column.maxAge = columnHeaderProps.maxAge;
  switch (type) {
    case "Point":
      assertPoint(column);
      // requires extra setup to handle point settings
      handlePointFields(column, loneColumns, units);
      break;
    case "Sequence":
      assertSequence(column);
      handleSequenceFields(column, loneColumns, units);
      break;
    default:
      loneColumns.set(
        column.name,
        createLoneColumn(columnHeaderProps, getValidFontOptions(type), units, subInfo, type)
      );
      break;
  }
  let partialColumn = {};
  // reset the column to default values
  switch (type) {
    case "Event":
      partialColumn = {
        width: 150,
        on: false
      };
      break;
    case "Point":
      partialColumn = { ..._.cloneDeep(defaultPoint) };
      break;
  }
  Object.assign(column, { ...createDefaultColumnHeaderProps(), [subInfoKey]: [], ...partialColumn });
  return false;
}
export function configureOptionalPointSettings(tabSeparated: string[], point: Point) {
  if (tabSeparated.length < 1) {
    console.log(
      "Error adding optional point configuration, line is not formatted correctly: " +
        tabSeparated +
        " with size " +
        tabSeparated.length
    );
    return;
  }
  if (isPointShape(tabSeparated[0])) {
    point.pointShape = tabSeparated[0];
  } else {
    // this is the only required parameter if this optional line exists
    console.log("Error adding optional point configuration, point shape is not valid: " + tabSeparated[0]);
    return;
  }
  if (tabSeparated[1] && /^(line|noline)$/.test(tabSeparated[1])) point.drawLine = tabSeparated[1] === "line";
  else if (tabSeparated[1] && patternForColor.test(tabSeparated[1])) {
    const rgb = tabSeparated[1].split("/");
    point.lineColor = {
      r: Number(rgb[0]),
      g: Number(rgb[1]),
      b: Number(rgb[2])
    };
    point.drawLine = true;
  }
  if (tabSeparated[2] && patternForColor.test(tabSeparated[2])) {
    const rgb = tabSeparated[2].split("/");
    point.fill = {
      r: Number(rgb[0]),
      g: Number(rgb[1]),
      b: Number(rgb[2])
    };
    point.drawFill = true;
  } else if (tabSeparated[2] && /^(nofill)$/.test(tabSeparated[2])) point.drawFill = false;
  if (tabSeparated[3] && !isNaN(Number(tabSeparated[3]))) point.lowerRange = Number(tabSeparated[3]);
  if (tabSeparated[4] && !isNaN(Number(tabSeparated[4]))) point.upperRange = Number(tabSeparated[4]);
  if (tabSeparated[5]) point.smoothed = tabSeparated[5] === "smoothed";
  assertPoint(point);
}

function handleSequenceFields(sequence: Sequence, loneColumns: Map<string, ColumnInfo>, units: string) {
  const sequenceStyle = "stroke-width: 0; fill: rgb(64, 191, 233);";
  const trendStyle = "stroke-width: 1; stroke: black; fill: rgb(64, 191, 233);";
  const sequenceColor = { r: 255, g: 255, b: 255 };
  const trendColor = { r: 245, g: 204, b: 131 };
  const { subSequenceInfo, sequenceType, ...headerInfo } = sequence;
  const columnSpecificSettings: SequenceSettings = {
    ..._.cloneDeep(defaultSequenceSettings)
  };
  columnSpecificSettings.type = sequenceType;
  if (sequenceType === "sequence") {
    columnSpecificSettings.graphStyle = sequenceStyle;
    headerInfo.rgb = sequenceColor;
  } else {
    columnSpecificSettings.graphStyle = trendStyle;
    headerInfo.rgb = trendColor;
  }
  assertColumnSpecificSettings(columnSpecificSettings, "Sequence");
  assertColumnHeaderProps(headerInfo);
  loneColumns.set(
    sequence.name,
    createLoneColumn(
      headerInfo,
      getValidFontOptions("Sequence"),
      units,
      subSequenceInfo,
      "Sequence",
      columnSpecificSettings
    )
  );
}

function handlePointFields(point: Point, loneColumns: Map<string, ColumnInfo>, units: string) {
  for (const subPoint of point.subPointInfo) {
    point.minX = Math.min(subPoint.xVal, point.minX);
    point.maxX = Math.max(subPoint.xVal, point.maxX);
  }
  if (
    point.lowerRange === 0 &&
    point.upperRange === 0 &&
    point.minX !== Number.MAX_VALUE &&
    point.maxX !== Number.MIN_VALUE
  ) {
    const { lowerRange, upperRange, scaleStep } = calculateAutoScale(point.minX, point.maxX);
    point.lowerRange = lowerRange;
    point.upperRange = upperRange;
    point.scaleStep = scaleStep;
  }
  const {
    lowerRange,
    upperRange,
    minX,
    maxX,
    scaleStep,
    drawFill,
    drawLine,
    lineColor,
    fill,
    smoothed,
    pointShape,
    subPointInfo,
    ...headerInfo
  } = point;
  const columnSpecificSettings: PointSettings = {
    ..._.cloneDeep(defaultPointSettings),
    lowerRange,
    upperRange,
    minX,
    maxX,
    scaleStep,
    drawFill,
    drawLine,
    lineColor,
    fill,
    smoothed,
    pointShape
  };
  assertColumnSpecificSettings(columnSpecificSettings, "Point");
  assertColumnHeaderProps(headerInfo);
  loneColumns.set(
    point.name,
    createLoneColumn(headerInfo, getValidFontOptions("Point"), units, subPointInfo, "Point", columnSpecificSettings)
  );
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

export function getValidFontOptions(type: DisplayedColumnTypes): ValidFontOptions[] {
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
      return ["Column Header", "Ruler Label"];
    case "Transect":
      return ["Column Header"];
    case "Freehand":
      return ["Column Header"];
    default:
      return ["Column Header"];
  }
}
