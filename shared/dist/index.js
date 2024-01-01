// Shared types between app and server (i.e. messages they send back and forth)
export function assertMaps(o) {
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
function assertBounds(bounds) {
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
        throw new Error('Bounds must have a lowerLeftLon number property');
    }
    if (typeof bounds.lowerRightLat !== 'number') {
        throw new Error('Bounds must have a lowerLeftLat number property');
    }
}
export function assertMapPoints(o) {
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
export function assertChartConfig(o) {
    if (typeof o !== 'object')
        throw new Error('ChartConfig must be an object');
    if (typeof o.img !== 'string')
        throw new Error('ChartConfig must have an img string');
    if (typeof o.title !== 'string')
        throw new Error('ChartConfig must have a title string');
    if (typeof o.description !== 'string')
        throw new Error('ChartConfig must have a description string');
    if (typeof o.settings !== 'string')
        throw new Error('ChartConfig must have a settings path string');
    if (!Array.isArray(o.datapacks))
        throw new Error('ChartConfig must have a datapacks array of datapack string names.  ');
}
export function assertChartConfigArray(o) {
    if (!o || !Array.isArray(o))
        throw new Error('ChartConfig array must be an array');
    for (const c of o)
        assertChartConfig(c);
}
export function assertChartRequest(o) {
    if (typeof o !== 'object')
        throw new Error('ChartRequest must be an object');
    if (typeof o.settings !== 'string')
        throw new Error('ChartRequest must have a settings string');
    if (!Array.isArray(o.datapacks))
        throw new Error('ChartRequest must have a datapacks array');
}
export function isChartError(o) {
    if (!o || typeof o !== 'object')
        return false;
    if (typeof o.error !== 'string')
        return false;
    return true;
}
export function assertChartInfo(o) {
    if (!o || typeof o !== 'object')
        throw new Error('ChartInfo must be an object');
    if (typeof o.chartpath !== 'string')
        throw new Error('ChartInfo must have a chartpath string');
    if (typeof o.hash !== 'string')
        throw new Error('ChartInfo must have a hash string');
}
//# sourceMappingURL=index.js.map