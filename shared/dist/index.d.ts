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
export type FontLabelOptions = {
    inheritable: boolean;
    fontFace: "Arial" | "Courier" | "Verdana";
    size: number;
    bold: boolean;
    italic: boolean;
    color: string;
};
export type FontsInfo = {
    "Column Header": FontLabelOptions;
    "Age Label": FontLabelOptions;
    "Uncertainty Label": FontLabelOptions;
    "Zone Column Label": FontLabelOptions;
    "Sequence Column Label": FontLabelOptions;
    "Event Column Label": FontLabelOptions;
    "Popup Body": FontLabelOptions;
    "Ruler Label": FontLabelOptions;
    "Point Column Scale Label": FontLabelOptions;
    "Range Label": FontLabelOptions;
    "Ruler Tick Mark Label": FontLabelOptions;
    "Legend Title": FontLabelOptions;
    "Legend Column Name": FontLabelOptions;
    "Legend Column Source": FontLabelOptions;
    "Range Box Label": FontLabelOptions;
};
export declare const defaultFontsInfo: FontsInfo;
export type FaciesLocations = {
    [location: string]: {
        faciesTimeBlockArray: FaciesTimeBlock[];
        minAge: number;
        maxAge: number;
    };
};
export type FaciesTimeBlock = {
    rockType: string;
    label?: string;
    age: number;
};
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
export type ValidFontOptions = "Column Header" | "Age Label" | "Uncertainty Label" | "Zone Column Label" | "Sequence Column Label" | "Event Column Label" | "Popup Body" | "Ruler Label" | "Point Column Scale Label" | "Range Label" | "Ruler Tick Mark Label" | "Legend Title" | "Legend Column Name" | "Legend Column Source" | "Range Box Label";
export type ColumnInfo = {
    name: string;
    editName: string;
    fontsInfo: FontsInfo;
    fontOptions?: Set<ValidFontOptions>;
    on: boolean;
    popup: string;
    children: ColumnInfo[];
    parent: string | null;
    subBlockInfo?: SubBlockInfo[];
    subFaciesInfo?: SubFaciesInfo[];
    subEventInfo?: SubEventInfo[];
    subRangeInfo?: SubRangeInfo[];
    minAge: number;
    maxAge: number;
    enableTitle: boolean;
    rgb: RGB;
    width: number;
};
export type Range = ColumnHeaderProps & {
    subRangeInfo: SubRangeInfo[];
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
export declare function assertTimescale(val: any): asserts val is TimescaleItem;
