// Shared types between app and server (i.e. messages they send back and forth)
export function assertMapPackIndex(o) {
    if (!o || typeof o !== "object")
        throw new Error("MapPackIndex must be a non-null object");
    for (const key in o) {
        if (typeof key !== 'string')
            throw new Error(`MapPackIndex key value ${key} is not a string`);
        assertMapPack(o[key]);
    }
}
export function assertMapPack(o) {
    if (!o || typeof o !== "object")
        throw new Error("MapPack must be a non-null object");
    assertMapInfo(o.mapInfo);
    assertMapHierarchy(o.mapHierarchy);
}
export function assertPresets(o) {
    if (!o || typeof o !== "object")
        throw new Error("Presets must be a non-null object");
    for (const type in o) {
        if (typeof type !== "string")
            throw new Error(`Presets key ${type} must be a string`);
        for (const config of o[type]) {
            assertChartConfig(config);
        }
    }
}
export function assertTransects(o) {
    if (!o || typeof o !== "object")
        throw new Error("Transects must be a non-null object");
    for (const key in o) {
        if (typeof key !== "string")
            throw new Error(`Transects key ${key} must be a string`);
        const transect = o[key];
        if (typeof transect.startMapPoint !== "string")
            throw new Error(`Transects key ${key} value of startMapPoint must be a string`);
        if (typeof transect.endMapPoint !== "string")
            throw new Error(`Transects key ${key} value of endMapPoint must be a string`);
        if (typeof transect.on !== "boolean")
            throw new Error(`Transects key ${key} value of on must be a boolean`);
        if ("note" in transect && typeof transect.note !== "string")
            throw new Error(`Transects key ${key} value of note must be a string`);
    }
}
export function assertDatapackAgeInfo(o) {
    if (typeof o !== "object")
        throw new Error("DatapackAgeInfo must be an object");
    if (typeof o.useDatapackSuggestedAge !== "boolean")
        throw new Error("DatapackAgeInfo must have a boolean useDatapackSuggestedAge");
    if (o.useDatapackSuggestedAge === true) {
        if (typeof o.bottomAge !== "number")
            throw new Error("DatapackAgeInfo must have a number bottomAge");
        if (typeof o.topAge !== "number")
            throw new Error("DatapackAgeInfo must have a number topAge");
    }
}
export function assertFacies(o) {
    if (!o || typeof o !== "object")
        throw new Error("Facies must be a non-null object");
    if (!o.locations || typeof o.locations !== "object")
        throw new Error("Facies must have a locations property with type object");
    assertFaciesLocations(o.locations);
    if (typeof o.minAge !== "number")
        throw new Error("Facies must have a min age with type number");
    if (typeof o.maxAge !== "number")
        throw new Error("Facies must have a max age with type number");
    if (typeof o.aliases !== "object")
        throw new Error("Facies must have a aliases object");
    for (const alias in o.aliases) {
        if (typeof alias !== "string")
            throw new Error("aliases in Facies object must have keys of type string");
        if (typeof o.aliases[alias] !== "string")
            throw new Error("aliases in Facies object must have indexed values of type string");
    }
}
export function assertDatapackParsingPack(o) {
    if (!o || typeof o !== "object")
        throw new Error("DatapackParsingPack must be a non-null object");
    if (!Array.isArray(o.columnInfoArray))
        throw new Error(`DatapackParsingPack must have a columnInfoArray array of ColumnInfos`);
    for (const key in o.columnInfoArray) {
        assertColumnInfo(o.columnInfoArray[key]);
    }
    assertFacies(o.facies);
    assertDatapackAgeInfo(o.datapackAgeInfo);
}
export function assertDatapackIndex(o) {
    if (!o || typeof o !== "object")
        throw new Error("DatapackIndex must be a non-null object");
    for (const key in o) {
        if (typeof key !== "string")
            throw new Error(`DatapackIndex 'key' ${location} must be of type 'string`);
        assertDatapackParsingPack(o[key]);
    }
}
export function assertFaciesLocations(o) {
    if (!o || typeof o !== "object")
        throw new Error("FaciesLocations must be a non-null object");
    for (const location in o) {
        if (typeof location !== "string")
            throw new Error(`FaciesLocations 'key' ${location} must be of type 'string`);
        const faciesLocation = o[location];
        if (typeof faciesLocation.minAge !== "number")
            throw new Error(`FaciesLocation value for 'key' ${location} must have a minage be of type 'number'`);
        if (typeof faciesLocation.maxAge !== "number")
            throw new Error(`FaciesLocation value for 'key' ${location} must have a maxage be of type 'number'`);
        if (!Array.isArray(faciesLocation.faciesTimeBlockArray))
            throw new Error(`FaciesLocation value for 'key' ${location} must have a faciesTimeBlock that is an array`);
        faciesLocation.faciesTimeBlockArray.forEach((item) => {
            assertFaciesTimeBlock(item);
        });
    }
}
export function assertFaciesTimeBlock(o) {
    if (!o || typeof o !== "object")
        throw new Error("FaciesTimeBlock must be a non-null object");
    if (typeof o.rockType !== "string") {
        throw new Error("FaciesTimeBlock must have a rockType variable of type 'string'");
    }
    if ("label" in o && typeof o.label !== "string")
        throw new Error("FaciesTimeBlock must have a label variable of type 'string'");
    if (typeof o.age !== "number")
        throw new Error("FaciesTimeBlock must have a age variable of valid type 'number'");
}
export function assertIndexResponse(o) {
    if (!o || typeof o !== "object")
        throw new Error("IndexResponse must be a non-null object");
    assertDatapackIndex(o.datapackIndex);
    assertMapPackIndex(o.mapPackIndex);
}
export function assertDatapackResponse(o) {
    if (!o || typeof o !== "object")
        throw new Error("DatapackResponse must be a non-null object");
    assertColumnInfo(o.columnInfo);
    assertFacies(o.facies);
    assertMapInfo(o.mapInfo);
    assertMapHierarchy(o.mapHierarchy);
    assertDatapackAgeInfo(o.datapackAgeInfo);
}
export function assertChartConfig(o) {
    if (typeof o !== "object")
        throw new Error("ChartConfig must be an object");
    if (typeof o.icon !== "string")
        throw new Error("ChartConfig must have an icon string");
    if (typeof o.background !== "string")
        throw new Error("ChartConfig must have an background string");
    if (typeof o.title !== "string")
        throw new Error("ChartConfig must have a title string");
    if (typeof o.description !== "string")
        throw new Error("ChartConfig must have a description string");
    if (typeof o.settings !== "string")
        throw new Error("ChartConfig must have a settings path string");
    if (typeof o.date !== "string")
        throw new Error("ChartConfig must have a date string");
    if ("type" in o && typeof o.type !== "string")
        throw new Error("ChartConfig variable 'type' must be a string");
    if (!Array.isArray(o.datapacks))
        throw new Error("ChartConfig must have a datapacks array of datapack string names.  ");
}
export function assertChartConfigArray(o) {
    if (!o || !Array.isArray(o))
        throw new Error("ChartConfig array must be an array");
    for (const c of o)
        assertChartConfig(c);
}
export function assertChartRequest(o) {
    if (typeof o !== "object")
        throw new Error("ChartRequest must be an object");
    if (typeof o.settings !== "string")
        throw new Error("ChartRequest must have a settings string");
    if (typeof o.columnSettings !== "string")
        throw new Error("ChartRequest must have a columnSettings string");
    if (!Array.isArray(o.datapacks))
        throw new Error("ChartRequest must have a datapacks array");
}
export function isServerResponseError(o) {
    if (!o || typeof o !== "object")
        return false;
    if (typeof o.error !== "string")
        return false;
    return true;
}
// export type ChartResponse = ChartResponseInfo | ServerResponseError
export function assertChartInfo(o) {
    if (!o || typeof o !== "object")
        throw new Error("ChartInfo must be an object");
    if (typeof o.chartpath !== "string")
        throw new Error("ChartInfo must have a chartpath string");
    if (typeof o.hash !== "string")
        throw new Error("ChartInfo must have a hash string");
}
export function assertColumnInfo(o) {
    if (typeof o !== "object" || o === null) {
        throw new Error("ColumnInfo must be a non-null object");
    }
    if (typeof o.on !== "boolean") {
        throw new Error(`ColumnInfo' must have an 'on' boolean`);
    }
    if (o.parent != null && typeof o.parent !== 'string') {
        throw new Error(`ColumnInfo' must have a 'parent' string or be null`);
    }
    if (o.info != null && typeof o.info != 'string') {
        throw new Error(`ColumnInfo' must have a 'info' string or be null`);
    }
    for (const child of o.children) {
        if (child === null || typeof child !== 'object') {
            throw new Error(`'ColumnInfo' must have a children array with all values non-null: ${child}`);
        }
        assertColumnInfo(child);
    }
}
export function assertMapHierarchy(o) {
    if (typeof o !== "object" || o === null) {
        throw new Error("MapsHierarchy must be a non-null object");
    }
    for (const key in o) {
        const map = o[key];
        if (!Array.isArray(map)) {
            throw new Error(`MapHierarchy value for key '${key}' must be a string array`);
        }
    }
}
export function assertMapInfo(o) {
    if (typeof o !== "object" || o === null) {
        throw new Error("MapInfo must be a non-null object");
    }
    for (const key in o) {
        const map = o[key];
        if (typeof map !== "object" || map === null) {
            throw new Error(`MapInfo' value for key '${key}' must be a non-null object`);
        }
        if (typeof map.img !== "string") {
            throw new Error(`MapInfo' value for key '${key}' must have an 'img' string property`);
        }
        if ("note" in map && typeof map.note !== "string") {
            throw new Error(`MapInfo' value for key '${key}' must have a 'note' string property`);
        }
        if ("parent" in map) {
        }
        if (typeof map.coordtype !== "string") {
            throw new Error(`MapInfo' value for key '${key}' must have a 'coordtype' string property`);
        }
        if ("infoPoints" in map) {
            assertInfoPoints(map.infoPoints);
        }
        if ("transects" in map) {
            assertTransects(map.transects);
        }
        assertBounds(map.coordtype, map.bounds);
        assertMapPoints(map.mapPoints);
    }
}
export function assertParentMap(parent) {
    if (typeof parent !== "object" || parent == null) {
        throw new Error(`Parent must be a non-nul object`);
    }
    if (typeof parent.name !== "string") {
        throw new Error(`Parent must have a name string property`);
    }
    if (typeof parent.coordtype !== "string") {
        throw new Error(`Parent must have a coordtype string property`);
    }
    assertBounds(parent.coordtype, parent.bounds);
}
export function isRectBounds(bounds) {
    return ("upperLeftLon" in bounds &&
        "upperLeftLat" in bounds &&
        "lowerRightLat" in bounds &&
        "lowerRightLon" in bounds);
}
export function isVertBounds(bounds) {
    return ("centerLat" in bounds &&
        "centerLon" in bounds &&
        "height" in bounds &&
        "scale" in bounds);
}
export function assertBounds(coordtype, bounds) {
    switch (coordtype) {
        case "RECTANGULAR":
            assertRectBounds(bounds);
            break;
        case "VERTICAL PERSPECTIVE":
            assertVertBounds(bounds);
            break;
        default:
            throw new Error(`Unrecognized coordtype: ${coordtype}`);
            break;
    }
}
export function assertVertBounds(vertBounds) {
    if (typeof vertBounds !== "object" || vertBounds === null) {
        throw new Error("VertBounds must be a non-null object");
    }
    if (typeof vertBounds.centerLat !== "number") {
        throw new Error("VertBounds must have a centerLat number property");
    }
    if (typeof vertBounds.centerLon !== "number") {
        throw new Error("VertBounds must have an centerLon number property");
    }
    if (typeof vertBounds.height !== "number") {
        throw new Error("VertBounds must have a height number property");
    }
    if (typeof vertBounds.scale !== "number") {
        throw new Error("VertBounds must have a scale number property");
    }
}
export function assertRectBounds(rectBounds) {
    if (typeof rectBounds !== "object" || rectBounds === null) {
        throw new Error("RectBounds must be a non-null object");
    }
    if (typeof rectBounds.upperLeftLon !== "number") {
        throw new Error("RectBounds must have an upperLeftLon number property");
    }
    if (typeof rectBounds.upperLeftLat !== "number") {
        throw new Error("RectBounds must have an upperLeftLat number property");
    }
    if (typeof rectBounds.lowerRightLon !== "number") {
        throw new Error("RectBounds must have a lowerRightLon number property");
    }
    if (typeof rectBounds.lowerRightLat !== "number") {
        throw new Error("RectBounds must have a lowerRightLat number property");
    }
}
export function assertInfoPoints(o) {
    if (typeof o !== "object" || o === null) {
        throw new Error("InfoPoints must be a non-null object");
    }
    for (const key in o) {
        const point = o[key];
        if (typeof point !== "object" || point === null) {
            throw new Error(`InfoPoints' value for key '${key}' must be a non-null object`);
        }
        if (typeof point.lat !== "number") {
            throw new Error(`InfoPoints' value for key '${key}' must have a 'lat' number property`);
        }
        if (typeof point.lon !== "number") {
            throw new Error(`InfoPoints' value for key '${key}' must have a 'lon' number property`);
        }
        if (point.note !== undefined && typeof point.note !== "string") {
            throw new Error(`InfoPoints' value for key '${key}' must have a 'note' string property`);
        }
    }
}
export function assertMapPoints(o) {
    if (typeof o !== "object" || o === null) {
        throw new Error("MapPoints must be a non-null object");
    }
    for (const key in o) {
        const point = o[key];
        if (typeof point !== "object" || point === null) {
            throw new Error(`MapPoints' value for key '${key}' must be a non-null object`);
        }
        if (typeof point.lat !== "number") {
            throw new Error(`MapPoints' value for key '${key}' must have a 'lat' number property`);
        }
        if (typeof point.lon !== "number") {
            throw new Error(`MapPoints' value for key '${key}' must have a 'lon' number property`);
        }
        if (point.default !== undefined && typeof point.default !== "string") {
            throw new Error(`MapPoints' value for key '${key}' must have a 'default' string property`);
        }
        if (point.minage !== undefined && typeof point.minage !== "number") {
            throw new Error(`MapPoints' value for key '${key}' must have a 'minage' number property`);
        }
        if (point.maxage !== undefined && typeof point.maxage !== "number") {
            throw new Error(`MapPoints' value for key '${key}' must have a 'maxage' number property`);
        }
        if (point.note !== undefined && typeof point.note !== "string") {
            throw new Error(`MapPoints' value for key '${key}' must have a 'note' string property`);
        }
    }
}
export function assertSuccessfulServerResponse(o) {
    if (!o || typeof o !== "object")
        throw new Error(`SuccessfulServerResponse must be a non-null object`);
    if (typeof o.message !== "string")
        throw new Error(`SuccessfulServerResponse must have a 'message' string property`);
}
export function assertSVGStatus(o) {
    if (!o || typeof o !== "object")
        throw new Error(`SVGStatus must be a non-null object`);
    if (typeof o.ready !== "boolean")
        throw new Error(`SVGStatus must have a 'ready' boolean property`);
}

export function assertTimescale(val) {
    if (!val || typeof val !== 'object') {
        throw new Error('Timescale object must be a non-null object');
    }
    if (typeof val.key !== 'string' || typeof val.value !== 'number') {
        throw new Error(`Timescale object must have 'key' of type string and 'value' of type number`);
    }
}
//# sourceMappingURL=index.js.map