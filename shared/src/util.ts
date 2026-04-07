import {
  DatapackMetadata,
  ColumnInfo,
  ColumnInfoTSC,
  ChartInfoTSC,
  assertChartInfoTSC,
  assertChronSettings,
  assertEventSettings,
  assertPointColumnInfoTSC,
  assertPointSettings,
  assertRangeSettings,
  assertRulerColumnInfoTSC,
  assertRulerSettings,
  assertSequenceColumnInfoTSC,
  assertSequenceSettings,
  assertZoneColumnInfoTSC,
  assertZoneSettings,
  defaultChartSettingsInfoTSC,
  defaultChronColumnInfoTSC,
  defaultColumnBasicInfoTSC,
  defaultEventColumnInfoTSC,
  defaultFontsInfo,
  defaultPointColumnInfoTSC,
  defaultRangeColumnInfoTSC,
  defaultRulerColumnInfoTSC,
  defaultSequenceColumnInfoTSC,
  defaultZoneColumnInfoTSC,
  convertPointShapeToPointType,
  DisplayedColumnTypes,
  FontsInfo,
  RGB,
  isRGB
} from "./index.js";
import lodash from "lodash";
const { cloneDeep } = lodash;

export function roundToDecimalPlace(value: number, decimalPlace: number) {
  const factor = Math.pow(10, decimalPlace);
  return Math.round(value * factor) / factor;
}

export function calculateAutoScale(min: number, max: number) {
  const margin = 0.1;
  const outerMargin = ((max - min) * margin) / 2;
  const lowerRange = roundToDecimalPlace(min - outerMargin, 3);
  const upperRange = roundToDecimalPlace(max + outerMargin, 3);
  const scaleStep = roundToDecimalPlace((upperRange - lowerRange) * 0.2, 3);
  const scaleStart = 0;
  return { lowerRange, upperRange, scaleStep, scaleStart };
}

/**
 * Gets the workshop UUID from a workshop ID
 * @param workshopId
 * @returns
 */
export function getWorkshopUUIDFromWorkshopId(workshopId: number): string {
  return `workshop-${workshopId}`;
}

export function checkUserAllowedDownloadDatapack(user: { isAdmin: boolean; uuid: string }, datapack: DatapackMetadata) {
  if (user.isAdmin || datapack.isPublic || (datapack.type === "user" && datapack.uuid === user.uuid)) {
    return true;
  }
  return false;
}

/**
 * for escaping special characters in xml (& " ' < >)
 * in text, " ' > do not need to be escaped.
 * in attributes, all 5 need to be escaped.
 * https://stackoverflow.com/questions/1091945/what-characters-do-i-need-to-escape-in-xml-documents
 *
 * @param text the text to replace special chars
 * @param type attribute or text,
 * @returns
 */

export function escapeHtmlChars(text: string, type: "attribute" | "text"): string {
  if (!text) return text;

  let escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;");

  if (type === "attribute") {
    escaped = escaped.replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  }

  return escaped;
}

export function attachTscPrefixToName(name: string, displayType: DisplayedColumnTypes): string {
  switch (displayType) {
    case "RootColumn":
    case "MetaColumn":
    case "BlockSeriesMetaColumn":
      return `class datastore.${displayType}:` + name;
    default:
      return `class datastore.${displayType}Column:` + name;
  }
}

export function translateColumnInfoToColumnInfoTSC(state: ColumnInfo): ColumnInfoTSC {
  let column: ColumnInfoTSC = cloneDeep(defaultColumnBasicInfoTSC);
  switch (state.columnDisplayType) {
    case "Event":
      //can't set it equal to default because it becomes reference to object
      assertEventSettings(state.columnSpecificSettings);
      column = {
        ...cloneDeep(defaultEventColumnInfoTSC),
        type: state.columnSpecificSettings.type,
        rangeSort: state.columnSpecificSettings.rangeSort,
        drawExtraColumn: state.columnSpecificSettings.frequency,
        windowSize: state.columnSpecificSettings.windowSize,
        stepSize: state.columnSpecificSettings.stepSize,
        isDualColCompColumn: state.columnSpecificSettings.dualColCompColumnRef ? true : false,
        drawDualColCompColumn: state.columnSpecificSettings.drawDualColCompColumn
      };
      break;
    case "Zone":
      assertZoneSettings(state.columnSpecificSettings);
      column = {
        ...cloneDeep(defaultZoneColumnInfoTSC),
        orientation: state.columnSpecificSettings.orientation
      };
      break;
    case "Sequence":
      assertSequenceSettings(state.columnSpecificSettings);
      column = {
        ...cloneDeep(defaultSequenceColumnInfoTSC),
        labelMarginLeft: state.columnSpecificSettings.labelMarginLeft,
        labelMarginRight: state.columnSpecificSettings.labelMarginRight,
        graphStyle: state.columnSpecificSettings.graphStyle,
        drawNameLabel: state.columnSpecificSettings.drawNameLabel,
        type: state.columnSpecificSettings.type
      };

      break;
    case "Range":
      assertRangeSettings(state.columnSpecificSettings);
      column = {
        ...cloneDeep(defaultRangeColumnInfoTSC),
        pad: state.columnSpecificSettings.margin,
        "age pad": state.columnSpecificSettings.agePad,
        rangeSort: state.columnSpecificSettings.rangeSort
      };
      break;
    case "Ruler":
      if (state.name != "Ma" && state.name != "Chart Root" && state.name != state.units.split(" ")[0]) {
        // console.log(state.name);
        assertRulerSettings(state.columnSpecificSettings);
        column = { ...cloneDeep(defaultRulerColumnInfoTSC), justification: state.columnSpecificSettings.justification };
      } else {
        column = cloneDeep(defaultRulerColumnInfoTSC);
      }

      break;

    case "Point":
      assertPointSettings(state.columnSpecificSettings);
      column = {
        ...cloneDeep(defaultPointColumnInfoTSC),
        pointType: convertPointShapeToPointType(state.columnSpecificSettings.pointShape),
        drawPoints: state.columnSpecificSettings.pointShape !== "nopoints",
        drawLine: state.columnSpecificSettings.drawLine,
        lineColor: state.columnSpecificSettings.lineColor,
        drawSmooth: state.columnSpecificSettings.smoothed,
        drawFill: state.columnSpecificSettings.drawFill,
        fillColor: state.columnSpecificSettings.fill,
        minWindow: state.columnSpecificSettings.lowerRange,
        maxWindow: state.columnSpecificSettings.upperRange,
        drawScale: state.columnSpecificSettings.drawScale,
        drawBgrndGradient: state.columnSpecificSettings.drawBackgroundGradient,
        backGradStart: state.columnSpecificSettings.backgroundGradientStart,
        backGradEnd: state.columnSpecificSettings.backgroundGradientEnd,
        drawCurveGradient: state.columnSpecificSettings.drawCurveGradient,
        curveGradStart: state.columnSpecificSettings.curveGradientStart,
        curveGradEnd: state.columnSpecificSettings.curveGradientEnd,
        flipScale: state.columnSpecificSettings.flipScale,
        scaleStart: state.columnSpecificSettings.scaleStart,
        scaleStep: state.columnSpecificSettings.scaleStep,
        drawExtraColumn: state.columnSpecificSettings.dataMiningPointDataType,
        windowSize: state.columnSpecificSettings.windowSize,
        stepSize: state.columnSpecificSettings.stepSize,
        isDataMiningColumn: state.columnSpecificSettings.isDataMiningColumn,
        isDualColCompColumn: state.columnSpecificSettings.dualColCompColumnRef ? true : false,
        drawDualColCompColumn: state.columnSpecificSettings.drawDualColCompColumn
      };
      break;
    case "Chron":
      assertChronSettings(state.columnSpecificSettings);
      column = {
        ...cloneDeep(defaultChronColumnInfoTSC),
        drawExtraColumn: state.columnSpecificSettings.dataMiningChronDataType,
        windowSize: state.columnSpecificSettings.windowSize,
        stepSize: state.columnSpecificSettings.stepSize
      };
      break;
  }
  column._id = attachTscPrefixToName(state.name, state.columnDisplayType);
  column.title = escapeHtmlChars(state.editName, "text");
  column.isSelected = state.on;
  column.drawTitle = state.enableTitle;
  column.fonts = state.fontsInfo;
  column.width = state.width;
  column.backgroundColor.text!.r = state.rgb.r;
  column.backgroundColor.text!.g = state.rgb.g;
  column.backgroundColor.text!.b = state.rgb.b;
  column.customColor.text!.r = state.rgb.r;
  column.customColor.text!.g = state.rgb.g;
  column.customColor.text!.b = state.rgb.b;
  column.children = [];
  if (state.showAgeLabels) column.drawAgeLabel = state.showAgeLabels;
  if (state.showUncertaintyLabels) column.drawUncertaintyLabel = state.showUncertaintyLabels;
  for (let i = 0; i < state.children.length; i++) {
    column.children.push(translateColumnInfoToColumnInfoTSC(state.children[i]!));
  }
  return column;
}

/**
 *
 * @param fonts font json object
 * @param indent the amount of indent to place in the xml file
 * @returns xml string with fonts info
 */
export function generateFontsXml(indent: string, fontsInfo?: FontsInfo): string {
  if (!fontsInfo) return "";

  const defInfo = JSON.parse(JSON.stringify(defaultFontsInfo));
  let xml = "";

  for (const key in fontsInfo) {
    const fontTarget = fontsInfo[key as keyof FontsInfo];
    if (!fontTarget.on || JSON.stringify(fontTarget) === JSON.stringify(defInfo[key])) {
      xml += `${indent}<font function="${key}" inheritable="${fontTarget.inheritable}"/>\n`;
    } else {
      xml += `${indent}<font function="${key}" inheritable="${fontTarget.inheritable}">`;
      xml += `font-family: ${fontTarget.fontFace};`;
      xml += ` font-size: ${fontTarget.size};`;
      if (fontTarget.italic) xml += ` font-style: italic;`;
      if (fontTarget.bold) xml += ` font-weight: bold;`;
      xml += ` fill: ${fontTarget.color};`;
      xml += `</font>\n`;
    }
  }

  return xml;
}

/**
 * Convert ColumnInfo to ChartInfoTSC
 */
export function columnInfoToSettingsTSC(state: ColumnInfo): ChartInfoTSC {
  const settingsTSC: ChartInfoTSC = {
    "class datastore.RootColumn:Chart Root": translateColumnInfoToColumnInfoTSC(state),
    settings: JSON.parse(JSON.stringify(defaultChartSettingsInfoTSC))
  };
  assertChartInfoTSC(settingsTSC);
  return settingsTSC;
}

/**
 * Find serial number in a string (e.g., "Blank 2 for X" returns 2)
 */
export function findSerialNum(str: string): number {
  const match = str.match(/\d+/);
  return match ? parseInt(match[0]) : 0;
}

/**
 * Extract column type from _id (e.g., "class datastore.EventColumn:Name" returns "EventColumn")
 */
export function extractColumnType(text: string): string | undefined {
  if (text.indexOf(".") === -1 || text.indexOf(":") === -1) {
    return undefined;
  }
  return text.substring(text.indexOf(".") + 1, text.indexOf(":"));
}

/**
 * Convert RGB object to string format
 */
export function convertRgbToString(rgb: RGB): string {
  return `rgb(${rgb.r},${rgb.g},${rgb.b})`;
}

export function columnInfoTSCToXml(column: ColumnInfoTSC, indent: string): string {
  let xml = "";

  for (const key in column) {
    const keyValue = column[key as keyof ColumnInfoTSC];

    if (key === "_id") continue;

    if (key === "title") {
      let title = column[key];
      if (/^Age \d+ for .+$/.test(column[key])) {
        title = "Age";
      } else if (/^Blank \d+ for .+$/.test(column[key])) {
        title = "Blank " + findSerialNum(column[key]);
      }
      xml += `${indent}<setting name="title">${title}</setting>\n`;
    } else if (key === "backgroundColor") {
      if (column.backgroundColor.text) {
        if (
          column.backgroundColor.text.r === 255 &&
          column.backgroundColor.text.g === 255 &&
          column.backgroundColor.text.b === 255
        ) {
          if (extractColumnType(column._id) === "SequenceColumn" || extractColumnType(column._id) === "EventColumn") {
            xml += `${indent}<setting name="backgroundColor" useNamed="false">rgb(255, 255, 255)</setting>\n`;
          } else {
            xml += `${indent}<setting name="backgroundColor"/>\n`;
          }
        } else {
          xml += `${indent}<setting name="backgroundColor" useNamed="false">rgb(${column.backgroundColor.text.r},${column.backgroundColor.text.g},${column.backgroundColor.text.b})</setting>\n`;
        }
      } else {
        xml += `${indent}<setting name="backgroundColor"/>\n`;
      }
    } else if (key === "customColor") {
      if (column.customColor.text) {
        xml += `${indent}<setting name="customColor" useNamed="false">rgb(${column.customColor.text.r},${column.customColor.text.g},${column.customColor.text.b})</setting>\n`;
      } else {
        xml += `${indent}<setting name="customColor"/>\n`;
      }
    } else if (key === "width") {
      if (column.width) {
        xml += `${indent}<setting name="width">${column.width}</setting>\n`;
      }
    } else if (key === "fonts") {
      xml += `${indent}<fonts>\n`;
      xml += generateFontsXml(`${indent}    `, column.fonts);
      xml += `${indent}</fonts>\n`;
    } else if (key === "children") {
      for (const child of column.children) {
        const isDataMiningColumn =
          "isDataMiningColumn" in child && child.isDataMiningColumn === true
            ? ` isDataMiningColumn="${child.isDataMiningColumn}"`
            : "";
        const isDualColCompColumn =
          "isDualColCompColumn" in child && child.isDualColCompColumn === true
            ? ` isDualColCompColumn="${child.isDualColCompColumn}"`
            : "";
        xml += `${indent}<column id="${escapeHtmlChars(child._id, "attribute")}"${isDataMiningColumn}${isDualColCompColumn}>\n`;
        xml += columnInfoTSCToXml(child, `${indent}    `);
        xml += `${indent}</column>\n`;
      }
    } else if (key === "justification") {
      assertRulerColumnInfoTSC(column);
      xml += `${indent}<setting justification="${column.justification}" name="justification"/>\n`;
    } else if (key === "orientation") {
      assertZoneColumnInfoTSC(column);
      xml += `${indent}<setting name="orientation" orientation="${column.orientation}"/>\n`;
    } else if (key === "pointType") {
      assertPointColumnInfoTSC(column);
      xml += `${indent}<setting name="pointType" pointType="${column.pointType}"/>\n`;
    } else if (
      (key === "drawExtraColumn" && !keyValue) ||
      key === "isDataMiningColumn" ||
      key === "isDualColCompColumn"
    ) {
      continue;
    } else if (key === "type" && extractColumnType(column._id) === "SequenceColumn") {
      assertSequenceColumnInfoTSC(column);
      xml += `${indent}<setting name="type" type="${column.type}"/>\n`;
    } else if (isRGB(keyValue)) {
      xml += `${indent}<setting name="${key}">${convertRgbToString(keyValue)}</setting>\n`;
    } else if (key === "drawDualColCompColumn") {
      if (typeof keyValue !== "string") continue;
      xml += `${indent}<setting name="${key}">${escapeHtmlChars(keyValue, "attribute")}</setting>\n`;
    } else {
      xml += `${indent}<setting name="${key}">${keyValue}</setting>\n`;
    }
  }

  return xml;
}

export function buildTscXmlDocument(state: ColumnInfo, settingsXml: string, version: string = "PRO8.1"): string {
  const settingsTSC = columnInfoToSettingsTSC(state);

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<TSCreator version="${version}">\n`;
  xml += '    <settings version="1.0">\n';
  xml += settingsXml;
  xml += "    </settings>\n";
  xml += '    <column id="class datastore.RootColumn:Chart Root">\n';
  xml += columnInfoTSCToXml(settingsTSC["class datastore.RootColumn:Chart Root"], "        ");
  xml += "    </column>\n";
  xml += "</TSCreator>";
  return xml;
}
