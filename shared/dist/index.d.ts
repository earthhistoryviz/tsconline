export type ChartConfig = {
    img: string;
    title: string;
    description: string;
    settings: string;
    datapacks: string[];
};
export type ColumnSetting = {
    [name: string]: {
        on: boolean;
        children: ColumnSetting | null;
        parents: string[];
    };
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
export type Maps = {
    [name: string]: {
        img: string;
        note?: string;
        parent?: Maps[string];
        coordtype: string;
        bounds: Bounds;
        mapPoints: MapPoints;
    };
};
export type Bounds = {
    upperLeftLon: number;
    upperLeftLat: number;
    lowerLeftLon: number;
    lowerLeftLat: number;
};
export declare function assertMaps(o: any): asserts o is Maps;
export declare function assertMapPoints(o: any): asserts o is MapPoints;
export declare function assertChartConfig(o: any): asserts o is ChartConfig;
export declare function assertChartConfigArray(o: any): asserts o is ChartConfig[];
export type ChartConfigError = {
    error: string;
};
export type Preset = ChartConfig | ChartConfigError;
export type ChartRequest = {
    settings: string;
    datapacks: string[];
};
export declare function assertChartRequest(o: any): asserts o is ChartRequest;
export type ChartResponseInfo = {
    chartpath: string;
    hash: string;
};
export type ChartError = ChartConfigError;
export declare function isChartError(o: any): o is ChartError;
export type ChartResponse = ChartResponseInfo | ChartError;
export declare function assertChartInfo(o: any): asserts o is ChartResponseInfo;
