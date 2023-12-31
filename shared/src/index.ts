// Shared types between app and server (i.e. messages they send back and forth)

export type ChartConfig = {
  img: string, // path to image
  title: string,
  description: string,
  settings: string, // path to base settings file
  datapacks: string[], // active datapack names
};

export type ColumnSetting = {
  [name: string]: {
    on: boolean;
    children: ColumnSetting | null;
    parents: string[];
  };
};

export type GeologicalStages = {
  [key: string]: number
}
export type MapPoints = {
  [name: string]: {
    lat: number;
    lon: number;
    default?: string;
    minage?: number;
    maxage?: number;
    note?: string;
  }
}
export function assertMapPoints(o: any): asserts o is MapPoints {
  if (typeof o !== 'object' || o === null) {
    throw new Error('MapPoints must be a non-null object');
  }

  for (const key in o) {
    const point = o[key]; 
    if (typeof point !== 'object' || point === null) {
      throw new Error(`MapPoints' value for key '${key}' must be a non-null object`);
    }
    if (typeof point.lat !== 'number') {
      throw new Error(`MapPoints' value for key '${key}' must have a 'lat' number property`);
    }
    if (typeof point.lon !== 'number') {
      throw new Error(`MapPoints' value for key '${key}' must have a 'lon' number property`);
    }
    if (point.default !== undefined && typeof point.default !== 'string') {
      throw new Error(`MapPoints' value for key '${key}' must have a 'default' string property`);
    }
    if (point.minage !== undefined && typeof point.minage !== 'number') {
      throw new Error(`MapPoints' value for key '${key}' must have a 'minage' number property`);
    }
    if (point.maxage !== undefined && typeof point.maxage !== 'number') {
      throw new Error(`MapPoints' value for key '${key}' must have a 'maxage' number property`);
    }
    if (point.note !== undefined && typeof point.note !== 'string') {
      throw new Error(`MapPoints' value for key '${key}' must have a 'note' string property`);
    }
  }
}

export function assertChartConfig(o: any): asserts o is ChartConfig {
  if (typeof o !== 'object') throw new Error('ChartConfig must be an object');
  if (typeof o.img !== 'string') throw new Error('ChartConfig must have an img string');
  if (typeof o.title !== 'string') throw new Error('ChartConfig must have a title string');
  if (typeof o.description !== 'string') throw new Error('ChartConfig must have a description string');
  if (typeof o.settings !== 'string') throw new Error('ChartConfig must have a settings path string');
  if (!Array.isArray(o.datapacks)) throw new Error('ChartConfig must have a datapacks array of datapack string names.  ');
}

export function assertChartConfigArray(o: any): asserts o is ChartConfig[] {
  if (!o || !Array.isArray(o)) throw new Error('ChartConfig array must be an array');
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
  if (typeof o !== 'object') throw new Error('ChartRequest must be an object');
  if (typeof o.settings !== 'string') throw new Error('ChartRequest must have a settings string');
  if (!Array.isArray(o.datapacks)) throw new Error('ChartRequest must have a datapacks array');
}

export type ChartResponseInfo = {
  chartpath: string, // path to the chart
  hash: string // hash for where it is stored
}
export type ChartError = ChartConfigError;
export function isChartError(o: any): o is ChartError {
  if (!o || typeof o !== 'object') return false;
  if (typeof o.error !== 'string') return false;
  return true;
}

export type ChartResponse = ChartResponseInfo | ChartError;

export function assertChartInfo(o: any): asserts o is ChartResponseInfo {
  if (!o || typeof o !== 'object') throw new Error('ChartInfo must be an object');
  if (typeof o.chartpath !== 'string') throw new Error('ChartInfo must have a chartpath string');
  if (typeof o.hash !== 'string') throw new Error('ChartInfo must have a hash string');
}
