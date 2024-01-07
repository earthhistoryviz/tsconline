// Shared types between app and server (i.e. messages they send back and forth)

export type ChartConfig = {
  img: string, // path to image
  title: string,
  description: string,
  settings: string, // path to base settings file
  datapacks: string[], // active datapack names
};

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

export type ServerResponseError = {
  error: string, // any time an error is thrown on the server side
}

export type Preset = ChartConfig | ServerResponseError;

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
export function isServerResponseError(o: any): o is ServerResponseError {
  if (!o || typeof o !== 'object') return false;
  if (typeof o.error !== 'string') return false;
  return true;
}

export type ChartResponse = ChartResponseInfo | ServerResponseError;

export function assertChartInfo(o: any): asserts o is ChartResponseInfo {
  if (!o || typeof o !== 'object') throw new Error('ChartInfo must be an object');
  if (typeof o.chartpath !== 'string') throw new Error('ChartInfo must have a chartpath string');
  if (typeof o.hash !== 'string') throw new Error('ChartInfo must have a hash string');
}

export type ColumnInfo = {
  [name: string]: {
    on: boolean;
    children: ColumnInfo | null;
    parents: string[];
  };
};

export type ColumnResponse = ColumnInfo | ServerResponseError

export function assertColumnInfo(o: any): asserts o is ColumnInfo {
  if (typeof o !== 'object' || o === null) {
    throw new Error('ColumnInfo must be a non-null object');
  }

  for (const key in o) {
    const columnInfo = o[key];
    
    if (typeof columnInfo !== 'object' || columnInfo === null) {
      throw new Error(`ColumnInfo' value for key '${key}' must be a non-null object`);
    }
    if (typeof columnInfo.on !== 'boolean') {
      throw new Error(`ColumnInfo' value for key '${key}' must have an 'on' boolean`);
    }
    if (!Array.isArray(columnInfo.parents)) {
      throw new Error(`ColumnInfo' value for key '${key}' must have a 'parents' string array`);
    }
    if (columnInfo.children) {
      assertColumnInfo(columnInfo.children)
    }
  }
}


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
export type MapInfo = {
  [name: string]: {
    img: string,
    note?: string,
    parent?: MapInfo[string],
    coordtype: string,
    bounds: Bounds,
    mapPoints: MapPoints,
  }
}
export type MapResponse = MapInfo | ServerResponseError

export type Bounds = {
  upperLeftLon: number,
  upperLeftLat: number,
  lowerRightLon: number,
  lowerRightLat: number
}

export function assertMaps(o: any): asserts o is MapInfo {
  if (typeof o !== 'object' || o === null) {
    throw new Error('Maps must be a non-null object');
  }

  for (const key in o) {
    const map = o[key];
    
    if (typeof map !== 'object' || map === null) {
      throw new Error(`Maps' value for key '${key}' must be a non-null object`);
    }
    if (typeof map.img !== 'string') {
      throw new Error(`Maps' value for key '${key}' must have an 'img' string property`);
    }
    if ('note' in map && typeof map.note !== 'string') {
      throw new Error(`Maps' value for key '${key}' must have a 'note' string property`);
    }
    if ('parent' in map && typeof map.parent !== 'object') {
      throw new Error(`Maps' value for key '${key}' has an invalid 'parent' property`);
    }
    if (typeof map.coordtype !== 'string') {
      throw new Error(`Maps' value for key '${key}' must have a 'coordtype' string property`);
    }
    assertBounds(map.bounds);
    assertMapPoints(map.mapPoints);
  }
}

function assertBounds(bounds: any): asserts bounds is Bounds {
  if (typeof bounds !== 'object' || bounds === null) {
    throw new Error('Bounds must be a non-null object');
  }
  if (typeof bounds.upperLeftLon !== 'number') {
    throw new Error('Bounds must have an upperLeftLon number property');
  }
  if (typeof bounds.upperLeftLat !== 'number') {
    throw new Error('Bounds must have an upperLeftLat number property');
  }
  if (typeof bounds.lowerRightLon !== 'number') {
    throw new Error('Bounds must have a lowerRightLon number property');
  }
  if (typeof bounds.lowerRightLat !== 'number') {
    throw new Error('Bounds must have a lowerRightLat number property');
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
export type SuccessfulServerResponse = {
  message: string
}
export type ServerResponse = SuccessfulServerResponse | ServerResponseError
export function assertSuccessfulServerResponse(o: any): asserts o is SuccessfulServerResponse {
  if (!o || typeof o !== 'object') throw new Error (`SuccessfulServerResponse must be a non-null object`);
  if (typeof o.message !== 'string') throw new Error(`SuccessfulServerResponse must have a 'message' string property`);
}