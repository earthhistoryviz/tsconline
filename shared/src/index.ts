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
}
export type Presets = {
  [type: string]: ChartConfig[];
};

export type DatapackAgeInfo = {
  datapackContainsSuggAge: boolean; //Default Age is not age located in datapack. Should be false if age exists, otherwise true.
  topAge?: number;
  bottomAge?: number;
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
  info: string;
  enableTitle: boolean;
  children: ColumnInfo[];
  parent: string | null;
  subBlockInfo?: SubBlockInfo[];
  subFaciesInfo?: SubFaciesInfo[];
  minAge: number;
  maxAge: number;
};
export type SubFaciesInfo = {
  rockType: string; // rock type that is the name of the png in /public/patterns/
  label?: string; // the label
  age: number; // the base age of the facies time block
  info: string;
};

export type Facies = {
  name: string;
  info: string;
  on: boolean;
  subFaciesInfo: SubFaciesInfo[];
  minAge: number; // the min age of this specific location
  maxAge: number; // the max age of this specific location
};

export type Block = {
  title: string;
  subBlockInfo: SubBlockInfo[];
  width: number;
  minAge: number;
  maxAge: number;
  popup: string;
  on: boolean;
  enableTitle: boolean;
  rgb: RGB;
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

export function assertRGB(o: any): asserts o is RGB {
  if (!o || typeof o !== "object")
    throw new Error("RGB must be a non-null object");
  if (typeof o.r !== "number")
    throwError("RGB", "r", "number", o.r);
  if (o.r < 0 || o.r > 255)
    throwError("RGB", "r", "number between 0 and 255", o.r);
  if (typeof o.g !== "number")
    throwError("RGB", "g", "number", o.rgb.g);
  if (o.g < 0 || o.g > 255)
    throwError("RGB", "g", "number between 0 and 255", o.g);
  if (typeof o.b !== "number")
    throwError("RGB", "b", "number", o.b);
  if (o.b < 0 || o.b > 255)
    throwError("RGB", "b", "number between 0 and 255", o.b);
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
  if (!o || typeof o !== "object")
    throw new Error("SubBlockInfo must be a non-null object");
  if (typeof o.label !== "string")
    throwError("SubBlockInfo", "label", "string", o.label);
  if (typeof o.age !== "number")
    throwError("SubBlockInfo", "age", "number", o.number);
  if (typeof o.popup !== "string")
    throwError("SubBlockInfo", "popup", "string", o.popup);
  if (o.lineStyle !== "solid" && o.lineStyle !== "dotted" && o.lineStyle !== "dashed")
    throwError("SubBlockInfo", "lineStyle", "solid, dotted or dashed", o.lineStyle);
  assertRGB(o.rgb);
}

export function assertBlock(o: any): asserts o is Block {
  if (!o || typeof o !== "object")
    throw new Error("Block must be a non-null object");
  if (typeof o.title !== "string")
    throwError("Block", "title", "string", o.title);

  for (const subBlockInfo of o.subBlockInfo) {
    assertSubBlockInfo(subBlockInfo);
  }
  if (typeof o.minAge !== "number")
    throwError("Block", "minAge", "number", o.minAge);
  if (typeof o.maxAge !== "number")
    throwError("Block", "maxAge", "number", o.maxAge);
  if (typeof o.popop !== "string")
    throwError("Block", "popup", "string", o.popop);
  if (typeof o.on !== "boolean")
    throwError("Block", "on", "boolean", o.on);
  if (typeof o.enableTitle !== "boolean")
    throwError("Block", "enableTitle", "boolean", o.enableTitle);
  if (typeof o.width !== "number")
    throwError("Block", "width", "number", o.width)
  assertRGB(o.rgb)
}

export function assertFacies(o: any): asserts o is Facies {
  if (!o || typeof o !== "object") throw new Error("Facies must be a non-null object");
  if (typeof o.name !== "string") throw new Error("Facies must have a name with type string");
  if (typeof o.info !== "string") throw new Error("Facies must have an info field with type string");
  if (typeof o.on !== "boolean") throw new Error("Facies must have an on field with type boolean");
  if (typeof o.minAge !== "number") throw new Error("Facies must have a min age with type number");
  if (typeof o.maxAge !== "number") throw new Error("Facies must have a max age with type number");
  if (!Array.isArray(o.faciesTimeBlockInfo))
    throw new Error("Facies must have a faciesTimeBlockInfo field with type array");
  for (const block of o.faciesTimeBlockInfo) {
    assertSubFaciesInfo(block);
  }
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
  if (typeof o.on !== "boolean") throwError("ColumnInfo", "on", "boolean", o.on);
  if (typeof o.info !== "string") throwError("ColumnInfo", "info", "string", o.info);
  if (o.parent !== null && typeof o.parent !== "string") throwError("ColumnInfo", "parent", "string", o.parent);
  if (typeof o.minAge !== "number") throwError("ColumnInfo", "minAge", "number", o.minAge);
  if (typeof o.maxAge !== "number") throwError("ColumnInfo", "maxAge", "number", o.maxAge);
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
    for (const block of o.subFaciesInfo) {
      assertSubFaciesInfo(block);
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
  throw new Error(`Object '${obj}' must have a '${variable}' ${type} property.\nFound value: ${value}`);
}

export function assertTimescale(val: any): asserts val is TimescaleItem {
  if (!val || typeof val !== "object") {
    throwError("Timescale", "object", "of type object", val);
  }
  if (typeof val.key !== "string" || typeof val.value !== "number") {
    throwError("Timescale", "'key' of type string and 'value' of type number", "", val);
  }
}
