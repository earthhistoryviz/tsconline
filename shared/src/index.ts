// Shared types between app and server (i.e. messages they send back and forth)

export type ChartConfig = {
  img: string, // path to image
  title: string,
  description: string,
  settings: string, // path to base settings file
  datapacks: string[], // active datapack names
  decrypted: string[]
};

export function assertChartConfig(o: any): asserts o is ChartConfig {
  if (typeof o !== 'object') throw 'ChartConfig must be an object';
  if (typeof o.img !== 'string') throw 'ChartConfig must have an img string';
  if (typeof o.title !== 'string') throw 'ChartConfig must have a title string';
  if (typeof o.description !== 'string') throw 'ChartConfig must have a description string';
  if (typeof o.settings !== 'string') throw 'ChartConfig must have a settings path string';
  if (!Array.isArray(o.datapacks)) throw 'ChartConfig must have a datapacks array of datapack string names.  '
  if (!Array.isArray(o.decrypted)) throw 'ChartConfig must have a decrypted array of decrypted datapack string names.  '
}

export function assertChartConfigArray(o: any): asserts o is ChartConfig[] {
  if (!o || !Array.isArray(o)) throw 'ChartConfig array must be an array';
  for (const c of o) assertChartConfig(c);
}

export type ChartConfigError = {
  error: string, // a chart that couldn't be loaded from the disk
}

export type Preset = ChartConfig | ChartConfigError;

export type ChartRequest = {
  settings: string, // XML string representing the settings file you want to use to make a chart
  datapacks: string[], // active datapacks to be used on chart
}
export function assertChartRequest(o: any): asserts o is ChartRequest {
  if (typeof o !== 'object') throw 'ChartRequest must be an object';
  if (typeof o.settings !== 'string') throw 'ChartRequest must have a settings string';
  if (!Array.isArray(o.datapacks)) throw 'ChartRequest must have a datapacks array';
}

export type ChartResponseInfo = {
  chartpath: string, // path to the chart
}
export type ChartError = ChartConfigError;
export function isChartError(o: any): o is ChartError {
  if (!o || typeof o !== 'object') return false;
  if (typeof o.error !== 'string') return false;
  return true;
}

export type ChartResponse = ChartResponseInfo | ChartError;

export function assertChartInfo(o: any): asserts o is ChartResponseInfo {
  if (!o || typeof o !== 'object') throw 'ChartInfo must be an object';
  if (typeof o.chartpath !== 'string') throw 'ChartInfo must have a chartpath string';
}
