//-------------------------------------------------------------------------------------------------- //
//                                          XML to JSON parser                                       //
//-------------------------------------------------------------------------------------------------- //

import {
  ChartInfoTSC,
  ChartSettingsInfoTSC,
  ColumnInfo,
  ColumnInfoTSC,
  FontsInfo,
  assertChartInfoTSC,
  assertChartSettingsInfoTSC,
  assertEventColumnInfoTSC,
  assertEventSettings,
  assertPointColumnInfoTSC,
  assertPointSettings,
  assertRulerColumnInfoTSC,
  assertZoneColumnInfoTSC,
  defaultChartSettingsInfoTSC,
  defaultColumnBasicInfoTSC,
  defaultEventColumnInfoTSC,
  defaultFontsInfo,
  defaultFontsInfoConstant,
  defaultPointColumnInfoTSC,
  defaultRangeColumnInfoTSC,
  defaultRulerColumnInfoTSC,
  defaultSequenceColumnInfoTSC,
  defaultZoneColumnInfoTSC
} from "@tsconline/shared";
import { ChartSettings } from "../types";
import { convertHexToRGB, convertRgbToString, convertTSCColorToRGB, trimQuotes } from "../util/util";
import { cloneDeep } from "lodash";

/**
 * casts a string to a specified type
 * @param value a string that we want to cast to a type
 * @returns the casted value
 */
function castValue(value: string) {
  let castValue;
  const RGBregex = new RegExp(
    /^rgb\(\s*(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\s*,\s*(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\s*,\s*(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\s*\)$/
  );
  if (value === "") {
    castValue = "";
  } else if (value === "true") {
    castValue = true;
  } else if (value === "false") {
    castValue = false;
  } else if (!isNaN(Number(value))) {
    castValue = Number(value);
  } else if (RGBregex.test(value)) {
    castValue = convertTSCColorToRGB(value);
  } else castValue = String(value);
  return castValue;
}

function updateProperty<T, K extends keyof T>(obj: T, key: K, value: string) {
  obj[key] = castValue(value) as T[K];
}
/**
 *
 * @param settingsNode DOM node with name settings
 * @returns json object containing information about the settings of the current node
 */

function processSettings(settingsNode: Element): ChartSettingsInfoTSC {
  let settings: ChartSettingsInfoTSC = JSON.parse(JSON.stringify(defaultChartSettingsInfoTSC));
  const settingNodes = settingsNode.getElementsByTagName("setting");
  for (let i = 0; i < settingNodes.length; i++) {
    const settingNode = settingNodes[i];
    const settingName = settingNode.getAttribute("name");
    if (settingName === null) {
      continue;
    }
    const nestedSettingsNode = settingNode.getElementsByTagName("setting")[0];
    let settingValue: string = "";
    if (nestedSettingsNode && nestedSettingsNode.textContent) {
      settingValue = nestedSettingsNode.textContent.trim();
    } else if (settingNode.textContent) {
      settingValue = settingNode.textContent.trim();
    }
    //since we access the elements by tag name, the nested settings of topage and baseage
    //are treated on the same level, so skip when the setting name is text or stage.
    if (settingName === "text" || settingName === "stage") {
      continue;
    }
    if (settingName === "topAge" || settingName === "baseAge") {
      let stage = "",
        text = "";
      if (nestedSettingsNode.getAttribute("name") === "stage") {
        stage = settingValue;
      } else {
        text = settingValue;
      }
      if (settingNode.getElementsByTagName("setting")[1]) {
        if (settingNode.getElementsByTagName("setting")[1].textContent) {
          settingValue = settingNode.getElementsByTagName("setting")[1].textContent!.trim();
          if (settingNode.getElementsByTagName("setting")[1].getAttribute("name") === "stage") {
            stage = settingValue;
          } else {
            text = settingValue;
          }
        }
      }
      settings[settingName].push({
        source: settingNode.getAttribute("source") as string,
        unit: settingNode.getAttribute("unit") as string,
        stage: castValue(stage) as string,
        text: castValue(text) as number
      });
    }
    //these two tags have units, so make an object storing its unit and value
    else if (settingName === "unitsPerMY") {
      settings[settingName].push({ unit: "Ma", text: Number(settingValue) });
    } else if (settingName === "skipEmptyColumns") {
      settings[settingName].push({ unit: "Ma", text: Boolean(settingValue) });
    } else {
      updateProperty(settings, settingName as keyof ChartSettingsInfoTSC, settingValue);
    }
  }
  assertChartSettingsInfoTSC(settings);
  return settings;
}
/**
 *
 * @param fontsNode DOM node with font name, has font settings as children
 * @returns json object containing the font info
 */
function processFonts(fontsNode: Element): FontsInfo {
  const fonts: FontsInfo = JSON.parse(JSON.stringify(defaultFontsInfoConstant));
  const childNodes = fontsNode.childNodes;
  for (let i = 0; i < childNodes.length; i++) {
    const maybeChild = childNodes[i];
    if (maybeChild.nodeType === Node.ELEMENT_NODE) {
      const child = <Element>maybeChild;
      let fontProps: string[] = [];
      if (child.textContent) {
        fontProps = child.textContent.trim().split(";");
      }
      for (let i = 0; i < fontProps.length; i++) {
        let key = "" as keyof FontsInfo;
        if (child.getAttribute("function")) {
          key = child.getAttribute("function")! as keyof FontsInfo;
        } else continue;
        fonts[key].inheritable = Boolean(child.getAttribute("inheritable"));
        let fontPropsValue = fontProps[i].split(": ")[1];
        if (fontProps[i].includes("font-family")) {
          fonts[key].fontFace =
            fontPropsValue === "Arial" || "Courier" || "Verdana"
              ? <"Arial" | "Courier" | "Verdana">fontPropsValue
              : "Arial";
        }
        if (fontProps[i].includes("font-size")) {
          fonts[key].size = Number(fontPropsValue.substring(0, fontPropsValue.length - 2));
        }
        if (fontProps[i].includes("font-style")) {
          if (fontProps[i].includes("italic")) {
            fonts[key].italic = true;
          }
        }
        if (fontProps[i].includes("font-weight")) {
          if (fontProps[i].includes("bold")) {
            fonts[key].bold = true;
          }
        }
        if (fontProps[i].includes("fill")) {
          fonts[key].color = fontPropsValue;
        }
      }
    }
  }
  return fonts;
}
/**
 *
 * @param node DOM node of a column in the settings file, starts with the chart title
 * @param id id of current column
 * @returns json object containing the info of the current and children columns
 */
function processColumn(node: Element, id: string): ColumnInfoTSC {
  let column: ColumnInfoTSC = <ColumnInfoTSC>{};
  const columnType = id.substring(id.indexOf(".") + 1, id.indexOf(":"));
  switch (columnType) {
    case "EventColumn":
      //can't set it equal to default because it becomes reference to object
      column = JSON.parse(JSON.stringify(defaultEventColumnInfoTSC));
      break;
    case "ZoneColumn":
      column = JSON.parse(JSON.stringify(defaultZoneColumnInfoTSC));
      break;
    case "SequenceColumn":
      column = JSON.parse(JSON.stringify(defaultSequenceColumnInfoTSC));
      break;
    case "RangeColumn":
      column = JSON.parse(JSON.stringify(defaultRangeColumnInfoTSC));
      break;
    case "RulerColumn":
      column = JSON.parse(JSON.stringify(defaultRulerColumnInfoTSC));
      break;
    case "PointColumn":
      column = JSON.parse(JSON.stringify(defaultPointColumnInfoTSC));
      break;
    default:
      column = JSON.parse(JSON.stringify(defaultColumnBasicInfoTSC));
  }
  column._id = id;
  column.children = [];
  const childNodes = node.childNodes;
  if (childNodes.length > 0) {
    for (let i = 0; i < childNodes.length; i++) {
      const maybeChild = childNodes[i];
      if (maybeChild.nodeType === Node.ELEMENT_NODE) {
        const child = <Element>maybeChild;
        const childName = child.getAttribute("id");
        if (child.nodeName === "column") {
          column.children.push(processColumn(child, childName!));
        } else if (child.nodeName === "fonts") {
          column.fonts = processFonts(child);
        } else if (child.nodeName === "setting") {
          const settingName = child.getAttribute("name");
          const justificationValue = child.getAttribute("justification");
          const orientationValue = child.getAttribute("orientation");
          const useNamedValue = child.getAttribute("useNamed");
          const standardizedValue = child.getAttribute("standardized");
          const RGBregex = new RegExp("rgb([0-2]+[0-5]*,[0-2]+[0-5]*,[0-2]+[0-5]*)");
          const textValue = child.textContent!.trim();
          if (settingName === "backgroundColor" || settingName === "customColor") {
            let rgb = textValue.substring(4, textValue.length - 1).split(",");
            if (standardizedValue && useNamedValue) {
              column[settingName] = {
                standardized: standardizedValue === "true",
                useNamed: useNamedValue === "true",
                text: convertTSCColorToRGB(textValue)
              };
            } else if (useNamedValue) {
              column[settingName] = {
                useNamed: useNamedValue === "true",
                text: convertTSCColorToRGB(textValue)
              };
            } else if (standardizedValue) {
              column[settingName] = {
                standardized: standardizedValue === "true",
                text: convertTSCColorToRGB(textValue)
              };
            } else {
              column[settingName] = {
                text: convertTSCColorToRGB(textValue)
              };
            }
            if (rgb.length !== 3) {
              delete column[settingName].text;
            }
          } else if (justificationValue) {
            updateProperty(column, settingName as keyof ColumnInfoTSC, justificationValue);
          } else if (orientationValue) {
            updateProperty(column, settingName as keyof ColumnInfoTSC, orientationValue);
          } else if (settingName === "type") {
            if (textValue === "") {
              updateProperty(column, settingName as keyof ColumnInfoTSC, child.getAttribute("type")!);
            } else updateProperty(column, settingName as keyof ColumnInfoTSC, textValue);
          } else if (settingName === "pointType") {
            updateProperty(column, settingName as keyof ColumnInfoTSC, child.getAttribute("pointType")!);
          } else {
            updateProperty(column, settingName as keyof ColumnInfoTSC, textValue);
          }
        }
      }
    }
  }
  return column;
}

/**
 * main parser
 * @param xml the xml string to be converted into a json object
 * @returns the json object equivalent of the given xml string
 */
export function xmlToJson(xml: string): ChartInfoTSC {
  //convert xml to a DOM document using a parser library
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xml, "text/xml");
  const settingsTSC: ChartInfoTSC = <ChartInfoTSC>{};
  const tsCreatorNode = xmlDoc.getElementsByTagName("TSCreator")[0];
  if (tsCreatorNode) {
    const settingsNode = tsCreatorNode.getElementsByTagName("settings")[0];
    if (settingsNode) {
      const versionAttr = settingsNode.getAttribute("version");
      if (versionAttr === "1.0") {
        settingsTSC["settings"] = processSettings(settingsNode);
      }
    }
    const rootColumnNode = tsCreatorNode.getElementsByTagName("column")[0];
    if (rootColumnNode) {
      settingsTSC["class datastore.RootColumn:Chart Root"] = processColumn(
        rootColumnNode,
        "class datastore.RootColumn:Chart Root"
      );
      settingsTSC["class datastore.RootColumn:Chart Root"]._id = "class datastore.RootColumn:Chart Root";
    }
  }
  assertChartInfoTSC(settingsTSC);
  return settingsTSC;
}

//-------------------------------------------------------------------------------------------------- //
//                                          JSON to XML parser                                       //
//-------------------------------------------------------------------------------------------------- //

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
function escapeHtmlChars(text: string, type: "attribute" | "text"): string {
  text = text.replaceAll("&", "&amp;");
  text = text.replaceAll("<", " &lt; ");
  if (type == "attribute") {
    text = text.replaceAll('"', "&quot;");
    text = text.replaceAll("'", "&apos;");
    text = text.replaceAll(">", " &gt; ");
  }
  return text;
}

function extractName(text: string): string {
  return text.substring(text.indexOf(":") + 1, text.length);
}
/**
 *
 * @param settings settings json object
 * @param indent the amount of indent to place in the xml file
 * @returns xml string with settings info
 */
function generateSettingsXml(stateSettings: ChartSettings, indent: string): string {
  let xml = "";
  for (const unit in stateSettings.timeSettings) {
    const timeSettings = stateSettings.timeSettings[unit];
    xml += `${indent}<setting name="topAge" source="text" unit="${unit}">\n`;
    xml += `${indent}    <setting name="text">${timeSettings.topStageAge}</setting>\n`;
    xml += `${indent}</setting>\n`;
    xml += `${indent}<setting name="baseAge" source="text" unit="${unit}">\n`;
    xml += `${indent}    <setting name="text">${timeSettings.baseStageAge}</setting>\n`;
    xml += `${indent}</setting>\n`;
    xml += `${indent}<setting name="unitsPerMY" unit="${unit}">${timeSettings.unitsPerMY * 30}</setting>\n`;
    xml += `${indent}<setting name="skipEmptyColumns">${timeSettings.skipEmptyColumns}</setting>\n`;
  }
  xml += `${indent}<setting name="variableColors">UNESCO</setting>\n`;
  xml += `${indent}<setting name="negativeChk">false</setting>\n`;
  xml += `${indent}<setting name="doPopups">${stateSettings.mouseOverPopupsEnabled}</setting>\n`;
  xml += `${indent}<setting name="enEventColBG">${stateSettings.enableColumnBackground}</setting>\n`;
  xml += `${indent}<setting name="enChartLegend">${stateSettings.enableChartLegend}</setting>\n`;
  xml += `${indent}<setting name="enPriority">${stateSettings.enablePriority}</setting>\n`;
  xml += `${indent}<setting name="enHideBlockLabel">${stateSettings.enableHideBlockLabel}</setting>\n`;
  return xml;
}

export function translateColumnInfoToColumnInfoTSC(state: ColumnInfo): ColumnInfoTSC {
  let column: ColumnInfoTSC = JSON.parse(JSON.stringify(defaultColumnBasicInfoTSC));
  switch (state.columnDisplayType) {
    case "Event":
      //can't set it equal to default because it becomes reference to object
      assertEventSettings(state.columnSpecificSettings);
      column = {
        ...cloneDeep(defaultEventColumnInfoTSC),
        type: state.columnSpecificSettings.type,
        rangeSort: state.columnSpecificSettings.rangeSort
      };
      break;
    case "Zone":
      column = cloneDeep(defaultZoneColumnInfoTSC);
      break;
    case "Sequence":
      column = cloneDeep(defaultSequenceColumnInfoTSC);
      break;
    case "Range":
      column = cloneDeep(defaultRangeColumnInfoTSC);
      break;
    case "Ruler":
      column = cloneDeep(defaultRulerColumnInfoTSC);
      break;
    case "Point":
      assertPointSettings(state.columnSpecificSettings);
      column = {
        ...cloneDeep(defaultPointColumnInfoTSC),
        pointType: state.columnSpecificSettings.pointShape,
        drawPoints: state.columnSpecificSettings.pointShape === "nopoints",
        drawLine: state.columnSpecificSettings.drawLine,
        lineColor: convertRgbToString(state.columnSpecificSettings.lineColor),
        drawSmooth: state.columnSpecificSettings.smoothed,
        drawFill: state.columnSpecificSettings.drawFill,
        fillColor: convertRgbToString(state.columnSpecificSettings.fill),
        minWindow: state.columnSpecificSettings.lowerRange,
        maxWindow: state.columnSpecificSettings.upperRange,
        drawScale: state.columnSpecificSettings.drawScale,
        drawBgrndGradient: state.columnSpecificSettings.drawBackgroundGradient,
        backGradStart: convertRgbToString(state.columnSpecificSettings.backgroundGradientStart),
        backGradEnd: convertRgbToString(state.columnSpecificSettings.backgroundGradientEnd),
        drawCurveGradient: state.columnSpecificSettings.drawCurveGradient,
        curveGradStart: convertRgbToString(state.columnSpecificSettings.curveGradientStart),
        curveGradEnd: convertRgbToString(state.columnSpecificSettings.curveGradientEnd),
        flipScale: state.columnSpecificSettings.flipScale,
        scaleStart: state.columnSpecificSettings.scaleStart,
        scaleStep: state.columnSpecificSettings.scaleStep,
      };
  }
  //TODO: check with Ogg about quote usage
  //strip surrounding quotations for id (ex. Belgium Datapack)
  state.name = trimQuotes(state.name);
  switch (state.columnDisplayType) {
    case "RootColumn":
    case "MetaColumn":
    case "BlockSeriesMetaColumn":
      column._id = `class datastore.${state.columnDisplayType}:` + state.name;
      break;
    default:
      column._id = `class datastore.${state.columnDisplayType}Column:` + state.name;
  }
  column.title = escapeHtmlChars(state.editName, "text");
  column.isSelected = state.on;
  column.drawTitle = state.enableTitle;
  column.fonts = state.fontsInfo;
  column.width = column.width;
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
    column.children.push(translateColumnInfoToColumnInfoTSC(state.children[i]));
  }
  return column;
}

export function columnInfoToSettingsTSC(state: ColumnInfo, settings: ChartSettings): ChartInfoTSC {
  const settingsTSC: ChartInfoTSC = <ChartInfoTSC>{};
  settingsTSC["class datastore.RootColumn:Chart Root"] = translateColumnInfoToColumnInfoTSC(state);
  settingsTSC.settings = JSON.parse(JSON.stringify(defaultChartSettingsInfoTSC));
  assertChartInfoTSC(settingsTSC);
  return settingsTSC;
}

/**
 *
 * @param fonts font json object
 * @param indent the amount of indent to place in the xml file
 * @returns xml string with fonts info
 */
function generateFontsXml(indent: string, fontsInfo?: FontsInfo): string {
  if (!fontsInfo) {
    return "";
  }
  let defInfo = JSON.parse(JSON.stringify(defaultFontsInfo));
  let xml = "";
  for (const key in fontsInfo) {
    const fontTarget = fontsInfo[key as keyof FontsInfo];
    if (!fontTarget.on || JSON.stringify(fontTarget) === JSON.stringify(defInfo[key])) {
      xml += `${indent}<font function="${key}" inheritable="${fontTarget.inheritable}"/>\n`;
    } else {
      xml += `${indent}<font function="${key}" inheritable="${fontTarget.inheritable}">`;
      xml += `font-family: ${fontTarget.fontFace};`;
      // removed px from font size because jar uses parseDouble and doesn't parse px
      xml += `font-size: ${fontTarget.size};`;
      if (fontTarget.italic) {
        xml += `font-style: italic;`;
      }
      if (fontTarget.bold) {
        xml += `font-weight: bold;`;
      }
      xml += `fill: ${fontTarget.color};`;
      xml += `</font>\n`;
    }
  }
  return xml;
}

function columnInfoTSCToXml(column: ColumnInfoTSC, indent: string): string {
  let xml = "";
  for (let key in column) {
    if (key === "_id") {
      continue;
    }
    if (key === "title") {
      xml += `${indent}<setting name="title">${column[key]}</setting>\n`;
    } else if (key === "backgroundColor") {
      // add if useNamed and standardized properties are implemented
      // if ("standardized" in column[key] && "useNamed" in column[key]) {
      //   if (column[key].text.length > 0) {
      //     xml += `${indent}<setting name="${key}" standardized="${column[key].standardized}"
      //     useNamed="${column[key].useNamed}">${column[key].text}</setting>\n`;
      //   } else
      //     xml += `${indent}<setting name="${key}" standardized="${column[key].standardized}"
      //   useNamed="${column[key].useNamed}"/>\n`;
      // } else if ("useNamed" in column[key]) {
      //   if (column[key].text.length > 0) {
      //     xml += `${indent}<setting name="${key}"
      //     useNamed="${column[key].useNamed}">${column[key].text}</setting>\n`;
      //   } else
      //     xml += `${indent}<setting name="${key}"
      //   useNamed="${column[key].useNamed}"/>\n`;
      // } else if ("standardized" in column[key]) {
      //   if (column[key].text.length > 0) {
      //     xml += `${indent}<setting name="${key}" standardized="${column[key].standardized}"
      //     >${column[key].text}</setting>\n`;
      //   } else
      //     xml += `${indent}<setting name="${key}" standardized="${column[key].standardized}"
      //   />\n`;
      // } else
      if (column.backgroundColor.text) {
        if (
          column.backgroundColor.text.r == 255 &&
          column.backgroundColor.text.g == 255 &&
          column.backgroundColor.text.b == 255
        ) {
          xml += `${indent}<setting name="backgroundColor"/>\n`;
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
      for (let i = 0; i < column.children.length; i++) {
        xml += `${indent}<column id="${escapeHtmlChars(column.children[i]._id, "attribute")}">\n`;
        xml += columnInfoTSCToXml(column.children[i], `${indent}    `);
        xml += `${indent}</column>\n`;
      }
    } else if (key === "justification") {
      assertRulerColumnInfoTSC(column);
      xml += `${indent}<setting justification="${column.justification}" name="justification"/>\n`;
    } else if (key === "orientation") {
      assertZoneColumnInfoTSC(column);
      xml += `${indent}<setting name="orientation" orientation="${column.orientation}"/>\n`;
    } else {
      xml += `${indent}<setting name="${key}">${column[key as keyof ColumnInfoTSC]}</setting>\n`;
    }
  }
  return xml;
}

export function jsonToXml(state: ColumnInfo, settings: ChartSettings, version: string = "PRO8.1"): string {
  let settingsTSC = JSON.parse(JSON.stringify(columnInfoToSettingsTSC(state, settings)));
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<TSCreator version="${version}">\n`;
  xml += '    <settings version="1.0">\n';
  xml += generateSettingsXml(settings, "        ");
  xml += "    </settings>\n";
  xml += '    <column id="class datastore.RootColumn:Chart Root">\n';
  xml += columnInfoTSCToXml(settingsTSC["class datastore.RootColumn:Chart Root"], "        ");
  xml += "    </column>\n";
  xml += "</TSCreator>\n";
  return xml;
}
