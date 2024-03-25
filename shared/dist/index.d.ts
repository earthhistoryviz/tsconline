export * from "./settings-types.js";
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
    datapackContainsSuggAge: boolean;
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
    icon: string;
    background: string;
    title: string;
    description: string;
    settings: string;
    datapacks: Datapack[];
    date: string;
    type?: string;
};
export type Datapack = {
    name: string;
    file: string;
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
export declare const defaultFontsInfo: FontsInfo;
export type SubBlockInfo = {
    label: string;
    age: number;
    popup: string;
    lineStyle: "solid" | "dashed" | "dotted";
    rgb: RGB;
};
export type ChartRequest = {
    settings: string;
    datapacks: string[];
};
export type ServerResponseError = {
    error: string;
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
    rockType: string;
    label?: string;
    age: number;
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
    chartpath: string;
    hash: string;
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
        img: string;
        note?: string;
        parent?: ParentMap;
        coordtype: string;
        bounds: Bounds;
        mapPoints: MapPoints;
        infoPoints?: InfoPoints;
        transects?: Transects;
    };
};
export type ParentMap = {
    name: string;
    coordtype: string;
    bounds: Bounds;
};
export type MapHierarchy = {
    [parent: string]: string[];
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
export declare function assertFreehand(o: any): asserts o is Freehand;
export declare function assertTransect(o: any): asserts o is Transect;
export declare function assertSubFreehandInfo(o: any): asserts o is SubFreehandInfo;
export declare function assertSubTransectInfo(o: any): asserts o is SubTransectInfo;
export declare function assertPoint(o: any): asserts o is Point;
export declare function assertSubPointInfo(o: any): asserts o is SubPointInfo;
export declare function assertSequence(o: any): asserts o is Sequence;
export declare function assertSubSequenceInfo(o: any): asserts o is SubSequenceInfo;
export declare function assertChron(o: any): asserts o is Chron;
export declare function assertSubChronInfo(o: any): asserts o is SubChronInfo;
export declare function assertSubRangeInfo(o: any): asserts o is SubRangeInfo;
export declare function assertRange(o: any): asserts o is Range;
export declare function assertColumnHeaderProps(o: any): asserts o is ColumnHeaderProps;
export declare function assertRGB(o: any): asserts o is RGB;
export declare function assertEvent(o: any): asserts o is Event;
export declare function assertSubEventInfo(o: any): asserts o is SubEventInfo;
export declare function assertColor(o: any): asserts o is Color;
export declare function assertPatterns(o: any): asserts o is Patterns;
export declare function assertMapPackIndex(o: any): asserts o is MapPackIndex;
export declare function assertMapPack(o: any): asserts o is MapPack;
export declare function assertPresets(o: any): asserts o is Presets;
export declare function assertTransects(o: any): asserts o is Transects;
export declare function assertDatapack(o: any): asserts o is Datapack;
export declare function assertDatapackAgeInfo(o: any): asserts o is DatapackAgeInfo;
export declare function assertSubBlockInfo(o: any): asserts o is SubBlockInfo;
export declare function assertBlock(o: any): asserts o is Block;
export declare function assertFacies(o: any): asserts o is Facies;
export declare function assertDatapackParsingPack(o: any): asserts o is DatapackParsingPack;
export declare function assertDatapackIndex(o: any): asserts o is DatapackIndex;
export declare function assertSubFaciesInfo(o: any): asserts o is SubFaciesInfo;
export declare function assertIndexResponse(o: any): asserts o is IndexResponse;
export declare function assertChartConfig(o: any): asserts o is ChartConfig;
export declare function assertChartConfigArray(o: any): asserts o is ChartConfig[];
export declare function assertChartRequest(o: any): asserts o is ChartRequest;
export declare function isServerResponseError(o: any): o is ServerResponseError;
export declare function assertChartInfo(o: any): asserts o is ChartResponseInfo;
export declare function assertColumnInfo(o: any): asserts o is ColumnInfo;
export declare function assertFontsInfo(o: any): asserts o is FontsInfo;
export declare function assertMapHierarchy(o: any): asserts o is MapHierarchy;
export declare function assertMapInfo(o: any): asserts o is MapInfo;
export declare function assertParentMap(parent: any): asserts parent is ParentMap;
export declare function isRectBounds(bounds: Bounds): bounds is RectBounds;
export declare function isVertBounds(bounds: Bounds): bounds is VertBounds;
export declare function assertBounds(coordtype: string, bounds: any): asserts bounds is Bounds;
export declare function assertVertBounds(vertBounds: any): asserts vertBounds is VertBounds;
export declare function assertRectBounds(rectBounds: any): asserts rectBounds is RectBounds;
export declare function assertInfoPoints(o: any): asserts o is InfoPoints;
export declare function assertMapPoints(o: any): asserts o is MapPoints;
export declare function assertSuccessfulServerResponse(o: any): asserts o is SuccessfulServerResponse;
export declare function assertSVGStatus(o: any): asserts o is SVGStatus;
/**
 * throws an error `Object '${obj}' must have a '${variable}' ${type} property.\nFound value: ${value}`
 * @param obj
 * @param variable
 * @param type
 * @param value
 */
export declare function throwError(obj: string, variable: string, type: string, value: any): void;
export declare function assertTimescale(val: any): asserts val is TimescaleItem;
