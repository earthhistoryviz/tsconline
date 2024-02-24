export type SuccessfulServerResponse = {
    message: string;
};
export type ServerResponse = SuccessfulServerResponse | ServerResponseError;
export type DatapackParsingPack = {
    columnInfoArray: ColumnInfo[];
    facies: Facies;
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
export type Presets = {
    [type: string]: ChartConfig[];
};
export type DatapackAgeInfo = {
    useDatapackSuggestedAge: boolean;
    topAge?: number;
    bottomAge?: number;
};
export type ChartConfig = {
    icon: string;
    background: string;
    title: string;
    description: string;
    settings: string;
    datapacks: string[];
    date: string;
    type?: string;
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
export type Facies = {
    locations: FaciesLocations;
    minAge: number;
    maxAge: number;
    aliases: {
        [alias: string]: string;
    };
};
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
    info: string;
    children: ColumnInfo[];
    parent: string | null;
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
export type DatapackResponse = {
    columnInfo: ColumnInfo;
    facies: Facies;
    mapInfo: MapInfo;
    mapHierarchy: MapHierarchy;
    datapackAgeInfo: DatapackAgeInfo;
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
}

export declare function assertMapPackIndex(o: any): asserts o is MapPackIndex;
export declare function assertMapPack(o: any): asserts o is MapPack;
export declare function assertPresets(o: any): asserts o is Presets;
export declare function assertTransects(o: any): asserts o is Transects;
export declare function assertDatapackAgeInfo(o: any): asserts o is DatapackAgeInfo;
export declare function assertFacies(o: any): asserts o is Facies;
export declare function assertDatapackParsingPack(o: any): asserts o is DatapackParsingPack;
export declare function assertDatapackIndex(o: any): asserts o is DatapackIndex;
export declare function assertFaciesLocations(o: any): asserts o is FaciesLocations;
export declare function assertFaciesTimeBlock(o: any): asserts o is FaciesTimeBlock;
export declare function assertIndexResponse(o: any): asserts o is IndexResponse;
export declare function assertDatapackResponse(o: any): asserts o is DatapackResponse;
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
