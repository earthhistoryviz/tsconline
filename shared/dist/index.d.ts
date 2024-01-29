export type SuccessfulServerResponse = {
    message: string;
};
export type ServerResponse = SuccessfulServerResponse | ServerResponseError;
export type Preset = ChartConfig | ServerResponseError;
export type ChartConfig = {
    img: string;
    title: string;
    description: string;
    settings: string;
    datapacks: string[];
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
    columnSettings: string;
    datapacks: string[];
};
export type ServerResponseError = {
    error: string;
};
export type ColumnInfo = {
    [name: string]: {
        editName: string;
        on: boolean;
        children: ColumnInfo;
        parents: string[];
    };
};
export type ChartResponseInfo = {
    chartpath: string;
    hash: string;
};
export type GeologicalStages = {
    [key: string]: number;
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
export declare function assertFacies(o: any): asserts o is Facies;
export declare function assertFaciesLocations(o: any): asserts o is FaciesLocations;
export declare function assertFaciesTimeBlock(o: any): asserts o is FaciesTimeBlock;
export declare function assertDatapackResponse(o: any): asserts o is DatapackResponse;
export declare function assertChartConfig(o: any): asserts o is ChartConfig;
export declare function assertChartConfigArray(o: any): asserts o is ChartConfig[];
export declare function assertChartRequest(o: any): asserts o is ChartRequest;
export declare function isServerResponseError(o: any): o is ServerResponseError;
export declare function assertChartInfo(o: any): asserts o is ChartResponseInfo;
export declare function assertColumnInfo(o: any): asserts o is ColumnInfo;
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
