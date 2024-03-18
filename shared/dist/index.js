// Shared types between app and server (i.e. messages they send back and forth)
import { defaultFontsInfoConstant } from "./constants";
export const defaultFontsInfo = defaultFontsInfoConstant;
export function assertSubRangeInfo(o) {
    if (!o || typeof o !== "object")
        throw new Error("SubRangeInfo must be a non-null object");
    if (typeof o.label !== "string")
        throwError("SubRangeInfo", "label", "string", o.label);
    if (typeof o.age !== "number")
        throwError("SubRangeInfo", "age", "number", o.age);
    if (typeof o.abundance !== "string")
        throwError("SubRangeInfo", "abundance", "string", o.abundance);
    if (!/TOP|missing|rare|common|frequent|abundant|sample|flood/.test(o.abundance))
        throwError("SubRangeInfo", "abundance", "TOP | missing | rare | common | frequent | abundant | sample | flood", o.abundance);
    if (typeof o.popup !== "string")
        throwError("SubRangeInfo", "popup", "string", o.popup);
}
export function assertRange(o) {
    if (!o || typeof o !== "object")
        throw new Error("Range must be a non-null object");
    if (!Array.isArray(o.subRangeInfo))
        throwError("Range", "subRangeInfo", "array", o.subRangeInfo);
    for (const subRange of o.subRangeInfo) {
        assertSubRangeInfo(subRange);
    }
    assertColumnHeaderProps(o);
}
export function assertColumnHeaderProps(o) {
    if (!o || typeof o !== "object")
        throw new Error("ColumnHeaderProps must be an object");
    if (typeof o.name !== "string")
        throwError("ColumnHeaderProps", "name", "string", o.name);
    if (typeof o.minAge !== "number")
        throwError("ColumnHeaderProps", "minAge", "number", o.minAge);
    if (typeof o.maxAge !== "number")
        throwError("ColumnHeaderProps", "maxAge", "number", o.maxAge);
    if (typeof o.enableTitle !== "boolean")
        throwError("ColumnHeaderProps", "enableTitle", "boolean", o.enableTitle);
    if (typeof o.on !== "boolean")
        throwError("ColumnHeaderProps", "on", "boolean", o.on);
    if (typeof o.width !== "number")
        throwError("ColumnHeaderProps", "width", "number", o.width);
    if (typeof o.popup !== "string")
        throwError("ColumnHeaderProps", "popup", "string", o.popup);
    assertRGB(o.rgb);
}
export function assertRGB(o) {
    if (!o || typeof o !== "object")
        throw new Error("RGB must be a non-null object");
    if (typeof o.r !== "number")
        throwError("RGB", "r", "number", o.r);
    if (o.r < 0 || o.r > 255)
        throwError("RGB", "r", "number between 0 and 255", o.r);
    if (typeof o.g !== "number")
        throwError("RGB", "g", "number", o.rgb.g);
    if (o.g < 0 || o.g > 255)
        throwError("RGB", "g", "number between 0 and 255", o.g);
    if (typeof o.b !== "number")
        throwError("RGB", "b", "number", o.b);
    if (o.b < 0 || o.b > 255)
        throwError("RGB", "b", "number between 0 and 255", o.b);
}
export function assertEvent(o) {
    if (!o || typeof o !== "object")
        throw new Error("Event must be a non-null object");
    if (!Array.isArray(o.subEventInfo))
        throwError("Event", "subEventInfo", "array", o.subEventInfo);
    for (const subEvent of o.subEventInfo) {
        assertSubEventInfo(subEvent);
    }
    assertColumnHeaderProps(o);
}
export function assertSubEventInfo(o) {
    if (!o || typeof o !== "object")
        throw new Error("SubEventInfo must be a non-null object");
    if (typeof o.label !== "string")
        throwError("SubEventInfo", "label", "string", o.label);
    if (typeof o.age !== "number")
        throwError("SubEventInfo", "age", "number", o.age);
    if (typeof o.popup !== "string")
        throwError("SubEventInfo", "popup", "string", o.popup);
    if (typeof o.lineStyle !== "string" || !/^dotted|dashed|solid$/.test(o.lineStyle))
        throwError("SubEventInfo", "lineStyle", "dotted | dashed | solid", o.lineStyle);
}
export function assertColor(o) {
    if (!o || typeof o !== "object")
        throw new Error("Color must be a non-null object");
    if (typeof o.name !== "string")
        throwError("Color", "name", "string", o.color);
    if (typeof o.hex !== "string")
        throwError("Color", "hex", "string", o.hex);
    assertRGB(o.rgb);
}
export function assertPatterns(o) {
    if (!o || typeof o !== "object")
        throw new Error("Patterns must be a non-null object");
    for (const key in o) {
        const pattern = o[key];
        if (typeof pattern.name !== "string")
            throwError("Patterns", "name", "string", pattern.name);
        if (typeof pattern.formattedName !== "string")
            throwError("Patterns", "formattedName", "string", pattern.formattedName);
        if (typeof pattern.filePath !== "string")
            throwError("Patterns", "filePath", "string", pattern.filePath);
        assertColor(pattern.color);
    }
}
export function assertMapPackIndex(o) {
    if (!o || typeof o !== "object")
        throw new Error("MapPackIndex must be a non-null object");
    for (const key in o) {
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
        for (const config of o[type]) {
            assertChartConfig(config);
        }
    }
}
export function assertTransects(o) {
    if (!o || typeof o !== "object")
        throw new Error("Transects must be a non-null object");
    for (const key in o) {
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
export function assertDatapack(o) {
    if (typeof o !== "object")
        throw new Error("Datapack must be an object");
    if (typeof o.name !== "string")
        throw new Error("Datapack must have a field name of type string");
    if (typeof o.file !== "string")
        throw new Error("Datapack must have a field file of type string");
}
export function assertDatapackAgeInfo(o) {
    if (typeof o !== "object")
        throw new Error("DatapackAgeInfo must be an object");
    if (typeof o.datapackContainsSuggAge !== "boolean")
        throwError("DatapackAgeInfo", "datapackContainsSuggAge", "boolean", o.datapackContainsSuggAge);
    if (o.datapackContainsSuggAge) {
        if (typeof o.bottomAge !== "number")
            throwError("DatapackAgeInfo", "bottomAge", "number", o.bottomAge);
        if (typeof o.topAge !== "number")
            throwError("DatapackAgeInfo", "topAge", "number", o.topAge);
    }
}
export function assertSubBlockInfo(o) {
    if (!o || typeof o !== "object")
        throw new Error("SubBlockInfo must be a non-null object");
    if (typeof o.label !== "string")
        throwError("SubBlockInfo", "label", "string", o.label);
    if (typeof o.age !== "number")
        throwError("SubBlockInfo", "age", "number", o.number);
    if (typeof o.popup !== "string")
        throwError("SubBlockInfo", "popup", "string", o.popup);
    if (o.lineStyle !== "solid" && o.lineStyle !== "dotted" && o.lineStyle !== "dashed")
        throwError("SubBlockInfo", "lineStyle", "solid, dotted or dashed", o.lineStyle);
    assertRGB(o.rgb);
}
export function assertBlock(o) {
    if (!o || typeof o !== "object")
        throw new Error("Block must be a non-null object");
    for (const subBlockInfo of o.subBlockInfo) {
        assertSubBlockInfo(subBlockInfo);
    }
    assertColumnHeaderProps(o);
}
export function assertFacies(o) {
    if (!o || typeof o !== "object")
        throw new Error("Facies must be a non-null object");
    if (!Array.isArray(o.faciesTimeBlockInfo))
        throw new Error("Facies must have a faciesTimeBlockInfo field with type array");
    for (const block of o.faciesTimeBlockInfo) {
        assertSubFaciesInfo(block);
    }
    assertColumnHeaderProps(o);
}
export function assertDatapackParsingPack(o) {
    if (!o || typeof o !== "object")
        throw new Error("DatapackParsingPack must be a non-null object");
    if (!Array.isArray(o.columnInfoArray))
        throw new Error(`DatapackParsingPack must have a columnInfoArray array of ColumnInfos`);
    for (const columnInfo of o.columnInfoArray) {
        assertColumnInfo(columnInfo);
    }
    assertDatapackAgeInfo(o.datapackAgeInfo);
}
export function assertDatapackIndex(o) {
    if (!o || typeof o !== "object")
        throw new Error("DatapackIndex must be a non-null object");
    for (const key in o) {
        const pack = o[key];
        assertDatapackParsingPack(pack);
    }
}
export function assertSubFaciesInfo(o) {
    if (!o || typeof o !== "object")
        throw new Error("SubFaciesInfo must be a non-null object");
    if (typeof o.rockType !== "string")
        throwError("SubFaciesInfo", "rockType", "string", o.rockType);
    if (typeof o.info !== "string")
        throwError("SubFaciesInfo", "info", "string", o.info);
    if ("label" in o && typeof o.label !== "string")
        throwError("SubFaciesInfo", "label", "string", o.label);
    if (typeof o.age !== "number")
        throwError("SubFaciesInfo", "age", "number", o.age);
}
export function assertIndexResponse(o) {
    if (!o || typeof o !== "object")
        throw new Error("IndexResponse must be a non-null object");
    assertDatapackIndex(o.datapackIndex);
    assertMapPackIndex(o.mapPackIndex);
}
export function assertChartConfig(o) {
    if (typeof o !== "object")
        throw new Error("ChartConfig must be an object");
    if (typeof o.icon !== "string")
        throwError("ChartConfig", "icon", "string", o.icon);
    if (typeof o.background !== "string")
        throwError("ChartConfig", "background", "string", o.background);
    if (typeof o.title !== "string")
        throwError("ChartConfig", "title", "string", o.title);
    if (typeof o.description !== "string")
        throwError("ChartConfig", "description", "string", o.description);
    if (typeof o.settings !== "string")
        throwError("ChartConfig", "settings", "string", o.settings);
    if (typeof o.date !== "string")
        throwError("ChartConfig", "date", "string", o.date);
    if ("type" in o && typeof o.type !== "string")
        throwError("ChartConfig", "type", "string", o.type);
    if (!Array.isArray(o.datapacks))
        throw new Error("ChartConfig must have a datapacks array of datapack string names.  ");
}
export function assertChartConfigArray(o) {
    if (!o || !Array.isArray(o))
        throwError("ChartConfigArray", "ChartConfigArray", "array", o);
    for (const c of o)
        assertChartConfig(c);
}
export function assertChartRequest(o) {
    if (typeof o !== "object")
        throw new Error("ChartRequest must be an object");
    if (typeof o.settings !== "string")
        throwError("ChartRequest", "settings", "string", o.settings);
    if (!Array.isArray(o.datapacks))
        throwError("ChartRequest", "datapacks", "array", o.datapacks);
}
export function isServerResponseError(o) {
    if (!o || typeof o !== "object")
        return false;
    if (typeof o.error !== "string")
        return false;
    return true;
}
export function assertChartInfo(o) {
    if (!o || typeof o !== "object")
        throw new Error("ChartInfo must be an object");
    if (typeof o.chartpath !== "string")
        throwError("ChartInfo", "chartpath", "string", o.chartpath);
    if (typeof o.hash !== "string")
        throwError("ChartInfo", "hash", "string", o.hash);
}
export function assertColumnInfo(o) {
    if (typeof o !== "object" || o === null) {
        throw new Error("ColumnInfo must be a non-null object");
    }
    if (typeof o.name !== "string")
        throwError("ColumnInfo", "name", "string", o.name);
    if (typeof o.editName !== "string")
        throwError("ColumnInfo", "editName", "string", o.editName);
    if (typeof o.on !== "boolean")
        throwError("ColumnInfo", "on", "boolean", o.on);
    if (typeof o.popup !== "string")
        throwError("ColumnInfo", "popup", "string", o.popup);
    if (o.parent !== null && typeof o.parent !== "string")
        throwError("ColumnInfo", "parent", "string", o.parent);
    if (typeof o.minAge !== "number")
        throwError("ColumnInfo", "minAge", "number", o.minAge);
    if (typeof o.maxAge !== "number")
        throwError("ColumnInfo", "maxAge", "number", o.maxAge);
    if (typeof o.width !== "number")
        throwError("ColumnInfo", "width", "number", o.width);
    if (typeof o.enableTitle !== "boolean")
        throwError("ColumnInfo", "enableTitle", "boolean", o.enableTitle);
    assertRGB(o.rgb);
    for (const child of o.children) {
        assertColumnInfo(child);
    }
    if ("subBlockInfo" in o) {
        if (!o.subBlockInfo || !Array.isArray(o.subBlockInfo))
            throwError("ColumnInfo", "subBlockInfo", "array", o.subBlockInfo);
        for (const block of o.subBlockInfo) {
            assertSubBlockInfo(block);
        }
    }
    if ("subFaciesInfo" in o) {
        if (!o.subFaciesInfo || !Array.isArray(o.subFaciesInfo))
            throwError("ColumnInfo", "subFaciesInfo", "array", o.subFaciesInfo);
        for (const facies of o.subFaciesInfo) {
            assertSubFaciesInfo(facies);
        }
    }
    if ("subEventInfo" in o) {
        if (!o.subEventInfo || !Array.isArray(o.subEventInfo))
            throwError("ColumnInfo", "subEventInfo", "array", o.subEventInfo);
        for (const event of o.subEventInfo) {
            assertSubEventInfo(event);
        }
    }
    if ("subRangeInfo" in o) {
        if (!o.subRangeInfo || !Array.isArray(o.subRangeInfo))
            throwError("ColumnInfo", "subRangeInfo", "array", o.subRangeInfo);
        for (const range of o.subRangeInfo) {
            assertSubRangeInfo(range);
        }
    }
}
export function assertFontsInfo(o) {
    if (typeof o !== "object")
        throw new Error("FontsInfo must be an object");
    for (const key in o) {
        if (![
            "Column Header",
            "Age Label",
            "Uncertainty Label",
            "Zone Column Label",
            "Sequence Column Label",
            "Event Column Label",
            "Popup Body",
            "Ruler Label",
            "Point Column Scale Label",
            "Range Label",
            "Ruler Tick Mark Label",
            "Legend Title",
            "Legend Column Name",
            "Legend Column Source",
            "Range Box Label"
        ].includes(key))
            throwError("FontsInfo", `${key}`, "ValidFontOptions", o);
        if (typeof o.bold !== "boolean")
            throwError("FontsInfo", `${key}.bold`, "boolean", o.bold);
        if (typeof o.color !== "string")
            throwError("FontsInfo", `${key}.color`, "string", o.color);
        if (typeof o.fontFace !== "string")
            throwError("FontsInfo", `${key}.fontFace`, "string", o.fontFace);
        if (typeof o.inheritable !== "boolean")
            throwError("FontsInfo", `${key}.inheritable`, "boolean", o.inheritable);
        if (typeof o.italic !== "boolean")
            throwError("FontsInfo", "italic", `${key}.boolean`, o.italic);
        if (typeof o.size !== "number")
            throwError("FontsInfo", "size", `${key}.number`, o.size);
    }
}
export function assertMapHierarchy(o) {
    if (typeof o !== "object" || o === null)
        throw new Error("MapsHierarchy must be a non-null object");
    for (const key in o) {
        const map = o[key];
        if (!Array.isArray(map))
            throwError("MapHierarchy", `value for key ${key}`, "string array", map);
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
        if (typeof map.name !== "string")
            throwError("MapInfo", "name", "string", map.name);
        if (typeof map.img !== "string") {
            throw new Error(`MapInfo' value for key '${key}' must have an 'img' string property`);
        }
        if ("note" in map && typeof map.note !== "string") {
            throw new Error(`MapInfo' value for key '${key}' must have a 'note' string property`);
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
    return "upperLeftLon" in bounds && "upperLeftLat" in bounds && "lowerRightLat" in bounds && "lowerRightLon" in bounds;
}
export function isVertBounds(bounds) {
    return "centerLat" in bounds && "centerLon" in bounds && "height" in bounds && "scale" in bounds;
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
/**
 * throws an error `Object '${obj}' must have a '${variable}' ${type} property.\nFound value: ${value}`
 * @param obj
 * @param variable
 * @param type
 * @param value
 */
function throwError(obj, variable, type, value) {
    throw new Error(`Object '${obj}' must have a '${variable}' ${type} property.\nFound value: ${value}\n`);
}
export function assertTimescale(val) {
    if (!val || typeof val !== "object") {
        throwError("Timescale", "object", "of type object", val);
    }
    if (typeof val.key !== "string" || typeof val.value !== "number") {
        throwError("Timescale", "'key' of type string and 'value' of type number", "", val);
    }
}
//# sourceMappingURL=index.js.map