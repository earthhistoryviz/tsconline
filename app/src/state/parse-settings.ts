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
  assertChronSettings,
  assertEventColumnInfoTSC,
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
  convertPointShapeToPointType,
  defaultChartSettingsInfoTSC,
  defaultChronColumnInfoTSC,
  defaultColumnBasicInfoTSC,
  defaultEventColumnInfoTSC,
  defaultFontsInfo,
  defaultFontsInfoConstant,
  defaultPointColumnInfoTSC,
  defaultRangeColumnInfoTSC,
  defaultRulerColumnInfoTSC,
  defaultSequenceColumnInfoTSC,
  defaultZoneColumnInfoTSC,
  isRGB,
  extractColumnType,
  buildTscXmlDocument
} from "@tsconline/shared";
import { ChartSettings, CrossPlotTimeSettings, RenderColumnInfo } from "../types";
import { convertRgbToString, convertTSCColorToRGB, findSerialNum } from "../util/util";
import { cloneDeep, range } from "lodash";
//for testing purposes
//https://stackoverflow.com/questions/51269431/jest-mock-inner-function
import * as parseSettings from "./parse-settings";
import { changeManuallyAddedColumns, normalizeColumnProperties } from "./actions/util-actions";
import { attachTscPrefixToName } from "./non-action-util";
import { toJS } from "mobx";
/**
 * casts a string to a specified type
 * @param value a string that we want to cast to a type
 * @returns the casted value
 */
function castValue(value: string | null) {
  let castValue;
  const RGBregex = new RegExp(
    /^rgb\(\s*(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\s*,\s*(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\s*,\s*(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\s*\)$/
  );
  if (value === null) {
    castValue = null;
  } else if (value === "") {
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

function updateProperty<T, K extends keyof T>(obj: T, key: K, value: string | null) {
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
    if (!settingNode) continue;

    const settingName = settingNode.getAttribute("name");
    if (!settingName) continue;

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
        text = 0;
      if (nestedSettingsNode.getAttribute("name") === "stage") {
        stage = settingValue;
      } else {
        text = Number(settingValue);
      }
      if (settingNode.getElementsByTagName("setting")[1]) {
        if (settingNode.getElementsByTagName("setting")[1]!.textContent) {
          settingValue = settingNode.getElementsByTagName("setting")[1]!.textContent!.trim();
          if (settingNode.getElementsByTagName("setting")[1]!.getAttribute("name") === "stage") {
            stage = settingValue;
          } else {
            text = Number(settingValue);
          }
        }
      }
      settings[settingName].push({
        source: settingNode.getAttribute("source") as string,
        unit: settingNode.getAttribute("unit") as string,
        stage: castValue(stage) as string,
        text: text
      });
    }
    //these two tags have units, so make an object storing its unit and value
    else if (settingName === "unitsPerMY") {
      if (settingNode.getAttribute("unit") !== null)
        settings[settingName].push({ unit: settingNode.getAttribute("unit")!, text: Number(settingValue) });
    } else if (settingName === "skipEmptyColumns") {
      if (settingNode.getAttribute("unit") !== null)
        settings[settingName].push({ unit: settingNode.getAttribute("unit")!, text: settingValue === "true" });
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
    if (maybeChild && maybeChild.nodeType === Node.ELEMENT_NODE) {
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
        if (!fontProps[i]) continue;

        let fontPropsValue = fontProps[i]!.split(": ")[1];
        if (!fontPropsValue) continue;
        if (fontProps[i]!.includes("font-family")) {
          fonts[key].fontFace =
            fontPropsValue === "Arial" || "Courier" || "Verdana"
              ? <"Arial" | "Courier" | "Verdana">fontPropsValue
              : "Arial";
        }
        if (fontProps[i]!.includes("font-size")) {
          fonts[key].size = Number(fontPropsValue.substring(0, fontPropsValue.length - 2));
        }
        if (fontProps[i]!.includes("font-style")) {
          if (fontProps[i]!.includes("italic")) {
            fonts[key].italic = true;
          }
        }
        if (fontProps[i]!.includes("font-weight")) {
          if (fontProps[i]!.includes("bold")) {
            fonts[key].bold = true;
          }
        }
        if (fontProps[i]!.includes("fill")) {
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
    case "ChronColumn":
      column = JSON.parse(JSON.stringify(defaultChronColumnInfoTSC));
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
      if (maybeChild && maybeChild.nodeType === Node.ELEMENT_NODE) {
        const child = <Element>maybeChild;
        const childName = child.getAttribute("id");
        if (child.nodeName === "column") {
          let childColumn = processColumn(child, childName!);
          //since isDataMiningColumn is an attribute of the column node, have to set it here
          if (child.getAttribute("isDataMiningColumn") === "true") {
            assertPointColumnInfoTSC(childColumn);
            childColumn.isDataMiningColumn = true;
          }
          if (child.getAttribute("isDualColCompColumn") === "true" && childName) {
            if (extractColumnType(childName) === "EventColumn") {
              assertEventColumnInfoTSC(childColumn);
              childColumn.isDualColCompColumn = true;
            }
            if (extractColumnType(childName) === "PointColumn") {
              assertPointColumnInfoTSC(childColumn);
              childColumn.isDualColCompColumn = true;
            }
          }
          column.children.push(childColumn);
        } else if (child.nodeName === "fonts") {
          column.fonts = processFonts(child);
        } else if (child.nodeName === "setting") {
          const settingName = child.getAttribute("name");
          const justificationValue = child.getAttribute("justification");
          const orientationValue = child.getAttribute("orientation");
          const useNamedValue = child.getAttribute("useNamed");
          const standardizedValue = child.getAttribute("standardized");
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
          } else if (settingName === "drawExtraColumn") {
            if (textValue === "") updateProperty(column, settingName as keyof ColumnInfoTSC, null);
            else updateProperty(column, settingName as keyof ColumnInfoTSC, textValue);
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
 *
 * @param settings settings json object
 * @param indent the amount of indent to place in the xml file
 * @returns xml string with settings info
 */
export function generateSettingsXml(stateSettings: ChartSettings, indent: string): string {
  let xml = "";
  for (const unit in stateSettings.timeSettings) {
    const timeSettings = stateSettings.timeSettings[unit];
    if (!timeSettings) continue;
    xml += `${indent}<setting name="topAge" source="text" unit="${unit}">\n`;
    xml += `${indent}    <setting name="text">${timeSettings.topStageAge}</setting>\n`;
    xml += `${indent}</setting>\n`;
    xml += `${indent}<setting name="baseAge" source="text" unit="${unit}">\n`;
    xml += `${indent}    <setting name="text">${timeSettings.baseStageAge}</setting>\n`;
    xml += `${indent}</setting>\n`;
    xml += `${indent}<setting name="unitsPerMY" unit="${unit}">${timeSettings.unitsPerMY * 30}</setting>\n`;
    xml += `${indent}<setting name="skipEmptyColumns" unit="${unit}">${timeSettings.skipEmptyColumns}</setting>\n`;
  }
  xml += `${indent}<setting name="variableColors">UNESCO</setting>\n`;
  xml += `${indent}<setting name="noIndentPattern">${stateSettings.noIndentPattern}</setting>\n`;
  xml += `${indent}<setting name="negativeChk">false</setting>\n`;
  xml += `${indent}<setting name="doPopups">${stateSettings.mouseOverPopupsEnabled}</setting>\n`;
  xml += `${indent}<setting name="enEventColBG">${stateSettings.enableColumnBackground}</setting>\n`;
  xml += `${indent}<setting name="enChartLegend">${stateSettings.enableChartLegend}</setting>\n`;
  xml += `${indent}<setting name="enPriority">${stateSettings.enablePriority}</setting>\n`;
  xml += `${indent}<setting name="enHideBlockLable">${stateSettings.enableHideBlockLabel}</setting>\n`;
  return xml;
}

export function jsonToXml(
  state: ColumnInfo,
  hash: Map<string, RenderColumnInfo>,
  settings: ChartSettings,
  version: string = "PRO8.1"
): string {
  normalizeColumnProperties(state);
  changeManuallyAddedColumns(state, hash);
  const settingsXml = generateSettingsXml(settings, "        ");
  return buildTscXmlDocument(state, settingsXml, version);
}
