// Shared types between app and server (i.e. messages they send back and forth)

export type ChartConfig = {
  img: string, // path to image
  title: string,
  description: string,
  settings: string, // path to base settings file
  datapacks: string[], // active datapack names
}

export function assertChartConfig(o: any): asserts o is ChartConfig {
  if (typeof o !== 'object') throw new Error('ChartConfig must be an object')
  if (typeof o.img !== 'string') throw new Error('ChartConfig must have an img string')
  if (typeof o.title !== 'string') throw new Error('ChartConfig must have a title string')
  if (typeof o.description !== 'string') throw new Error('ChartConfig must have a description string')
  if (typeof o.settings !== 'string') throw new Error('ChartConfig must have a settings path string')
  if (!Array.isArray(o.datapacks)) throw new Error('ChartConfig must have a datapacks array of datapack string names.  ')
}

export function assertChartConfigArray(o: any): asserts o is ChartConfig[] {
  if (!o || !Array.isArray(o)) throw new Error('ChartConfig array must be an array')
  for (const c of o) assertChartConfig(c)
}

export type ServerResponseError = {
  error: string, // any time an error is thrown on the server side
}

export type Preset = ChartConfig | ServerResponseError

export type ChartRequest = {
  settings: string, // JSON string representing the settings file you want to use to make a chart
  columnSettings: string, //Json string representing the state of the application when generating, contains the user's changes
  datapacks: string[], // active datapacks to be used on chart
}
export function assertChartRequest(o: any): asserts o is ChartRequest {
  if (typeof o !== 'object') throw new Error('ChartRequest must be an object')
  if (typeof o.settings !== 'string') throw new Error('ChartRequest must have a settings string')
  if (typeof o.columnSettings !== 'string') throw new Error('ChartRequest must have a columnSettings string')
  if (!Array.isArray(o.datapacks)) throw new Error('ChartRequest must have a datapacks array')
}

export type ChartResponseInfo = {
  chartpath: string, // path to the chart
  hash: string // hash for where it is stored
}
export function isServerResponseError(o: any): o is ServerResponseError {
  if (!o || typeof o !== 'object') return false
  if (typeof o.error !== 'string') return false
  return true
}

// export type ChartResponse = ChartResponseInfo | ServerResponseError

export function assertChartInfo(o: any): asserts o is ChartResponseInfo {
  if (!o || typeof o !== 'object') throw new Error('ChartInfo must be an object')
  if (typeof o.chartpath !== 'string') throw new Error('ChartInfo must have a chartpath string')
  if (typeof o.hash !== 'string') throw new Error('ChartInfo must have a hash string')
}

export type ColumnInfo = {
  [name: string]: {
    on: boolean,
    children: ColumnInfo | null,
    parents: string[],
  }
}

export function assertColumnInfo(o: any): asserts o is ColumnInfo {
  if (typeof o !== 'object' || o === null) {
    throw new Error('ColumnInfo must be a non-null object')
  }

  for (const key in o) {
    const columnInfo = o[key]
    
    if (typeof columnInfo !== 'object' || columnInfo === null) {
      throw new Error(`ColumnInfo' value for key '${key}' must be a non-null object`)
    }
    if (typeof columnInfo.on !== 'boolean') {
      throw new Error(`ColumnInfo' value for key '${key}' must have an 'on' boolean`)
    }
    if (!Array.isArray(columnInfo.parents)) {
      throw new Error(`ColumnInfo' value for key '${key}' must have a 'parents' string array`)
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
    lat: number
    lon: number
    default?: string
    minage?: number
    maxage?: number
    note?: string
  }
}
export type MapInfo = {
  [name: string]: {
    img: string,
    note?: string,
    parent?: ParentMap,
    coordtype: string,
    bounds: Bounds,
    mapPoints: MapPoints,
  }
}
export type ParentMap = {
  name: string,
  coordtype: string,
  bounds: Bounds
}
export type MapHierarchy = {
  [parent: string]: string[]
}

export type DatapackResponse = { 
  columnInfo: ColumnInfo,
  mapInfo: MapInfo,
  mapHierarchy: MapHierarchy
} 
export type Bounds = RectBounds | VertBounds

export type RectBounds = {
  upperLeftLon: number,
  upperLeftLat: number,
  lowerRightLon: number,
  lowerRightLat: number,
}

export type VertBounds = {
  centerLat: number,
  centerLon: number,
  height: number,
  scale: number,
}

export function assertMapHierarchy(o: any): asserts o is MapHierarchy {
  if (typeof o !== 'object' || o === null) {
    throw new Error('MapsHierarchy must be a non-null object')
  }
  for (const key in o) {
    const map = o[key]
    if (!Array.isArray(map)) {
      throw new Error(`MapHierarchy value for key '${key}' must be a string array`)
    }
  }
}

export function assertMapInfo(o: any): asserts o is MapInfo {
  if (typeof o !== 'object' || o === null) {
    throw new Error('MapInfo must be a non-null object')
  }

  for (const key in o) {
    const map = o[key]
    
    if (typeof map !== 'object' || map === null) {
      throw new Error(`MapInfo' value for key '${key}' must be a non-null object`)
    }
    if (typeof map.img !== 'string') {
      throw new Error(`MapInfo' value for key '${key}' must have an 'img' string property`)
    }
    if ('note' in map && typeof map.note !== 'string') {
      throw new Error(`MapInfo' value for key '${key}' must have a 'note' string property`)
    }
    if ('parent' in map) {
    }
    if (typeof map.coordtype !== 'string') {
      throw new Error(`MapInfo' value for key '${key}' must have a 'coordtype' string property`)
    }
    assertBounds(map.coordtype, map.bounds)
    assertMapPoints(map.mapPoints)
  }
}

export function assertParentMap(parent: any): asserts parent is ParentMap {
    if (typeof parent! !== 'object' || parent == null) {
      throw new Error(`Parent must be a non-nul object`)
    }
    if (typeof parent.name !== 'string') {
      throw new Error(`Parent must have a name string property`)
    }
    if (typeof parent.coordtype !== 'string') {
      throw new Error(`Parent must have a coordtype string property`)
    }
    assertBounds(parent.coordtype, parent.bounds)
}

export function isRectBounds(bounds: Bounds): bounds is RectBounds {
  return 'upperLeftLon' in bounds && 'upperLeftLat' in bounds && 'lowerRightLat' in bounds && 'lowerRightLon' in bounds
}

export function isVertBounds(bounds: Bounds): bounds is VertBounds {
  return 'centerLat' in bounds && 'centerLon' in bounds && 'height' in bounds && 'scale' in bounds
}

export function assertBounds(coordtype: string, bounds: any): asserts bounds is Bounds {
  switch (coordtype) {
    case 'RECTANGULAR':
      assertRectBounds(bounds)
      break
    case 'VERTICAL PERSPECTIVE':
      assertVertBounds(bounds)
      break
    default:
      throw new Error(`Unrecognized coordtype: ${coordtype}`)
      break
  }
}

export function assertVertBounds(vertBounds: any): asserts vertBounds is VertBounds {
  if (typeof vertBounds !== 'object' || vertBounds === null) {
    throw new Error('VertBounds must be a non-null object')
  }
  if (typeof vertBounds.centerLat !== 'number') {
    throw new Error('VertBounds must have a centerLat number property')
  }
  if (typeof vertBounds.centerLon !== 'number') {
    throw new Error('VertBounds must have an centerLon number property')
  }
  if (typeof vertBounds.height !== 'number') {
    throw new Error('VertBounds must have a height number property')
  }
  if (typeof vertBounds.scale !== 'number') {
    throw new Error('VertBounds must have a scale number property')
  }
}

export function assertRectBounds(rectBounds: any): asserts rectBounds is RectBounds {
  if (typeof rectBounds !== 'object' || rectBounds === null) {
    throw new Error('RectBounds must be a non-null object')
  }
  if (typeof rectBounds.upperLeftLon !== 'number') {
    throw new Error('RectBounds must have an upperLeftLon number property')
  }
  if (typeof rectBounds.upperLeftLat !== 'number') {
    throw new Error('RectBounds must have an upperLeftLat number property')
  }
  if (typeof rectBounds.lowerRightLon !== 'number') {
    throw new Error('RectBounds must have a lowerRightLon number property')
  }
  if (typeof rectBounds.lowerRightLat !== 'number') {
    throw new Error('RectBounds must have a lowerRightLat number property')
  }
}
export function assertMapPoints(o: any): asserts o is MapPoints {
  if (typeof o !== 'object' || o === null) {
    throw new Error('MapPoints must be a non-null object')
  }

  for (const key in o) {
    const point = o[key] 
    if (typeof point !== 'object' || point === null) {
      throw new Error(`MapPoints' value for key '${key}' must be a non-null object`)
    }
    if (typeof point.lat !== 'number') {
      throw new Error(`MapPoints' value for key '${key}' must have a 'lat' number property`)
    }
    if (typeof point.lon !== 'number') {
      throw new Error(`MapPoints' value for key '${key}' must have a 'lon' number property`)
    }
    if (point.default !== undefined && typeof point.default !== 'string') {
      throw new Error(`MapPoints' value for key '${key}' must have a 'default' string property`)
    }
    if (point.minage !== undefined && typeof point.minage !== 'number') {
      throw new Error(`MapPoints' value for key '${key}' must have a 'minage' number property`)
    }
    if (point.maxage !== undefined && typeof point.maxage !== 'number') {
      throw new Error(`MapPoints' value for key '${key}' must have a 'maxage' number property`)
    }
    if (point.note !== undefined && typeof point.note !== 'string') {
      throw new Error(`MapPoints' value for key '${key}' must have a 'note' string property`)
    }
  }
}
export type SuccessfulServerResponse = {
  message: string
}
export type ServerResponse = SuccessfulServerResponse | ServerResponseError
export function assertSuccessfulServerResponse(o: any): asserts o is SuccessfulServerResponse {
  if (!o || typeof o !== 'object') throw new Error (`SuccessfulServerResponse must be a non-null object`)
  if (typeof o.message !== 'string') throw new Error(`SuccessfulServerResponse must have a 'message' string property`)
}