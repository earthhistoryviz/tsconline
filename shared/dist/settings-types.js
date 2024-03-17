import { assertFontsInfo, throwError } from "./index.js";
export function assertChartInfoTSC(o) {
    if (!o || typeof o !== "object")
        throw new Error("ChartInfoTSC must be a non-null object");
    if (!o["class datastore.RootColumn:Chart Root"])
        throw new Error("ChartInfoTSC must have a Chart Root");
    assertColumnInfoTSC(o["class datastore.RootColumn:Chart Root"]);
}
export function assertChartSettingsInfoTSC(o) {
    if (!o || typeof o !== "object")
        throw new Error("ChartSettingsInfoTSC must be a non-null object");
    if (o.topAge) {
        if (typeof o.topAge.source !== "string")
            throwError("topAge", "source", "string", o.topAge.source);
        if (typeof o.topAge.unit !== "string")
            throwError("topAge", "unit", "string", o.topAge.unit);
        if (typeof o.topAge.stage !== "string")
            throwError("topAge stage", "stage", "string", o.topAge.stage);
        if (typeof o.topAge.text !== "number")
            throwError("topAge", "text", "string", o.topAge.text);
    }
    else
        throw new Error("ColumnSettingsTSC must have a topAge property");
    if (o.baseAge) {
        if (typeof o.baseAge.source !== "string")
            throwError("baseAge", "source", "string", o.baseAge.source);
        if (typeof o.baseAge.unit !== "string")
            throwError("baseAge", "unit", "string", o.baseAge.unit);
        if (typeof o.baseAge.stage !== "string")
            throwError("baseAge stage", "stage", "string", o.baseAge.stage);
        if (typeof o.baseAge.text !== "number")
            throwError("baseAge", "text", "string", o.baseAge.text);
    }
    else
        throw new Error("ColumnSettingsTSC must have a baseAge property");
    if (o.unitsPerMY) {
        if (typeof o.unitsPerMY.unit !== "string")
            throwError("unitsPerMY", "unit", "string", o.unitsPerMY.unit);
        if (typeof o.unitsPerMY.text !== "number")
            throwError("unitsPerMY", "text", "number", o.unitsPerMY.text);
    }
    else
        throw new Error("ColumnSettingsTSC must have a unitsPerMY property");
    if (o.skipEmptyColumns) {
        if (typeof o.skipEmptyColumns.unit !== "string")
            throwError("skipEmptyColumns", "unit", "string", o.skipEmptyColumns.unit);
        if (typeof o.skipEmptyColumns.text !== "number")
            throwError("skipEmptyColumns", "text", "number", o.skipEmptyColumns.text);
    }
    else
        throw new Error("ColumnSettingsTSC must have a skipEmptyColumns property");
    if (typeof o.variableColors !== "string")
        throwError("ColumnSettingsInfo", "variableColors", "string", o.variableColors);
    if (typeof o.noIndentPattern !== "boolean")
        throwError("ColumnSettingsInfo", "noIndentPattern", "boolean", o.noIndentPattern);
    if (typeof o.negativeChk !== "boolean")
        throwError("ColumnSettingsInfo", "negativeChk", "boolean", o.negativeChk);
    if (typeof o.doPopups !== "boolean")
        throwError("ColumnSettingsInfo", "doPopups", "boolean", o.doPopups);
    if (typeof o.enEventColBG !== "boolean")
        throwError("ColumnSettingsInfo", "enEventColBG", "boolean", o.enEventColBG);
    if (typeof o.enChartLegend !== "boolean")
        throwError("ColumnSettingsInfo", "enChartLegend", "boolean", o.enChartLegend);
    if (typeof o.enPriority !== "boolean")
        throwError("ColumnSettingsInfo", "enPriority", "boolean", o.enPriority);
    if (typeof o.enHideBlockLable !== "boolean")
        throwError("ColumnSettingsInfo", "enHideBlockLable", "boolean", o.enHideBlockLable);
}
export function assertColumnInfoTSC(o) {
    if (!o || typeof o !== "object")
        throw new Error("ColumnInfoTSC must be a non-null object");
    if (typeof o._id !== "string")
        throwError("ColumnInfoTSC", "_id", "string", o._id);
    if (typeof o.title !== "string")
        throwError("ColumnInfoTSC", "title", "string", o.title);
    if (typeof o.useNamedColor !== "boolean")
        throwError("ColumnInfoTSC", "useNamedColor", "boolean", o.UseNamedColor);
    if (typeof o.placeHolder !== "boolean")
        throwError("ColumnInfoTSC", "placeHolder", "boolean", o.placeHolder);
    if (typeof o.drawTitle !== "boolean")
        throwError("ColumnInfoTSC", "drawTitle", "boolean", o.drawTitle);
    if (typeof o.drawAgeLabel !== "boolean")
        throwError("ColumnInfoTSC", "drawAgeLabel", "boolean", o.drawAgeLabel);
    if (typeof o.drawUncertaintyLabel !== "boolean")
        throwError("ColumnInfoTSC", "drawUncertaintlyLabel", "boolean", o.drawUncertaintyLabel);
    if (typeof o.isSelected !== "boolean")
        throwError("ColumnInfoTSC", "isSelected", "boolean", o.isSelected);
    if (typeof o.width !== "number")
        throwError("ColumnInfoTSC", "width", "number", o.width);
    if (typeof o.pad !== "number")
        throwError("ColumnInfoTSC", "pad", "number", o.pad);
    if (typeof o["age pad"] !== "number")
        throwError("ColumnInfoTSC", "age pad", "number", o["age pad"]);
    if (o.backgroundColor) {
        if ("standardized" in o.backgroundColor) {
            if (typeof o.backgroundColor.standardized !== "boolean")
                throwError("ColumnInfoTSC backgroundColor", "standardized", "boolean", o.backgroundColor.standardized);
        }
        if ("useNamed" in o.backgroundColor) {
            if (typeof o.backgroundColor.useNamed !== "boolean")
                throwError("ColumnInfoTSC backgroundColor", "useNamed", "boolean", o.backgroundColor.useNamed);
        }
        if (typeof o.backgroundColor.text !== "string")
            throwError("ColumnInfoTSC backgroundColor", "text", "string", o.backgroundColor.text);
    }
    else
        throw new Error("ColumnInfoTSC must have backgroundColor");
    if (o.customColor) {
        if ("standardized" in o.customColor) {
            if (typeof o.customColor.standardized !== "boolean")
                throwError("ColumnInfoTSC customColor", "standardized", "boolean", o.customColor.standardized);
        }
        if ("useNamed" in o.customColor) {
            if (typeof o.customColor.useNamed !== "boolean")
                throwError("ColumnInfoTSC customColor", "useNamed", "boolean", o.customColor.standardized);
            if (typeof o.customColor.text !== "string")
                throwError("ColumnInfoTSC customColor", "text", "string", o.customColor.standardized);
        }
        else
            throw new Error("ColumnInfoTSC must have customColor");
        //TODO add fonts info assert here
        assertFontsInfo(o.fonts);
        for (const key in o) {
            switch (key) {
                //boolean
                case "useNamedColor":
                case "placeHolder":
                case "drawTitle":
                case "drawAgeLabel":
                case "drawUncertaintyLabel":
                case "isSelected":
                case "autoFlip":
                case "drawNameLabel":
                case "drawPoints":
                case "drawLine":
                case "drawSmooth":
                case "drawFill":
                case "doNotSetWindowAuto":
                case "drawScale":
                case "drawBgrndGradient":
                case "drawCurveGradient":
                case "flipScale":
                    if (typeof o[key] !== "boolean") {
                        throwError("ColumnInfoTSC", key, "boolean", o[key]);
                    }
                    break;
                //string
                case "rangeSort":
                case "graphStyle":
                case "lineColor":
                case "fillColor":
                case "backGradStart":
                case "backGradEnd":
                case "curveGradStart":
                case "curveGradEnd":
                    if (typeof o[key] !== "string") {
                        throwError("ColumnInfoTSC", key, "string", o[key]);
                    }
                    break;
                //number
                case "crunchOuterMargin":
                case "crunchInnerMargin":
                case "crunchAscendWidth":
                case "crunchOneSideSpaceUse":
                case "labelMarginLeft":
                case "labelMarginRight":
                case "minWindow":
                case "maxWindow":
                case "scaleStart":
                case "scaleStep":
                    if (typeof o[key] !== "number") {
                        throwError("ColumnInfoTSC", key, "number", o[key]);
                    }
                    break;
                //special cases
                case "orientation":
                    if (!["vertical", "normal"].includes(o[key])) {
                        throwError("ColumnInfoTSC", key, "vertical or normal", o[key]);
                    }
                    break;
                case "justification":
                    if (!["left", "right"].includes(o[key])) {
                        throwError("ColumnInfoTSC", key, "left or right", o[key]);
                    }
                    break;
                case "pointType":
                    if (!["rect", "round", "tick"].includes(o[key])) {
                        throwError("ColumnInfoTSC", key, "rect, round, or tick", o[key]);
                    }
            }
        }
        if ("children" in o) {
            for (let i = 0; i < o.children.length; i++) {
                assertColumnInfoTSC(o.children[i]);
            }
        }
    }
}
//# sourceMappingURL=settings-types.js.map