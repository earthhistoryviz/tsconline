// Shared types between app and server (i.e. messages they send back and forth)

export type SuccessfulServerResponse = {
  message: string;
};

export type ServerResponse = SuccessfulServerResponse | ServerResponseError;

export type DatapackParsingPack = {
  columnInfoArray: ColumnInfo[];
  datapackAgeInfo: DatapackAgeInfo;
};

export type IndexResponse = {
  datapackIndex: DatapackIndex;
  mapPackIndex: MapPackIndex;
};
export type DatapackIndex = {
  [name: string]: DatapackParsingPack;
};
export type MapPackIndex = {
  [name: string]: MapPack;
};
export type MapPack = {
  mapInfo: MapInfo;
  mapHierarchy: MapHierarchy;
};
export type SVGStatus = {
  ready: boolean;
};
export type Patterns = {
  [name: string]: {
    name: string;
    formattedName: string;
    filePath: string;
    color: Color;
  };
};
export type Color = {
  name: string;
  hex: string;
  rgb: RGB;
};
export type RGB = {
  r: number;
  g: number;
  b: number;
};
export type Presets = {
  [type: string]: ChartConfig[];
};

export type DatapackAgeInfo = {
  datapackContainsSuggAge: boolean; //Default Age is not age located in datapack. Should be false if age exists, otherwise true.
  topAge?: number;
  bottomAge?: number;
};

export type ColumnHeaderProps = {
  name: string;
  minAge: number;
  maxAge: number;
  enableTitle: boolean;
  on: boolean;
  width: number;
  popup: string;
  rgb: RGB;
};

export type ChartConfig = {
  icon: string; // path to icon image
  background: string; // path to background image
  title: string;
  description: string;
  settings: string; // path to base settings file
  datapacks: Datapack[]; // active datapack names
  date: string; // active datapack names
  type?: string; // type of preset
};
export type Datapack = {
  name: string;
  file: string;
};

export type ChartInfo = {
  settings: ChartSettingsInfo;
  "class datastore.RootColumn:Chart Root": [name: ColumnPrototypeInfo];
};

export type ChartSettingsInfo = {
  topAge: {
    source: string;
    unit: string;
    text: number;
  };
  baseAge: {
    source: string;
    unit: string;
    text: number;
  };
  unitsPerMY: {
    unit: string;
    text: number;
  };
  skipEmptyColumns: {
    unit: string;
    text: boolean;
  };
  variableColors: string;
  noIndentPattern: boolean;
  negativeChk: boolean;
  doPopups: boolean;
  enEventColBG: boolean;
  enChartLegend: boolean;
  enPriority: boolean;
  enHideBlockLable: boolean;
};

export type ColumnPrototypeInfo = {
  _id: string;
  title: string;
  useNamedColor: boolean;
  placeHolder: boolean;
  drawTitle: boolean;
  drawAgeLabel: boolean;
  drawUncertaintyLabel: boolean;
  isSelected: boolean;
  width: number;
  pad: number;
  "age pad": number;
  backgroundColor: {
    useNamed: boolean;
    text: string;
  };
  fonts: FontsInfo;
};

export type FontsInfo = {
  "Column Header": {
    inheritable: boolean;
    fontFace: "Arial" | "Courier" | "Verdana";
    size: number;
    bold: boolean;
    italic: boolean;
    color: string;
  };
  "Age Label": {
    inheritable: boolean;
    fontFace: "Arial" | "Courier" | "Verdana";
    size: number;
    bold: boolean;
    italic: boolean;
    color: string;
  };
  "Uncertainty Label": {
    inheritable: boolean;
    fontFace: "Arial" | "Courier" | "Verdana";
    size: number;
    bold: boolean;
    italic: boolean;
    color: string;
  };
  "Zone Column Label": {
    inheritable: boolean;
    fontFace: "Arial" | "Courier" | "Verdana";
    size: number;
    bold: boolean;
    italic: boolean;
    color: string;
  };
  "Sequence Column Label": {
    inheritable: boolean;
  };
  "Event Column Label": {
    inheritable: boolean;
    fontFace: "Arial" | "Courier" | "Verdana";
    size: number;
    bold: boolean;
    italic: boolean;
    color: string;
  };
  "Popup Body": {
    inheritable: boolean;
  };
  "Ruler Label": {
    inheritable: boolean;
  };
  "Point Column Scale Label": {
    inheritable: boolean;
  };
  "Range Label": {
    inheritable: boolean;
    fontFace: "Arial" | "Courier" | "Verdana";
    size: number;
    bold: boolean;
    italic: boolean;
    color: string;
  };
  "Ruler Tick Mark Label": {
    inheritable: boolean;
  };
  "Legend Title": {
    inheritable: boolean;
  };
  "Legend Column Name": {
    inheritable: boolean;
  };
  "Legend Column Source": {
    inheritable: boolean;
  };
  "Range Box Label": {
    inheritable: boolean;
  };
};

export const defaultFontsInfo: FontsInfo = {
  "Age Label": {
    bold: false,
    color: "#000000",
    fontFace: "Arial",
    inheritable: false,
    italic: false,
    size: 6
  },
  "Column Header": { bold: false, color: "#000000", fontFace: "Arial", inheritable: false, italic: false, size: 14 },
  "Event Column Label": {
    bold: false,
    color: "#000000",
    fontFace: "Arial",
    inheritable: false,
    italic: false,
    size: 11
  },
  "Legend Column Name": { inheritable: false },
  "Legend Column Source": { inheritable: false },
  "Legend Title": { inheritable: false },
  "Point Column Scale Label": { inheritable: false },
  "Popup Body": { inheritable: false },
  "Range Box Label": { inheritable: false },
  "Range Label": { bold: false, color: "#000000", fontFace: "Arial", inheritable: false, italic: false, size: 12 },
  "Ruler Label": { inheritable: false },
  "Ruler Tick Mark Label": { inheritable: false },
  "Sequence Column Label": { inheritable: false },
  "Uncertainty Label": { bold: false, color: "#000000", fontFace: "Arial", inheritable: false, italic: false, size: 5 },
  "Zone Column Label": { bold: false, color: "#000000", fontFace: "Arial", inheritable: false, italic: false, size: 12 }
};

export type SubBlockInfo = {
  label: string;
  age: number;
  popup: string;
  lineStyle: "solid" | "dashed" | "dotted";
  rgb: RGB;
};

export type ChartRequest = {
  settings: string; // JSON string representing the settings file you want to use to make a chart
  datapacks: string[]; // active datapacks to be used on chart
};

export type ServerResponseError = {
  error: string; // any time an error is thrown on the server side
};

export type ColumnInfo = {
  name: string;
  editName: string;
  fontsInfo: FontsInfo;
  on: boolean;
  popup: string;
  children: ColumnInfo[];
  parent: string | null;
  subBlockInfo?: SubBlockInfo[];
  subFaciesInfo?: SubFaciesInfo[];
  subEventInfo?: SubEventInfo[];
  subRangeInfo?: SubRangeInfo[];
  subChronInfo?: SubChronInfo[];
  subPointInfo?: SubPointInfo[];
  subFreehandInfo?: SubFreehandInfo[];
  subSequenceInfo?: SubSequenceInfo[];
  minAge: number;
  maxAge: number;
  enableTitle: boolean;
  rgb: RGB;
  width: number;
};

export type Range = ColumnHeaderProps & {
  subRangeInfo: SubRangeInfo[];
};

export type Chron = ColumnHeaderProps & {
  subChronInfo: SubChronInfo[];
};

export type Freehand = ColumnHeaderProps & {
  subFreehandInfo: SubFreehandInfo[];
};

export type Point = ColumnHeaderProps & {
  subPointInfo: SubPointInfo[];
};
export type Sequence = ColumnHeaderProps & {
  subSequenceInfo: SubSequenceInfo[];
};

/**
 * NOTE: This implementation gets rid of a lot of the freehand info
 * This is due to the structure being more complicated on various lines.
 * For the current TSCOnline as of 1.0 we don't need that information.
 * If we ever want to add that implementation, we would change this
 * but that would be a considerable amount of time and is something for the future.
 * (This is because we are using a stream reading line by line in parse-datapacks)
 */
export type SubFreehandInfo = {
  topAge: number;
  baseAge: number;
};

export type SubSequenceInfo = {
  label?: string;
  direction: "SB" | "MFS";
  age: number;
  severity: "Major" | "Minor" | "Medium";
  popup: string;
};

export type SubChronInfo = {
  polarity: "TOP" | "N" | "R" | "U" | "No Data";
  label?: string;
  age: number;
  popup: string;
};

export type SubPointInfo = {
  age: number;
  xVal: number;
  popup: string;
};

export type SubRangeInfo = {
  label: string;
  age: number;
  abundance: "TOP" | "missing" | "rare" | "common" | "frequent" | "abundant" | "sample" | "flood";
  popup: string;
};

export type SubEventInfo = {
  label: string;
  age: number;
  lineStyle: "solid" | "dashed" | "dotted";
  popup: string;
};

export type SubFaciesInfo = {
  rockType: string; // rock type that is the name of the png in /public/patterns/
  label?: string; // the label
  age: number; // the base age of the facies time block
  info: string;
};

export type Facies = ColumnHeaderProps & {
  subFaciesInfo: SubFaciesInfo[];
};

export type Event = ColumnHeaderProps & {
  subEventInfo: SubEventInfo[];
};

export type Block = ColumnHeaderProps & {
  subBlockInfo: SubBlockInfo[];
};
export type Transect = ColumnHeaderProps & {
  subTransectInfo: SubTransectInfo[];
};

/**
 * The structure of transects in the datapack are complicated so I will
 * not be doing the deconstructing of the data since there is no added benefit
 * However, if we for some reason want to access it or parse it
 * I will leave this open to add more properties
 */
export type SubTransectInfo = {
  age: number;
};

export type ChartResponseInfo = {
  chartpath: string; // path to the chart
  hash: string; // hash for where it is stored
};

export type GeologicalStages = {
  [key: string]: number;
};

export type Transects = {
  [name: string]: {
    startMapPoint: string;
    endMapPoint: string;
    on: boolean;
    note?: string;
  };
};
export type MapPoints = {
  [name: string]: {
    lat: number;
    lon: number;
    default?: string;
    minage?: number;
    maxage?: number;
    note?: string;
  };
};

export type InfoPoints = {
  [name: string]: {
    lat: number;
    lon: number;
    note?: string;
  };
};

export type MapInfo = {
  [name: string]: {
    name: string;
    img: string; // the image corresponding to the map image
    note?: string; // any notes on the map
    parent?: ParentMap; // the parent map this map exists in
    coordtype: string; // the coord type of the map
    bounds: Bounds; // the bounds associated with the coordtype
    mapPoints: MapPoints; // the map points associated with the map
    infoPoints?: InfoPoints; // informational points
    transects?: Transects; // transects that connect map points
  };
};

export type ParentMap = {
  name: string; // the name of the parent map
  coordtype: string; // the coord type of the parent map
  bounds: Bounds; // the bounds associated with the bounds
};
export type MapHierarchy = {
  [parent: string]: string[]; // keep track of the children maps of the parent
};

export type Bounds = RectBounds | VertBounds;

export type RectBounds = {
  upperLeftLon: number;
  upperLeftLat: number;
  lowerRightLon: number;
  lowerRightLat: number;
};

export type VertBounds = {
  centerLat: number;
  centerLon: number;
  height: number;
  scale: number;
};

export type TimescaleItem = {
  key: string;
  value: number;
};

export function assertFreehand(o: any): asserts o is Freehand {
  if (!o || typeof o !== "object") throw new Error("Freehand must be a non-null object");
  if (!Array.isArray(o.subFreehandInfo)) throwError("Freehand", "subFreehandInfo", "array", o.subFreehandInfo);
  for (const subFreehand of o.subFreehandInfo) {
    assertSubFreehandInfo(subFreehand);
  }
}
export function assertTransect(o: any): asserts o is Transect {
  if (!o || typeof o !== "object") throw new Error("Transect must be a non-null object");
  if (!Array.isArray(o.subTransectInfo)) throwError("Transect", "subTransectInfo", "array", o.subTransectInfo);
  for (const subTransect of o.subTransectInfo) {
    assertSubTransectInfo(subTransect);
  }
}

export function assertSubFreehandInfo(o: any): asserts o is SubFreehandInfo {
  if (!o || typeof o !== "object") throw new Error("SubFreehandInfo must be a non-null object");
  if (typeof o.topAge !== "number") throwError("SubFreehandInfo", "topAge", "number", o.topAge);
  if (typeof o.baseAge !== "number") throwError("SubFreehandInfo", "baseAge", "number", o.baseAge);
}

export function assertSubTransectInfo(o: any): asserts o is SubTransectInfo {
  if (!o || typeof o !== "object") throw new Error("SubTransectInfo must be a non-null object");
  if (typeof o.age !== "number") throwError("SubTransectInfo", "age", "number", o.age);
}

export function assertPoint(o: any): asserts o is Point {
  if (!o || typeof o !== "object") throw new Error("Point must be a non-null object");
  if (!Array.isArray(o.subPointInfo)) throwError("Point", "subPointInfo", "array", o.subPointInfo);
  for (const subPoint of o.subPointInfo) {
    assertSubPointInfo(subPoint);
  }
  assertColumnHeaderProps(o);
}
export function assertSubPointInfo(o: any): asserts o is SubPointInfo {
  if (!o || typeof o !== "object") throw new Error("SubPointInfo must be a non-null object");
  if (typeof o.age !== "number") throwError("SubPointInfo", "age", "number", o.age);
  if (typeof o.xVal !== "number") throwError("SubPointInfo", "xVal", "number", o.xVal);
  if (typeof o.popup !== "string") throwError("SubPointInfo", "popup", "string", o.popup);
}
export function assertSequence(o: any): asserts o is Sequence {
  if (!o || typeof o !== "object") throw new Error("Sequence must be a non-null object");
  if (!Array.isArray(o.subSequenceInfo)) throwError("Sequence", "subSequenceInfo", "array", o.subSequenceInfo);
  for (const subSequence of o.subSequenceInfo) {
    assertSubSequenceInfo(subSequence);
  }
  assertColumnHeaderProps(o);
}

export function assertSubSequenceInfo(o: any): asserts o is SubSequenceInfo {
  if (!o || typeof o !== "object") throw new Error("SubSequenceInfo must be a non-null object");
  if (o.label && typeof o.label !== "string") throwError("SubSequenceInfo", "label", "string", o.label);
  if (typeof o.direction !== "string" || !/^(SB|MFS)$/.test(o.direction))
    throwError("SubSequenceInfo", "direction", "string and SB | MFS", o.direction);
  if (typeof o.age !== "number") throwError("SubSequenceInfo", "age", "number", o.age);
  if (typeof o.severity !== "string" || !/^(Major|Minor|Medium)$/.test(o.severity))
    throwError("SubSequenceInfo", "severity", "string and Major | Minor | Medium", o.severity);
  if (typeof o.popup !== "string") throwError("SubSequenceInfo", "popup", "string", o.popup);
}

export function assertChron(o: any): asserts o is Chron {
  if (!o || typeof o !== "object") throw new Error("Chron must be a non-null object");
  if (!Array.isArray(o.subChronInfo)) throwError("Chron", "subChronInfo", "array", o.subChronInfo);
  for (const subChron of o.subChronInfo) {
    assertSubChronInfo(subChron);
  }
}
export function assertSubChronInfo(o: any): asserts o is SubChronInfo {
  if (!o || typeof o !== "object") throw new Error("SubChronInfo must be a non-null object");
  if (typeof o.polarity !== "string" || !/^(TOP|N|R|U|No Data)$/.test(o.polarity))
    throwError("SubChronInfo", "polarity", "string and TOP | N | R| U | No Data", o.polarity);
  if (o.label && typeof o.label !== "string") throwError("SubChronInfo", "label", "string", o.label);
  if (typeof o.age !== "number") throwError("SubChronInfo", "age", "number", o.age);
  if (typeof o.popup !== "string") throwError("SubChronInfo", "popup", "string", o.popup);
}
export function assertSubRangeInfo(o: any): asserts o is SubRangeInfo {
  if (!o || typeof o !== "object") throw new Error("SubRangeInfo must be a non-null object");
  if (typeof o.label !== "string") throwError("SubRangeInfo", "label", "string", o.label);
  if (typeof o.age !== "number") throwError("SubRangeInfo", "age", "number", o.age);
  if (typeof o.abundance !== "string") throwError("SubRangeInfo", "abundance", "string", o.abundance);
  if (!/^(TOP|missing|rare|common|frequent|abundant|sample|flood)$/.test(o.abundance))
    throwError(
      "SubRangeInfo",
      "abundance",
      "TOP | missing | rare | common | frequent | abundant | sample | flood",
      o.abundance
    );
  if (typeof o.popup !== "string") throwError("SubRangeInfo", "popup", "string", o.popup);
}
export function assertRange(o: any): asserts o is Range {
  if (!o || typeof o !== "object") throw new Error("Range must be a non-null object");
  if (!Array.isArray(o.subRangeInfo)) throwError("Range", "subRangeInfo", "array", o.subRangeInfo);
  for (const subRange of o.subRangeInfo) {
    assertSubRangeInfo(subRange);
  }
  assertColumnHeaderProps(o);
}
export function assertColumnHeaderProps(o: any): asserts o is ColumnHeaderProps {
  if (!o || typeof o !== "object") throw new Error("ColumnHeaderProps must be an object");
  if (typeof o.name !== "string") throwError("ColumnHeaderProps", "name", "string", o.name);
  if (typeof o.minAge !== "number") throwError("ColumnHeaderProps", "minAge", "number", o.minAge);
  if (typeof o.maxAge !== "number") throwError("ColumnHeaderProps", "maxAge", "number", o.maxAge);
  if (typeof o.enableTitle !== "boolean") throwError("ColumnHeaderProps", "enableTitle", "boolean", o.enableTitle);
  if (typeof o.on !== "boolean") throwError("ColumnHeaderProps", "on", "boolean", o.on);
  if (typeof o.width !== "number") throwError("ColumnHeaderProps", "width", "number", o.width);
  if (typeof o.popup !== "string") throwError("ColumnHeaderProps", "popup", "string", o.popup);
  assertRGB(o.rgb);
}
export function assertRGB(o: any): asserts o is RGB {
  if (!o || typeof o !== "object") throw new Error("RGB must be a non-null object");
  if (typeof o.r !== "number") throwError("RGB", "r", "number", o.r);
  if (o.r < 0 || o.r > 255) throwError("RGB", "r", "number between 0 and 255", o.r);
  if (typeof o.g !== "number") throwError("RGB", "g", "number", o.rgb.g);
  if (o.g < 0 || o.g > 255) throwError("RGB", "g", "number between 0 and 255", o.g);
  if (typeof o.b !== "number") throwError("RGB", "b", "number", o.b);
  if (o.b < 0 || o.b > 255) throwError("RGB", "b", "number between 0 and 255", o.b);
}

export function assertEvent(o: any): asserts o is Event {
  if (!o || typeof o !== "object") throw new Error("Event must be a non-null object");
  if (!Array.isArray(o.subEventInfo)) throwError("Event", "subEventInfo", "array", o.subEventInfo);
  for (const subEvent of o.subEventInfo) {
    assertSubEventInfo(subEvent);
  }
  assertColumnHeaderProps(o);
}
export function assertSubEventInfo(o: any): asserts o is SubEventInfo {
  if (!o || typeof o !== "object") throw new Error("SubEventInfo must be a non-null object");
  if (typeof o.label !== "string") throwError("SubEventInfo", "label", "string", o.label);
  if (typeof o.age !== "number") throwError("SubEventInfo", "age", "number", o.age);
  if (typeof o.popup !== "string") throwError("SubEventInfo", "popup", "string", o.popup);
  if (typeof o.lineStyle !== "string" || !/(^dotted|dashed|solid)$/.test(o.lineStyle))
    throwError("SubEventInfo", "lineStyle", "dotted | dashed | solid", o.lineStyle);
}

export function assertColor(o: any): asserts o is Color {
  if (!o || typeof o !== "object") throw new Error("Color must be a non-null object");
  if (typeof o.name !== "string") throwError("Color", "name", "string", o.color);
  if (typeof o.hex !== "string") throwError("Color", "hex", "string", o.hex);
  assertRGB(o.rgb);
}
export function assertPatterns(o: any): asserts o is Patterns {
  if (!o || typeof o !== "object") throw new Error("Patterns must be a non-null object");
  for (const key in o) {
    const pattern = o[key];
    if (typeof pattern.name !== "string") throwError("Patterns", "name", "string", pattern.name);
    if (typeof pattern.formattedName !== "string")
      throwError("Patterns", "formattedName", "string", pattern.formattedName);
    if (typeof pattern.filePath !== "string") throwError("Patterns", "filePath", "string", pattern.filePath);
    assertColor(pattern.color);
  }
}
export function assertMapPackIndex(o: any): asserts o is MapPackIndex {
  if (!o || typeof o !== "object") throw new Error("MapPackIndex must be a non-null object");
  for (const key in o) {
    assertMapPack(o[key]);
  }
}
export function assertMapPack(o: any): asserts o is MapPack {
  if (!o || typeof o !== "object") throw new Error("MapPack must be a non-null object");
  assertMapInfo(o.mapInfo);
  assertMapHierarchy(o.mapHierarchy);
}
export function assertPresets(o: any): asserts o is Presets {
  if (!o || typeof o !== "object") throw new Error("Presets must be a non-null object");
  for (const type in o) {
    for (const config of o[type]) {
      assertChartConfig(config);
    }
  }
}
export function assertTransects(o: any): asserts o is Transects {
  if (!o || typeof o !== "object") throw new Error("Transects must be a non-null object");
  for (const key in o) {
    const transect = o[key];
    if (typeof transect.startMapPoint !== "string")
      throw new Error(`Transects key ${key} value of startMapPoint must be a string`);
    if (typeof transect.endMapPoint !== "string")
      throw new Error(`Transects key ${key} value of endMapPoint must be a string`);
    if (typeof transect.on !== "boolean") throw new Error(`Transects key ${key} value of on must be a boolean`);
    if ("note" in transect && typeof transect.note !== "string")
      throw new Error(`Transects key ${key} value of note must be a string`);
  }
}
export function assertDatapack(o: any): asserts o is Datapack {
  if (typeof o !== "object") throw new Error("Datapack must be an object");
  if (typeof o.name !== "string") throw new Error("Datapack must have a field name of type string");
  if (typeof o.file !== "string") throw new Error("Datapack must have a field file of type string");
}

export function assertDatapackAgeInfo(o: any): asserts o is DatapackAgeInfo {
  if (typeof o !== "object") throw new Error("DatapackAgeInfo must be an object");
  if (typeof o.datapackContainsSuggAge !== "boolean")
    throwError("DatapackAgeInfo", "datapackContainsSuggAge", "boolean", o.datapackContainsSuggAge);
  if (o.datapackContainsSuggAge) {
    if (typeof o.bottomAge !== "number") throwError("DatapackAgeInfo", "bottomAge", "number", o.bottomAge);
    if (typeof o.topAge !== "number") throwError("DatapackAgeInfo", "topAge", "number", o.topAge);
  }
}

export function assertSubBlockInfo(o: any): asserts o is SubBlockInfo {
  if (!o || typeof o !== "object") throw new Error("SubBlockInfo must be a non-null object");
  if (typeof o.label !== "string") throwError("SubBlockInfo", "label", "string", o.label);
  if (typeof o.age !== "number") throwError("SubBlockInfo", "age", "number", o.number);
  if (typeof o.popup !== "string") throwError("SubBlockInfo", "popup", "string", o.popup);
  if (o.lineStyle !== "solid" && o.lineStyle !== "dotted" && o.lineStyle !== "dashed")
    throwError("SubBlockInfo", "lineStyle", "solid, dotted or dashed", o.lineStyle);
  assertRGB(o.rgb);
}

export function assertBlock(o: any): asserts o is Block {
  if (!o || typeof o !== "object") throw new Error("Block must be a non-null object");
  for (const subBlockInfo of o.subBlockInfo) {
    assertSubBlockInfo(subBlockInfo);
  }
  assertColumnHeaderProps(o);
}

export function assertFacies(o: any): asserts o is Facies {
  if (!o || typeof o !== "object") throw new Error("Facies must be a non-null object");
  if (!Array.isArray(o.faciesTimeBlockInfo))
    throw new Error("Facies must have a faciesTimeBlockInfo field with type array");
  for (const block of o.faciesTimeBlockInfo) {
    assertSubFaciesInfo(block);
  }
  assertColumnHeaderProps(o);
}
export function assertDatapackParsingPack(o: any): asserts o is DatapackParsingPack {
  if (!o || typeof o !== "object") throw new Error("DatapackParsingPack must be a non-null object");
  if (!Array.isArray(o.columnInfoArray))
    throw new Error(`DatapackParsingPack must have a columnInfoArray array of ColumnInfos`);
  for (const columnInfo of o.columnInfoArray) {
    assertColumnInfo(columnInfo);
  }
  assertDatapackAgeInfo(o.datapackAgeInfo);
}
export function assertDatapackIndex(o: any): asserts o is DatapackIndex {
  if (!o || typeof o !== "object") throw new Error("DatapackIndex must be a non-null object");
  for (const key in o) {
    const pack = o[key];
    assertDatapackParsingPack(pack);
  }
}

export function assertSubFaciesInfo(o: any): asserts o is SubFaciesInfo {
  if (!o || typeof o !== "object") throw new Error("SubFaciesInfo must be a non-null object");
  if (typeof o.rockType !== "string") throwError("SubFaciesInfo", "rockType", "string", o.rockType);
  if (typeof o.info !== "string") throwError("SubFaciesInfo", "info", "string", o.info);
  if ("label" in o && typeof o.label !== "string") throwError("SubFaciesInfo", "label", "string", o.label);
  if (typeof o.age !== "number") throwError("SubFaciesInfo", "age", "number", o.age);
}
export function assertIndexResponse(o: any): asserts o is IndexResponse {
  if (!o || typeof o !== "object") throw new Error("IndexResponse must be a non-null object");
  assertDatapackIndex(o.datapackIndex);
  assertMapPackIndex(o.mapPackIndex);
}

export function assertChartConfig(o: any): asserts o is ChartConfig {
  if (typeof o !== "object") throw new Error("ChartConfig must be an object");
  if (typeof o.icon !== "string") throwError("ChartConfig", "icon", "string", o.icon);
  if (typeof o.background !== "string") throwError("ChartConfig", "background", "string", o.background);
  if (typeof o.title !== "string") throwError("ChartConfig", "title", "string", o.title);
  if (typeof o.description !== "string") throwError("ChartConfig", "description", "string", o.description);
  if (typeof o.settings !== "string") throwError("ChartConfig", "settings", "string", o.settings);
  if (typeof o.date !== "string") throwError("ChartConfig", "date", "string", o.date);
  if ("type" in o && typeof o.type !== "string") throwError("ChartConfig", "type", "string", o.type);
  if (!Array.isArray(o.datapacks))
    throw new Error("ChartConfig must have a datapacks array of datapack string names.  ");
}

export function assertChartConfigArray(o: any): asserts o is ChartConfig[] {
  if (!o || !Array.isArray(o)) throwError("ChartConfigArray", "ChartConfigArray", "array", o);
  for (const c of o) assertChartConfig(c);
}

export function assertChartRequest(o: any): asserts o is ChartRequest {
  if (typeof o !== "object") throw new Error("ChartRequest must be an object");
  if (typeof o.settings !== "string") throwError("ChartRequest", "settings", "string", o.settings);
  if (!Array.isArray(o.datapacks)) throwError("ChartRequest", "datapacks", "array", o.datapacks);
}

export function isServerResponseError(o: any): o is ServerResponseError {
  if (!o || typeof o !== "object") return false;
  if (typeof o.error !== "string") return false;
  return true;
}

export function assertChartInfo(o: any): asserts o is ChartResponseInfo {
  if (!o || typeof o !== "object") throw new Error("ChartInfo must be an object");
  if (typeof o.chartpath !== "string") throwError("ChartInfo", "chartpath", "string", o.chartpath);
  if (typeof o.hash !== "string") throwError("ChartInfo", "hash", "string", o.hash);
}

export function assertColumnInfo(o: any): asserts o is ColumnInfo {
  if (typeof o !== "object" || o === null) {
    throw new Error("ColumnInfo must be a non-null object");
  }
  if (typeof o.name !== "string") throwError("ColumnInfo", "name", "string", o.name);
  if (typeof o.editName !== "string") throwError("ColumnInfo", "editName", "string", o.editName);
  if (typeof o.on !== "boolean") throwError("ColumnInfo", "on", "boolean", o.on);
  if (typeof o.popup !== "string") throwError("ColumnInfo", "popup", "string", o.popup);
  if (o.parent !== null && typeof o.parent !== "string") throwError("ColumnInfo", "parent", "string", o.parent);
  if (typeof o.minAge !== "number") throwError("ColumnInfo", "minAge", "number", o.minAge);
  if (typeof o.maxAge !== "number") throwError("ColumnInfo", "maxAge", "number", o.maxAge);
  if (typeof o.width !== "number") throwError("ColumnInfo", "width", "number", o.width);
  if (typeof o.enableTitle !== "boolean") throwError("ColumnInfo", "enableTitle", "boolean", o.enableTitle);
  assertRGB(o.rgb);
  for (const child of o.children) {
    assertColumnInfo(child);
  }
  if ("subBlockInfo" in o) {
    if (!o.subBlockInfo || !Array.isArray(o.subBlockInfo))
      throwError("ColumnInfo", "subBlockInfo", "array", o.subBlockInfo);
    for (const block of o.subBlockInfo) {
      assertSubBlockInfo(block);
    }
  }
  if ("subFaciesInfo" in o) {
    if (!o.subFaciesInfo || !Array.isArray(o.subFaciesInfo))
      throwError("ColumnInfo", "subFaciesInfo", "array", o.subFaciesInfo);
    for (const facies of o.subFaciesInfo) {
      assertSubFaciesInfo(facies);
    }
  }
  if ("subEventInfo" in o) {
    if (!o.subEventInfo || !Array.isArray(o.subEventInfo))
      throwError("ColumnInfo", "subEventInfo", "array", o.subEventInfo);
    for (const event of o.subEventInfo) {
      assertSubEventInfo(event);
    }
  }
  if ("subRangeInfo" in o) {
    if (!o.subRangeInfo || !Array.isArray(o.subRangeInfo))
      throwError("ColumnInfo", "subRangeInfo", "array", o.subRangeInfo);
    for (const range of o.subRangeInfo) {
      assertSubRangeInfo(range);
    }
  }
  if ("subChronInfo" in o) {
    if (!o.subChronInfo || !Array.isArray(o.subChronInfo))
      throwError("ColumnInfo", "subChronInfo", "array", o.subChronInfo);
    for (const chron of o.subChronInfo) {
      assertSubChronInfo(chron);
    }
  }
  if ("subPointInfo" in o) {
    if (!o.subPointInfo || !Array.isArray(o.subPointInfo))
      throwError("ColumnInfo", "subPointInfo", "array", o.subPointInfo);
    for (const point of o.subPointInfo) {
      assertSubPointInfo(point);
    }
  }
  if ("subFreehandInfo" in o) {
    if (!o.subFreehandInfo || !Array.isArray(o.subFreehandInfo))
      throwError("ColumnInfo", "subFreehandInfo", "array", o.subFreehandInfo);
    for (const freehand of o.subFreehandInfo) {
      assertSubFreehandInfo(freehand);
    }
  }
  if ("subSequenceInfo" in o) {
    if (!o.subSequenceInfo || !Array.isArray(o.subSequenceInfo))
      throwError("ColumnInfo", "subSequenceInfo", "array", o.subSequenceInfo);
    for (const sequence of o.subSequenceInfo) {
      assertSubSequenceInfo(sequence);
    }
  }
}

export function assertFontsInfo(o: any): asserts o is FontsInfo {
  if (typeof o !== "object") throw new Error("FontsInfo must be an object");
  for (const key in o) {
    const val = o.key;
    if (typeof val.bold !== "boolean") throwError("FontsInfo", `${key}.bold`, "boolean", o.bold);
    if (typeof val.color !== "string") throwError("FontsInfo", `${key}.color`, "string", o.color);
    if (typeof val.fontFace !== "string") throwError("FontsInfo", `${key}.fontFace`, "string", o.fontFace);
    if (typeof val.inheritable !== "boolean") throwError("FontsInfo", `${key}.inheritable`, "boolean", o.inheritable);
    if (typeof val.italic !== "boolean") throwError("FontsInfo", "italic", `${key}.boolean`, o.italic);
    if (typeof val.size !== "number") throwError("FontsInfo", "size", `${key}.number`, o.size);
  }
}

export function assertMapHierarchy(o: any): asserts o is MapHierarchy {
  if (typeof o !== "object" || o === null) throw new Error("MapsHierarchy must be a non-null object");
  for (const key in o) {
    const map = o[key];
    if (!Array.isArray(map)) throwError("MapHierarchy", `value for key ${key}`, "string array", map);
  }
}

export function assertMapInfo(o: any): asserts o is MapInfo {
  if (typeof o !== "object" || o === null) {
    throw new Error("MapInfo must be a non-null object");
  }

  for (const key in o) {
    const map = o[key];

    if (typeof map !== "object" || map === null) {
      throw new Error(`MapInfo' value for key '${key}' must be a non-null object`);
    }
    if (typeof map.name !== "string") throwError("MapInfo", "name", "string", map.name);
    if (typeof map.img !== "string") {
      throw new Error(`MapInfo' value for key '${key}' must have an 'img' string property`);
    }
    if ("note" in map && typeof map.note !== "string") {
      throw new Error(`MapInfo' value for key '${key}' must have a 'note' string property`);
    }
    if (typeof map.coordtype !== "string") {
      throw new Error(`MapInfo' value for key '${key}' must have a 'coordtype' string property`);
    }
    if ("infoPoints" in map) {
      assertInfoPoints(map.infoPoints);
    }
    if ("transects" in map) {
      assertTransects(map.transects);
    }
    assertBounds(map.coordtype, map.bounds);
    assertMapPoints(map.mapPoints);
  }
}

export function assertParentMap(parent: any): asserts parent is ParentMap {
  if (typeof parent! !== "object" || parent == null) {
    throw new Error(`Parent must be a non-nul object`);
  }
  if (typeof parent.name !== "string") {
    throw new Error(`Parent must have a name string property`);
  }
  if (typeof parent.coordtype !== "string") {
    throw new Error(`Parent must have a coordtype string property`);
  }
  assertBounds(parent.coordtype, parent.bounds);
}

export function isRectBounds(bounds: Bounds): bounds is RectBounds {
  return "upperLeftLon" in bounds && "upperLeftLat" in bounds && "lowerRightLat" in bounds && "lowerRightLon" in bounds;
}

export function isVertBounds(bounds: Bounds): bounds is VertBounds {
  return "centerLat" in bounds && "centerLon" in bounds && "height" in bounds && "scale" in bounds;
}

export function assertBounds(coordtype: string, bounds: any): asserts bounds is Bounds {
  switch (coordtype) {
    case "RECTANGULAR":
      assertRectBounds(bounds);
      break;
    case "VERTICAL PERSPECTIVE":
      assertVertBounds(bounds);
      break;
    default:
      throw new Error(`Unrecognized coordtype: ${coordtype}`);
  }
}

export function assertVertBounds(vertBounds: any): asserts vertBounds is VertBounds {
  if (typeof vertBounds !== "object" || vertBounds === null) {
    throw new Error("VertBounds must be a non-null object");
  }
  if (typeof vertBounds.centerLat !== "number") {
    throw new Error("VertBounds must have a centerLat number property");
  }
  if (typeof vertBounds.centerLon !== "number") {
    throw new Error("VertBounds must have an centerLon number property");
  }
  if (typeof vertBounds.height !== "number") {
    throw new Error("VertBounds must have a height number property");
  }
  if (typeof vertBounds.scale !== "number") {
    throw new Error("VertBounds must have a scale number property");
  }
}

export function assertRectBounds(rectBounds: any): asserts rectBounds is RectBounds {
  if (typeof rectBounds !== "object" || rectBounds === null) {
    throw new Error("RectBounds must be a non-null object");
  }
  if (typeof rectBounds.upperLeftLon !== "number") {
    throw new Error("RectBounds must have an upperLeftLon number property");
  }
  if (typeof rectBounds.upperLeftLat !== "number") {
    throw new Error("RectBounds must have an upperLeftLat number property");
  }
  if (typeof rectBounds.lowerRightLon !== "number") {
    throw new Error("RectBounds must have a lowerRightLon number property");
  }
  if (typeof rectBounds.lowerRightLat !== "number") {
    throw new Error("RectBounds must have a lowerRightLat number property");
  }
}
export function assertInfoPoints(o: any): asserts o is InfoPoints {
  if (typeof o !== "object" || o === null) {
    throw new Error("InfoPoints must be a non-null object");
  }

  for (const key in o) {
    const point = o[key];
    if (typeof point !== "object" || point === null) {
      throw new Error(`InfoPoints' value for key '${key}' must be a non-null object`);
    }
    if (typeof point.lat !== "number") {
      throw new Error(`InfoPoints' value for key '${key}' must have a 'lat' number property`);
    }
    if (typeof point.lon !== "number") {
      throw new Error(`InfoPoints' value for key '${key}' must have a 'lon' number property`);
    }
    if (point.note !== undefined && typeof point.note !== "string") {
      throw new Error(`InfoPoints' value for key '${key}' must have a 'note' string property`);
    }
  }
}

export function assertMapPoints(o: any): asserts o is MapPoints {
  if (typeof o !== "object" || o === null) {
    throw new Error("MapPoints must be a non-null object");
  }

  for (const key in o) {
    const point = o[key];
    if (typeof point !== "object" || point === null) {
      throw new Error(`MapPoints' value for key '${key}' must be a non-null object`);
    }
    if (typeof point.lat !== "number") {
      throw new Error(`MapPoints' value for key '${key}' must have a 'lat' number property`);
    }
    if (typeof point.lon !== "number") {
      throw new Error(`MapPoints' value for key '${key}' must have a 'lon' number property`);
    }
    if (point.default !== undefined && typeof point.default !== "string") {
      throw new Error(`MapPoints' value for key '${key}' must have a 'default' string property`);
    }
    if (point.minage !== undefined && typeof point.minage !== "number") {
      throw new Error(`MapPoints' value for key '${key}' must have a 'minage' number property`);
    }
    if (point.maxage !== undefined && typeof point.maxage !== "number") {
      throw new Error(`MapPoints' value for key '${key}' must have a 'maxage' number property`);
    }
    if (point.note !== undefined && typeof point.note !== "string") {
      throw new Error(`MapPoints' value for key '${key}' must have a 'note' string property`);
    }
  }
}
export function assertSuccessfulServerResponse(o: any): asserts o is SuccessfulServerResponse {
  if (!o || typeof o !== "object") throw new Error(`SuccessfulServerResponse must be a non-null object`);
  if (typeof o.message !== "string") throw new Error(`SuccessfulServerResponse must have a 'message' string property`);
}

export function assertSVGStatus(o: any): asserts o is SVGStatus {
  if (!o || typeof o !== "object") throw new Error(`SVGStatus must be a non-null object`);
  if (typeof o.ready !== "boolean") throw new Error(`SVGStatus must have a 'ready' boolean property`);
}
/**
 * throws an error `Object '${obj}' must have a '${variable}' ${type} property.\nFound value: ${value}`
 * @param obj
 * @param variable
 * @param type
 * @param value
 */
function throwError(obj: string, variable: string, type: string, value: any) {
  throw new Error(`Object '${obj}' must have a '${variable}' ${type} property.\nFound value: ${value}\n`);
}

export function assertTimescale(val: any): asserts val is TimescaleItem {
  if (!val || typeof val !== "object") {
    throwError("Timescale", "object", "of type object", val);
  }
  if (typeof val.key !== "string" || typeof val.value !== "number") {
    throwError("Timescale", "'key' of type string and 'value' of type number", "", val);
  }
}
