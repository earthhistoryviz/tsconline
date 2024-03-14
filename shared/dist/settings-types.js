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
            throw new Error("topAge source must be a string");
        if (typeof o.topAge.unit !== "string")
            throw new Error("topAge unit must be a string");
        if (typeof o.topAge.stage !== "string")
            throw new Error("topAge stage must be a string");
        if (typeof o.topAge.text !== "number")
            throw new Error("topAge text must be a string");
    }
    else
        throw new Error("ColumnSettingsTSC must have a topAge property");
    if (o.baseAge) {
        if (typeof o.baseAge.source !== "string")
            throw new Error("baseAge source must be a string");
        if (typeof o.baseAge.unit !== "string")
            throw new Error("baseAge unit must be a string");
        if (typeof o.baseAge.stage !== "string")
            throw new Error("baseAge stage must be a string");
        if (typeof o.baseAge.text !== "number")
            throw new Error("baseAge text must be a string");
    }
    else
        throw new Error("ColumnSettingsTSC must have a baseAge property");
    if (o.unitsPerMY) {
        if (typeof o.unitsPerMY.unit !== "string")
            throw new Error("unitsPerMY unit must be a string");
        if (typeof o.unitsPerMY.text !== "number")
            throw new Error("unitsPerMY text must be a string");
    }
    else
        throw new Error("ColumnSettingsTSC must have a unitsPerMY property");
    if (o.skipEmptyColumns) {
        if (typeof o.skipEmptyColumns.unit !== "string")
            throw new Error("skipEmptyColumns unit must be a string");
        if (typeof o.skipEmptyColumns.text !== "number")
            throw new Error("skipEmptyColumns text must be a string");
    }
    else
        throw new Error("ColumnSettingsTSC must have a skipEmptyColumns property");
    if (typeof o.variableColors !== "string")
        throw new Error("ColumnSettingsInfo must have variableColors with type string");
    if (typeof o.noIndentPattern !== "boolean")
        throw new Error("ColumnSettingsInfo must have noINdentPattern with type boolean");
    if (typeof o.negativeChk !== "boolean")
        throw new Error("ColumnSettingsInfo must have negativeChk with type boolean");
    if (typeof o.doPopups !== "boolean")
        throw new Error("ColumnSettingsInfo must have doPopups with type boolean");
    if (typeof o.enEventColBG !== "boolean")
        throw new Error("ColumnSettingsInfo must have enEventColBG with type boolean");
    if (typeof o.enChartLegend !== "boolean")
        throw new Error("ColumnSettingsInfo must have enChartLegend with type boolean");
    if (typeof o.enPriority !== "boolean")
        throw new Error("ColumnSettingsInfo must have enPriority with type boolean");
    if (typeof o.enHideBlockLable !== "boolean")
        throw new Error("ColumnSettingsInfo must have enHideBlockLable with type boolean");
}
export function assertColumnInfoTSC(o) {
    if (!o || typeof o !== "object")
        throw new Error("ColumnInfoTSC must be a non-null object");
    if (typeof o._id !== "string")
        throw new Error("ColumnInfoTSC must have _id with type string");
    if (typeof o.title !== "string")
        throw new Error("ColumnInfoTSC must have title with type string");
    if (typeof o.useNamedColor !== "boolean")
        throw new Error("ColumnInfoTSC must have title with type boolean");
    if (typeof o.placeHolder !== "boolean")
        throw new Error("ColumnInfoTSC must have title with type boolean");
    if (typeof o.drawTitle !== "boolean")
        throw new Error("ColumnInfoTSC must have title with type boolean");
    if (typeof o.drawAgeLabel !== "boolean")
        throw new Error("ColumnInfoTSC must have title with type boolean");
    if (typeof o.drawUncertaintyLabel !== "boolean")
        throw new Error("ColumnInfoTSC must have title with type boolean");
    if (typeof o.isSelected !== "boolean")
        throw new Error("ColumnInfoTSC must have title with type boolean");
    if (typeof o.width !== "number")
        throw new Error("ColumnInfoTSC must have title with type number");
    if (typeof o.pad !== "number")
        throw new Error("ColumnInfoTSC must have title with type number");
    if (typeof o["age pad"] !== "number")
        throw new Error("ColumnInfoTSC must have age pad with type number");
    if (o.backgroundColor) {
        if ("standardized" in o.backgroundColor) {
            if (typeof o.backgroundColor.standardized !== "boolean")
                throw new Error("ColumnInfoTSC backgroundColor standardized must have type boolean");
        }
        if ("useNamed" in o.backgroundColor) {
            if (typeof o.backgroundColor.useNamed !== "boolean")
                throw new Error("ColumnInfoTSC backgroundColor useNamed must have type boolean");
        }
        if (typeof o.backgroundColor.text !== "string")
            throw new Error("ColumnInfoTSC backgroundColor must have text with type string");
    }
    else
        throw new Error("ColumnInfoTSC must have backgroundColor");
    if (o.customColor) {
        if ("standardized" in o.customColor) {
            if (typeof o.customColor.standardized !== "boolean")
                throw new Error("ColumnInfoTSC customColor standardized must have type boolean");
        }
        if ("useNamed" in o.customColor) {
            if (typeof o.customColor.useNamed !== "boolean")
                throw new Error("ColumnInfoTSC customColor useNamed must have type boolean");
        }
        if (typeof o.customColor.text !== "string")
            throw new Error("ColumnInfoTSC customColor must have text with type string");
    }
    else
        throw new Error("ColumnInfoTSC must have customColor");
    //TODO add fonts info assert here
    if ("crunchOuterMargin" in o) {
        if (typeof o.crunchOuterMargin !== "number")
            throw new Error("ColumnInfoTSC crunchOuterMargin must have type number");
    }
    if ("crunchInnerMargin" in o) {
        if (typeof o.crunchInnerMargin !== "number")
            throw new Error("ColumnInfoTSC crunchInnerMargin must have type number");
    }
    if ("crunchAscendWidth" in o) {
        if (typeof o.crunchAscendWidth !== "number")
            throw new Error("ColumnInfoTSC crunchAscendWidth must have type number");
    }
    if ("crunchOneSideSpaceUse" in o) {
        if (typeof o.crunchOneSideSpaceUse !== "number")
            throw new Error("ColumnInfoTSC crunchOneSideSpaceUse must have type number");
    }
    if ("autoFlip" in o) {
        if (typeof o.autoFlip !== "boolean")
            throw new Error("ColumnInfoTSC autoFlip must have type boolean");
    }
    if ("orientation" in o) {
        if (o.orientation !== "vertical" || o.orientation !== "normal")
            throw new Error("ColumnInfoTSC orientation must be vertical or normal");
    }
    if ("type" in o) {
        if (typeof o.type !== "string")
            throw new Error("ColumnInfoTSC type must have type string");
    }
    if ("rangeSort" in o) {
        if (typeof o.rangeSort !== "string")
            throw new Error("ColumnInfoTSC rangeSort must have type string");
    }
    if ("justification" in o) {
        if (o.orientation !== "left" || o.orientation !== "right")
            throw new Error("ColumnInfoTSC orientation must be left or right");
    }
    if ("labelMarginLeft" in o) {
        if (typeof o.labelMarginLeft !== "number")
            throw new Error("ColumnInfoTSC labelMarginLeft must have type number");
    }
    if ("labelMarginRight" in o) {
        if (typeof o.labelMarginRight !== "number")
            throw new Error("ColumnInfoTSC labelMarginRight must have type number");
    }
    if ("graphStyle" in o) {
        if (typeof o.graphStyle !== "string")
            throw new Error("ColumnInfoTSC graphStyle must have type string");
    }
    if ("drawNameLabel" in o) {
        if (typeof o.drawNameLabel !== "boolean")
            throw new Error("ColumnInfoTSC drawNameLabel must have type number");
    }
    for (const key in o) {
        if (o.hasOwnProperty(key)) {
            switch (key) {
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
                        throw new Error(`ColumnInfoTSC ${key} must have type boolean`);
                    }
                    break;
                case "lineColor":
                case "fillColor":
                case "backGradStart":
                case "backGradEnd":
                case "curveGradStart":
                case "curveGradEnd":
                    if (typeof o[key] !== "string") {
                        throw new Error(`ColumnInfoTSC ${key} must have type string`);
                    }
                    break;
                case "minWindow":
                case "maxWindow":
                case "scaleStart":
                case "scaleStep":
                    if (typeof o[key] !== "number") {
                        throw new Error(`ColumnInfoTSC ${key} must have type number`);
                    }
                    break;
                case "pointType":
                    if (!["rect", "round", "tick"].includes(o[key])) {
                        throw new Error(`ColumnInfoTSC ${key} must have value "rect", "round", or "tick"`);
                    }
                    break;
            }
        }
    }
    if ("children" in o) {
        throw new Error("ColumnInfoTSC must have children");
    }
    else {
        for (const child in o.children) {
            assertColumnInfoTSC(child);
        }
    }
}
//# sourceMappingURL=settings-types.js.map