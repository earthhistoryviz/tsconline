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

/**
 * casts a string to a specified type
 * @param value a string that we want to cast to a type
 * @returns the casted value
 */
function castValue(value: string) {
  let castValue;
  if (value === "") {
    castValue = "";
  } else if (value === "true") {
    castValue = true;
  } else if (value === "false") {
    castValue = false;
  } else if (!isNaN(Number(value))) {
    castValue = Number(value);
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
  let settings: ChartSettingsInfoTSC = defaultChartSettingsInfoTSC;
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
  const fonts: FontsInfo = <FontsInfo>{};
  Object.assign(fonts, defaultFontsInfoConstant);
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
      Object.assign(column, defaultEventColumnInfoTSC);
      break;
    case "ZoneColumn":
      Object.assign(column, defaultZoneColumnInfoTSC);
      break;
    case "SequenceColumn":
      Object.assign(column, defaultSequenceColumnInfoTSC);
      break;
    case "RangeColumn":
      Object.assign(column, defaultRangeColumnInfoTSC);
      break;
    case "RulerColumn":
      Object.assign(column, defaultRulerColumnInfoTSC);
      break;
    case "PointColumn":
      Object.assign(column, defaultPointColumnInfoTSC);
      break;
    default:
      Object.assign(column, defaultColumnBasicInfoTSC);
  }
  column._id = id;
  column.children = [];
  const childNodes = node.childNodes;
  if (childNodes.length > 0) {
    for (let i = 0; i < childNodes.length; i++) {
      const maybeChild = childNodes[i];
      if (maybeChild.nodeType === node.ELEMENT_NODE) {
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
          const textValue = child.textContent!.trim();
          if (settingName === "backgroundColor" || settingName === "customColor") {
            if (standardizedValue && useNamedValue) {
              column[settingName] = {
                standardized: standardizedValue === "true",
                useNamed: useNamedValue === "true",
                text: textValue as string
              };
            } else if (useNamedValue) {
              column[settingName] = {
                useNamed: useNamedValue === "true",
                text: textValue as string
              };
            } else if (standardizedValue) {
              column[settingName] = {
                standardized: standardizedValue === "true",
                text: textValue as string
              };
            } else {
              column[settingName] = {
                text: textValue as string
              };
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
  const settingsTSC: ChartInfoTSC = {};
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

function extractName(text: string): string {
  return text.substring(text.indexOf(":") + 1, text.length);
}

/**
 * for escaping special characters in xml (& " ' < >)
 * in text, " ' > do not need to be escaped.
 * in attributes, all 5 need to be escaped.
 * https://stackoverflow.com/questions/1091945/what-characters-do-i-need-to-escape-in-xml-documents
 *
 * @param text the text to replace special chars
 * @param type number indicating the type of the text param
 *             0 = attribute
 *             1 = text
 * @returns
 */
function replaceSpecialChars(text: string, type: number): string {
  text = text.replaceAll("&", "&amp;");
  text = text.replaceAll("<", " &lt; ");
  if (type == 0) {
    text = text.replaceAll('"', "&quot;");
    text = text.replaceAll("'", "&apos;");
    text = text.replaceAll(">", " &gt; ");
  }
  //edge case for usa alaska mexico datapack
  if (text.includes("Alaska")) {
    text = text.replaceAll("&apos;", "'");
  }
  return text;
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
        xml += `font-size: ${fontTarget.size}px;`;
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

/**
 * generates xml string with column info
 * @param columnTSC json object with column info
 * @param stateColumn json object containing the state of the columns
 * @param indent the amount of indent to place in the xml file
 * @returns xml string with column info
 */
function generateColumnXml(presetColumn: ColumnInfoTSC, stateColumn: ColumnInfo | undefined, indent: string): string {
  let xml = "";
  for (let key in presetColumn) {
    if (Object.prototype.hasOwnProperty.call(presetColumn, key)) {
      let colName = extractName(presetColumn._id);
      let xmlKey = replaceSpecialChars(key, 0);
      // Skip the 'id' element.
      if (key === "_id" || key === "id") {
        continue;
      }
      if (key === "title") {
        let useEditName = false;
        if (colName !== "Chart Root" && colName !== "Ma") {
          if (stateColumn && stateColumn !== undefined) {
            if (stateColumn.editName !== undefined && stateColumn.editName !== colName) {
              xml += `${indent}<setting name="title">${replaceSpecialChars(stateColumn.editName, 1)}</setting>\n`;
              useEditName = true;
            }
          }
        }
        if (!useEditName) {
          xml += `${indent}<setting name="title">${replaceSpecialChars(presetColumn[key], 1)}</setting>\n`;
        }
      } else if (key === "backgroundColor" || key === "customColor") {
        if ("standardized" in presetColumn[key] && "useNamed" in presetColumn[key]) {
          xml += `${indent}<setting name="${xmlKey}" standardized="${presetColumn[key].standardized}" 
          useNamed="${presetColumn[key].useNamed}">${presetColumn[key].text}</setting>\n`;
        } else if ("useNamed" in presetColumn[key]) {
          xml += `${indent}<setting name="${xmlKey}" useNamed="${presetColumn[key].useNamed}">${presetColumn[key].text}</setting>\n`;
        } else if ("standardized" in presetColumn[key]) {
          xml += `${indent}<setting name="${xmlKey}" useNamed="${presetColumn[key].standardized}">${presetColumn[key].text}</setting>\n`;
        } else {
          xml += `${indent}<setting name="${xmlKey}"/>\n`;
        }
      } else if (key === "isSelected") {
        //TODO: remove later when event columns are covered
        if (presetColumn._id.includes("EventColumn")) {
          xml += `${indent}<setting name="${xmlKey}">${presetColumn["isSelected"]}</setting>\n`;
        }
        //if column isn't in state, then use default given by the original xml
        else if (stateColumn === undefined) {
          xml += `${indent}<setting name="${xmlKey}">${presetColumn["isSelected"]}</setting>\n`;
        }
        //always display these things (the original tsc throws an error if not selected)
        //(but online doesn't have option to deselect them)
        else if (colName === "Chart Root" || colName === "Chart Title" || colName === "Ma") {
          xml += `${indent}<setting name="${xmlKey}">true</setting>\n`;
          continue;
        }
        //check if column is checked or not, and change the isSelected field to true or false
        else if (stateColumn) {
          if (stateColumn.on) {
            xml += `${indent}<setting name="${xmlKey}">true</setting>\n`;
          } else {
            xml += `${indent}<setting name="${xmlKey}">false</setting>\n`;
            if (stateColumn.name === "Central Africa Cenozoic") {
            }
          }
        }
      } else if (key === "orientation") {
        xml += `${indent}<setting name="${xmlKey}" orientation="${presetColumn[key as keyof ColumnInfoTSC]}"/>\n`;
      } else if (key === "fonts") {
        xml += `${indent}<fonts>\n`;
        xml += generateFontsXml(`${indent}    `, stateColumn?.fontsInfo);
        xml += `${indent}</fonts>\n`;
      } else if (key === "children") {
        let currName = extractName(presetColumn._id);
        if (presetColumn.children) {
          for (let i = 0; i < presetColumn.children.length; i++) {
            xml += `${indent}<column id="${replaceSpecialChars(presetColumn.children[i]._id, 0)}">\n`;
            xml += generateColumnXml(presetColumn.children[i], stateColumn?.children[i], `${indent}    `);
            xml += `${indent}</column>\n`;
          }
        }
      } else {
        xml += `${indent}<setting name="${xmlKey}">${presetColumn[key as keyof ColumnInfoTSC]}</setting>\n`;
      }
    }
  }
  return xml;
}
/**
 * main parser
 * a major aspect for the parser is that it can only add fields that were part of the initial input settings
 * for example, if the settings doesn't have "isSelected" fields, it won't add "isSelected" settings in the final xml.
 * only works for the entire settings file (not individual columns)
 * @param settings the initial json object created by TSC using the datapack
 * @param columnSettings json object containing the state of the columns
 * @param chartSettings the chart settings in state such as age
 * @param version the version of the jar file (TimeScale Creator)
 * @returns xml string with the entire settings info
 */
export function jsonToXml(
  settingsTSC: ChartInfoTSC,
  columnSettings: ColumnInfo | undefined,
  chartSettings: ChartSettings,
  version: string = "PRO8.1"
): string {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<TSCreator version="${version}">\n`;
  if (settingsTSC["settings"]) {
    xml += '    <settings version="1.0">\n';
    xml += generateSettingsXml(chartSettings, "        ");
    xml += "    </settings>\n";
  }
  xml += '    <column id="class datastore.RootColumn:Chart Root">\n';
  xml += generateColumnXml(settingsTSC["class datastore.RootColumn:Chart Root"]!, columnSettings, "        ");
  xml += "    </column>\n";
  xml += "</TSCreator>\n";
  return xml;
}
