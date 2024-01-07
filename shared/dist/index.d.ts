export type ChartConfig = {
    img: string;
    title: string;
    description: string;
    settings: string;
    datapacks: string[];
};
export declare function assertChartConfig(o: any): asserts o is ChartConfig;
export declare function assertChartConfigArray(o: any): asserts o is ChartConfig[];
export type ServerResponseError = {
    error: string;
};
export type Preset = ChartConfig | ServerResponseError;
export type ChartRequest = {
    settings: string;
    datapacks: string[];
};
export declare function assertChartRequest(o: any): asserts o is ChartRequest;
export type ChartResponseInfo = {
    chartpath: string;
    hash: string;
};
export declare function isServerResponseError(o: any): o is ServerResponseError;
export type ChartResponse = ChartResponseInfo | ServerResponseError;
export declare function assertChartInfo(o: any): asserts o is ChartResponseInfo;
export type ColumnInfo = {
    [name: string]: {
        on: boolean;
        children: ColumnInfo | null;
        parents: string[];
    };
};
export type ColumnResponse = ColumnInfo | ServerResponseError;
export declare function assertColumnInfo(o: any): asserts o is ColumnInfo;
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
export type MapInfo = {
    [name: string]: {
        img: string;
        note?: string;
        parent?: MapInfo[string];
        coordtype: string;
        bounds: Bounds;
        mapPoints: MapPoints;
    };
};
export type MapResponse = MapInfo | ServerResponseError;
export type Bounds = {
    upperLeftLon: number;
    upperLeftLat: number;
    lowerRightLon: number;
    lowerRightLat: number;
};
export declare function assertMaps(o: any): asserts o is MapInfo;
export declare function assertMapPoints(o: any): asserts o is MapPoints;
