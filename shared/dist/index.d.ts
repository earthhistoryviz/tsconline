export type ChartConfig = {
    img: string;
    title: string;
    description: string;
    settings: string;
};
export declare function assertChartConfig(o: any): asserts o is ChartConfig;
export declare function assertChartConfigArray(o: any): asserts o is ChartConfig[];
export type ChartConfigError = {
    error: string;
};
export type Preset = ChartConfig | ChartConfigError;
export type ChartRequest = {
    settings: string;
};
export declare function assertChartRequest(o: any): asserts o is ChartRequest;
export type ChartResponseInfo = {
    chartpath: string;
};
export type ChartError = ChartConfigError;
export declare function isChartError(o: any): o is ChartError;
export type ChartResponse = ChartResponseInfo | ChartError;
export declare function assertChartInfo(o: any): asserts o is ChartResponseInfo;
