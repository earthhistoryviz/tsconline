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

/**
 * generates xml string with column info
 * @param columnTSC json object with column info
 * @param stateColumn json object containing the state of the columns
 * @param indent the amount of indent to place in the xml file
 * @returns xml string with column info
 */
function generateColumnXml(presetColumn: ColumnInfoTSC, stateColumn: ColumnInfo, indent: string): string {
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
      } else if (key === "backgroundColor") {
        if (stateColumn.rgb.r == 255 && stateColumn.rgb.g == 255 && stateColumn.rgb.b == 255) {
          xml += `${indent}<setting name="${xmlKey}"/>\n`;
        } else {
          xml += `${indent}<setting name="${xmlKey}" useNamed="false">rgb(${stateColumn.rgb.r},${stateColumn.rgb.g},${stateColumn.rgb.b})</setting>\n`;
        }
      } else if (key == "customColor") {
        xml += `${indent}<setting name="${xmlKey}" useNamed="false">rgb(${stateColumn.rgb.r},${stateColumn.rgb.g},${stateColumn.rgb.b})</setting>\n`;
      } else if (key === "width") {
        if (stateColumn && stateColumn.width !== undefined) {
          xml += `${indent}<setting name="width">${stateColumn.width}</setting>\n`;
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
        xml += generateFontsXml(`${indent}    `, stateColumn.fontsInfo);
        xml += `${indent}</fonts>\n`;
      } else if (key === "children") {
        let currName = extractName(presetColumn._id);
        if (presetColumn.children) {
          for (let i = 0; i < presetColumn.children.length; i++) {
            // will need to remove this
            if (!stateColumn.children[i]) {
              console.error(
                JSON.stringify(presetColumn.children[i]._id, null, 2) + "\n" + "doesn't exist in the state"
              );
              continue;
            }
            xml += `${indent}<column id="${replaceSpecialChars(presetColumn.children[i]._id, 0)}">\n`;
            xml += generateColumnXml(presetColumn.children[i], stateColumn.children[i], `${indent}    `);
            xml += `${indent}</column>\n`;
          }
        }
      } else if (key === "drawTitle") {
        xml += `${indent}<setting name="${xmlKey}">${stateColumn.enableTitle}</setting>\n`;
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
  columnSettings: ColumnInfo,
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

export function translateSettings(state: ChartSettings): ChartSettingsInfoTSC {
  let settings: ChartSettingsInfoTSC = <ChartSettingsInfoTSC>{};
  Object.assign(settings, defaultChartSettingsInfoTSC);
  //TODO: change units based on datapack
  settings.topAge.source = "text";
  settings.topAge.unit = "Ma";
  settings.topAge.text = state.topStageAge;
  settings.baseAge.source = "text";
  settings.baseAge.unit = "Ma";
  settings.baseAge.text = state.baseStageAge;
  settings.unitsPerMY.unit = "Ma";
  settings.unitsPerMY.text = state.unitsPerMY;
  settings.skipEmptyColumns.unit = "Ma";
  settings.skipEmptyColumns.text = state.skipEmptyColumns;
  settings.noIndentPattern = state.noIndentPattern;
  settings.enPriority = state.enablePriority;
  settings.enChartLegend = state.enableChartLegend;
  settings.enHideBlockLable = state.enableHideBlockLabel;
  settings.enEventColBG = state.enableColumnBackground;
  settings.doPopups = state.mouseOverPopupsEnabled;
  return settings;
}

export function translateColumn(state: ColumnInfo): ColumnInfoTSC {
  let column: ColumnInfoTSC = <ColumnInfoTSC>{};
  Object.assign(column, defaultColumnBasicInfoTSC);
  //Zone column
  if (state.subBlockInfo) {
    Object.assign(column, defaultZoneColumnInfoTSC);
    column._id = "class datastore.ZoneColumn:" + replaceSpecialChars(state.name, 0);
  }
  //blockseriesmetacolumn
  else if (state.subFaciesInfo || state.subChronInfo) {
    column._id = "class datastore.BlockSeriesMetaColumn:" + replaceSpecialChars(state.name, 0);
  }
  //event column
  else if (state.subEventInfo) {
    Object.assign(column, defaultEventColumnInfoTSC);
    column._id = "class datastore.EventColumn:" + replaceSpecialChars(state.name, 0);
  }
  //range column
  else if (state.subRangeInfo) {
    Object.assign(column, defaultRangeColumnInfoTSC);
    column._id = "class datastore.RangeColumn:" + replaceSpecialChars(state.name, 0);
  }
  //point column
  else if (state.subPointInfo) {
    Object.assign(column, defaultPointColumnInfoTSC);
    column._id = "class datastore.PointColumn:" + replaceSpecialChars(state.name, 0);
  }
  //freehand column
  else if (state.subFreehandInfo) {
    column._id = "class datastore.FreehandColumn:" + replaceSpecialChars(state.name, 0);
  }
  //sequence column
  else if (state.subSequenceInfo) {
    Object.assign(column, defaultSequenceColumnInfoTSC);
    column._id = "class datastore.SequenceColumn:" + replaceSpecialChars(state.name, 0);
  }
  //else if (state.subTransectInfo) {
  //   column._id = "class datastore.TransectColumn:" + replaceSpecialChars(state.name, 0);
  // }
  else if (!state.children) {
    //zone column
    if (
      state.name.includes("Facies Label") ||
      state.name.includes("Series Label") ||
      state.name.includes("Chron Label") ||
      state.name.includes("Members")
    ) {
      Object.assign(column, defaultZoneColumnInfoTSC);
      if (state.name === "Facies Label") {
        column._id = "class datastore.ZoneColumn:Facies Label";
      } else if (state.name === "Series Label") {
        column._id = "class datastore.ZoneColumn:Series Label";
      } else if (state.name === "Chron Label") {
        column._id = "class datastore.ZoneColumn:Chron Label";
      } else {
        column._id = "class datastore.ZoneColumn:Members";
      }
    } else if (state.name === "Facies") {
      column._id = "class datastore.FaciesColumn:Facies";
    } else if (state.name === "Chron") {
      column._id = "class datastore.ChronColumn:Chron";
    }
  } 
  else if (state.name === "Chart Root" || state.name === "Chart Title") {
    column._id = "class datastore.RootColumn:" + state.name;
  }
  else {
    column._id = "class datastore.BlankColumn:" + replaceSpecialChars(state.name, 0);
  }
  column.title = replaceSpecialChars(state.editName, 1);
  column.isSelected = state.on;
  column.fonts = state.fontsInfo;
  column.width = state.width;
  column.backgroundColor.text = "rgb(" + state.rgb.r + "," + state.rgb.g + "," + state.rgb.b + ")";
  column.children = [];
  for (let i = 0; i < state.children.length; i++) {
    column.children.push(translateColumn(state.children[i]));
  }
  return column;
}

export function columnInfoToSettingsTSC(state: ColumnInfo, settings: ChartSettings): ChartInfoTSC {
  const settingsTSC: ChartInfoTSC = {};
  settingsTSC["class datastore.RootColumn:Chart Root"] = translateColumn(state);
  settingsTSC["class datastore.RootColumn:Chart Root"]._id = "class datastore.RootColumn:Chart Root";
  settingsTSC.settings = translateSettings(settings);
  assertChartInfoTSC(settingsTSC);
  return settingsTSC;
}

/**
 *
 * @param settings settings json object
 * @param indent the amount of indent to place in the xml file
 * @returns xml string with settings info
 */

function ChartSettingsInfoTSCToXml(settings: ChartSettingsInfoTSC | undefined, indent: string): string {
  if (!settings) {
    return "";
  }
  let xml = "";
  xml += `${indent}<setting name="topAge" source="text" unit="${settings.topAge.unit}">\n`;
  xml += `${indent}    <setting name="text">${settings.topAge.text}</setting>\n`;
  xml += `${indent}</setting>\n`;
  xml += `${indent}<setting name="baseAge" source="text" unit="${settings.baseAge.unit}">\n`;
  xml += `${indent}    <setting name="text">${settings.baseAge.text}</setting>\n`;
  xml += `${indent}</setting>\n`;
  xml += `${indent}<setting name="unitsPerMY" unit="${settings.unitsPerMY.unit}">${settings.unitsPerMY.text}</setting>\n`;
  xml += `${indent}<setting name="skipEmptyColumns" unit="${settings.skipEmptyColumns.unit}">${settings.skipEmptyColumns.text}</setting>\n`;
  xml += `${indent}<setting name="variableColors">UNESCO</setting>\n`;
  xml += `${indent}<setting name="negativeChk">false</setting>\n`;
  xml += `${indent}<setting name="doPopups">${settings.doPopups}</setting>\n`;
  xml += `${indent}<setting name="enEventColBG">${settings.enEventColBG}</setting>\n`;
  xml += `${indent}<setting name="enChartLegend">${settings.enChartLegend}</setting>\n`;
  xml += `${indent}<setting name="enPriority">${settings.enPriority}</setting>\n`;
  xml += `${indent}<setting name="enHideBlockLabel">${settings.enHideBlockLable}</setting>\n`;
  return xml;
}

function FontsInfoToXml(fonts: FontsInfo, indent: string): string {
  let xml = "";
  let defInfo = JSON.parse(JSON.stringify(defaultFontsInfo));
  let newFonts = JSON.parse(JSON.stringify(fonts));
  for (const key in fonts) {
    if (Object.prototype.hasOwnProperty.call(fonts, key)) {
      const inheritable = fonts[key as keyof FontsInfo].inheritable;
      if (JSON.stringify(newFonts[key]) === JSON.stringify(defInfo[key])) {
        xml += `${indent}<font function="${key}" inheritable="${inheritable}"/>\n`;
      } else {
        xml += `${indent}<font function="${key}" inheritable="${inheritable}">`;
        for (let fKey in newFonts[key]) {
          if (JSON.stringify(newFonts[key][fKey]) !== JSON.stringify(defInfo[key][fKey])) {
            if (fKey === "fontFace") {
              xml += `font-family: ${newFonts[key][fKey]};`;
            }
            if (fKey === "size") {
              xml += `font-size: ${newFonts[key][fKey]}px;`;
            }
            if (fKey === "italic") {
              xml += `font-style: italic;`;
            }
            if (fKey === "bold") {
              xml += `font-weight: bold;`;
            }
            if (fKey === "color") {
              xml += `fill: ${newFonts[key][fKey]};`;
            }
          }
        }
        xml += `</font>\n`;
      }
    }
  }
  return xml;
}

function columnInfoTSCToXml(column: ColumnInfoTSC, indent: string): string {
  let xml = "";
  for (let key in column) {
    if (key === "title") {
      xml += `${indent}<setting name="title">${column[key]}</setting>\n`;
    } else if (key === "backgroundColor" || key === "customColor") {
      if ("standardized" in column[key] && "useNamed" in column[key]) {
        xml += `${indent}<setting name="${key}" standardized="${column[key].standardized}" 
        useNamed="${column[key].useNamed}">${column[key].text}</setting>\n`;
      } else if ("useNamed" in column[key]) {
        xml += `${indent}<setting name="${key}" useNamed="${column[key].useNamed}">${column[key].text}</setting>\n`;
      } else if ("standardized" in column[key]) {
        xml += `${indent}<setting name="${key}" useNamed="${column[key].standardized}">${column[key].text}</setting>\n`;
      } else {
        xml += `${indent}<setting name="${key}"/>\n`;
      }
    } else if (key === "fonts") {
      xml += `${indent}<fonts>\n`;
      xml += FontsInfoToXml(column.fonts, `${indent}    `);
      xml += `${indent}</fonts>\n`;
    }
    if (key === "children") {
      for (let i = 0; i < column.children.length; i++) {
        xml += `${indent}<column id="${replaceSpecialChars(column.children[i]._id, 0)}">\n`;
        xml += columnInfoTSCToXml(column.children[i], `${indent}    `);
        xml += `${indent}</column>\n`;
      }
    } else {
      xml += `${indent}<setting name="${key}">${column[key as keyof ColumnInfoTSC]}</setting>\n`;
    }
  }
  return xml;
}

export function ChartInfoTSCToXml(settingsTSC: ChartInfoTSC, version: string = "PRO8.1"): string {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<TSCreator version="${version}">\n`;
  if (settingsTSC["settings"]) {
    xml += '    <settings version="1.0">\n';
    xml += ChartSettingsInfoTSCToXml(settingsTSC.settings, "        ");
    xml += "    </settings>\n";
  }
  xml += '    <column id="class datastore.RootColumn:Chart Root">\n';
  xml += columnInfoTSCToXml(settingsTSC["class datastore.RootColumn:Chart Root"]!, "        ");
  xml += "    </column>\n";
  xml += "</TSCreator>\n";
  return xml;
}

export function jsonToXml(state: ColumnInfo, settings: ChartSettings): string {
  return ChartInfoTSCToXml(columnInfoToSettingsTSC(state, settings));
}
