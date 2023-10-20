// Shared types between app and server (i.e. messages they send back and forth)
export function assertChartConfig(o) {
    if (typeof o !== 'object')
        throw 'ChartConfig must be an object';
    if (typeof o.img !== 'string')
        throw 'ChartConfig must have an img string';
    if (typeof o.title !== 'string')
        throw 'ChartConfig must have a title string';
    if (typeof o.description !== 'string')
        throw 'ChartConfig must have a description string';
    if (typeof o.settings !== 'string')
        throw 'ChartConfig must have a settings path string';
    if (!Array.isArray(o.datapacks))
        throw 'ChartConfig must have a datapacks array of datapack string names.  ';
}
export function assertChartConfigArray(o) {
    if (!o || !Array.isArray(o))
        throw 'ChartConfig array must be an array';
    for (const c of o)
        assertChartConfig(c);
}
export function assertChartRequest(o) {
    if (typeof o !== 'object')
        throw 'ChartRequest must be an object';
    if (typeof o.settings !== 'string')
        throw 'ChartRequest must have a settings string';
    if (!Array.isArray(o.datapacks))
        throw 'ChartRequest must have a datapacks array';
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
        throw 'ChartInfo must be an object';
    if (typeof o.chartpath !== 'string')
        throw 'ChartInfo must have a chartpath string';
}
//# sourceMappingURL=index.js.map