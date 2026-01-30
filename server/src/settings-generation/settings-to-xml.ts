import {
  ColumnInfo,
  ColumnInfoTSC,
  ChartInfoTSC,
  ChartSettingsInfoTSC,
  FontsInfo,
  assertEventSettings,
  assertZoneSettings,
  assertSequenceSettings,
  assertRangeSettings,
  assertRulerSettings,
  assertPointSettings,
  assertChronSettings,
  assertRulerColumnInfoTSC,
  assertZoneColumnInfoTSC,
  assertPointColumnInfoTSC,
  assertSequenceColumnInfoTSC,
  assertChartInfoTSC,
  convertPointShapeToPointType,
  defaultChartSettingsInfoTSC,
  defaultColumnBasicInfoTSC,
  defaultEventColumnInfoTSC,
  defaultChronColumnInfoTSC,
  defaultZoneColumnInfoTSC,
  defaultSequenceColumnInfoTSC,
  defaultRangeColumnInfoTSC,
  defaultRulerColumnInfoTSC,
  defaultPointColumnInfoTSC,
  defaultFontsInfo,
  isRGB,
  RGB
} from "@tsconline/shared";
import _ from "lodash";

/**
 * Escape HTML special characters in strings for XML output
 */
function escapeHtmlChars(str: string, type: "text" | "attribute"): string {
  if (!str) return str;
  let escaped = str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  if (type === "attribute") {
    escaped = escaped.replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  }
  return escaped;
}

/**
 * Convert RGB object to string format
 */
function convertRgbToString(rgb: RGB): string {
  return `rgb(${rgb.r},${rgb.g},${rgb.b})`;
}

/**
 * Find serial number in a string (e.g., "Blank 2 for X" returns 2)
 */
function findSerialNum(str: string): number {
  const match = str.match(/\d+/);
  return match ? parseInt(match[0]) : 0;
}

/**
 * Extract column type from _id (e.g., "class datastore.EventColumn:Name" returns "EventColumn")
 */
function extractColumnType(text: string): string | undefined {
  if (text.indexOf(".") === -1 || text.indexOf(":") === -1) {
    return undefined;
  }
  return text.substring(text.indexOf(".") + 1, text.indexOf(":"));
}

/**
 * Attach TSC prefix to column name based on type
 */
function attachTscPrefixToName(name: string, columnDisplayType: string): string {
  let prefix = "";
  switch (columnDisplayType) {
    case "Event":
      prefix = "class datastore.EventColumn:";
      break;
    case "Zone":
      prefix = "class datastore.ZoneColumn:";
      break;
    case "Sequence":
      prefix = "class datastore.SequenceColumn:";
      break;
    case "Range":
      prefix = "class datastore.RangeColumn:";
      break;
    case "Ruler":
      prefix = "class datastore.RulerColumn:";
      break;
    case "Point":
      prefix = "class datastore.PointColumn:";
      break;
    case "Chron":
      prefix = "class datastore.ChronColumn:";
      break;
    case "Facies":
      prefix = "class datastore.FaciesColumn:";
      break;
    case "BlockSeriesMetaColumn":
      prefix = "class datastore.BlockSeriesMetaColumn:";
      break;
    case "MetaColumn":
      prefix = "class datastore.MetaColumn:";
      break;
    case "RootColumn":
      prefix = "class datastore.RootColumn:";
      break;
    default:
      prefix = "class datastore.Column:";
  }
  return prefix + name;
}

/**
 * Generate XML for chart settings
 */
export function generateSettingsXml(settings: ChartSettingsInfoTSC, indent: string): string {
  let xml = "";

  // Top age settings
  if (settings.topAge && Array.isArray(settings.topAge)) {
    for (const age of settings.topAge) {
      xml += `${indent}<setting name="topAge" source="${age.source}" unit="${age.unit}">\n`;
      if (age.stage) xml += `${indent}    <setting name="stage">${age.stage}</setting>\n`;
      if (age.text !== undefined) xml += `${indent}    <setting name="text">${age.text}</setting>\n`;
      xml += `${indent}</setting>\n`;
    }
  }

  // Base age settings
  if (settings.baseAge && Array.isArray(settings.baseAge)) {
    for (const age of settings.baseAge) {
      xml += `${indent}<setting name="baseAge" source="${age.source}" unit="${age.unit}">\n`;
      if (age.stage) xml += `${indent}    <setting name="stage">${age.stage}</setting>\n`;
      if (age.text !== undefined) xml += `${indent}    <setting name="text">${age.text}</setting>\n`;
      xml += `${indent}</setting>\n`;
    }
  }

  // Units per MY
  if (settings.unitsPerMY && Array.isArray(settings.unitsPerMY)) {
    for (const unit of settings.unitsPerMY) {
      xml += `${indent}<setting name="unitsPerMY" unit="${unit.unit}">${unit.text}</setting>\n`;
    }
  }

  // Skip empty columns
  if (settings.skipEmptyColumns && Array.isArray(settings.skipEmptyColumns)) {
    for (const skip of settings.skipEmptyColumns) {
      xml += `${indent}<setting name="skipEmptyColumns" unit="${skip.unit}">${skip.text}</setting>\n`;
    }
  }

  // Other settings
  xml += `${indent}<setting name="variableColors">${settings.variableColors || ""}</setting>\n`;
  xml += `${indent}<setting name="noIndentPattern">${settings.noIndentPattern || false}</setting>\n`;
  xml += `${indent}<setting name="negativeChk">${settings.negativeChk || false}</setting>\n`;
  xml += `${indent}<setting name="doPopups">${settings.doPopups || false}</setting>\n`;
  xml += `${indent}<setting name="enEventColBG">${settings.enEventColBG || false}</setting>\n`;
  xml += `${indent}<setting name="enChartLegend">${settings.enChartLegend || false}</setting>\n`;
  xml += `${indent}<setting name="enPriority">${settings.enPriority || false}</setting>\n`;
  xml += `${indent}<setting name="enHideBlockLable">${settings.enHideBlockLable || false}</setting>\n`;

  return xml;
}

/**
 * Generate XML for fonts
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
 * Convert ColumnInfo to ColumnInfoTSC
 */
export function translateColumnInfoToColumnInfoTSC(state: ColumnInfo): ColumnInfoTSC {
  let column: ColumnInfoTSC = _.cloneDeep(defaultColumnBasicInfoTSC);

  switch (state.columnDisplayType) {
    case "Event":
      assertEventSettings(state.columnSpecificSettings);
      column = {
        ..._.cloneDeep(defaultEventColumnInfoTSC),
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
        ..._.cloneDeep(defaultZoneColumnInfoTSC),
        orientation: state.columnSpecificSettings.orientation
      };
      break;
    case "Sequence":
      assertSequenceSettings(state.columnSpecificSettings);
      column = {
        ..._.cloneDeep(defaultSequenceColumnInfoTSC),
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
        ..._.cloneDeep(defaultRangeColumnInfoTSC),
        pad: state.columnSpecificSettings.margin,
        "age pad": state.columnSpecificSettings.agePad,
        rangeSort: state.columnSpecificSettings.rangeSort
      };
      break;
    case "Ruler":
      if (state.name !== "Ma" && state.name !== "Chart Root" && state.name !== state.units.split(" ")[0]) {
        assertRulerSettings(state.columnSpecificSettings);
        column = {
          ..._.cloneDeep(defaultRulerColumnInfoTSC),
          justification: state.columnSpecificSettings.justification
        };
      } else {
        column = _.cloneDeep(defaultRulerColumnInfoTSC);
      }
      break;
    case "Point":
      assertPointSettings(state.columnSpecificSettings);
      column = {
        ..._.cloneDeep(defaultPointColumnInfoTSC),
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
        ..._.cloneDeep(defaultChronColumnInfoTSC),
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
  column.backgroundColor.text = {
    r: state.rgb.r,
    g: state.rgb.g,
    b: state.rgb.b
  };
  column.customColor.text = {
    r: state.rgb.r,
    g: state.rgb.g,
    b: state.rgb.b
  };
  column.children = [];
  if (state.showAgeLabels) column.drawAgeLabel = state.showAgeLabels;
  if (state.showUncertaintyLabels) column.drawUncertaintyLabel = state.showUncertaintyLabels;

  for (let i = 0; i < state.children.length; i++) {
    column.children.push(translateColumnInfoToColumnInfoTSC(state.children[i]!));
  }

  return column;
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
 * Convert ColumnInfoTSC to XML
 */
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

/**
 * Main function to convert ColumnInfo to XML settings
 */
export function jsonToXml(state: ColumnInfo, settings: ChartSettingsInfoTSC, version: string = "PRO8.1"): string {
  const settingsTSC = columnInfoToSettingsTSC(state);

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<TSCreator version="${version}">\n`;
  xml += '    <settings version="1.0">\n';
  xml += generateSettingsXml(settings, "        ");
  xml += "    </settings>\n";
  xml += '    <column id="class datastore.RootColumn:Chart Root">\n';
  xml += columnInfoTSCToXml(settingsTSC["class datastore.RootColumn:Chart Root"], "        ");
  xml += "    </column>\n";
  xml += "</TSCreator>";

  return xml;
}
