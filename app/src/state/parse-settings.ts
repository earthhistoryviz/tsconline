//-------------------------------------------------------------------------------------------------- //
//                                          XML to JSON parser                                       //
//-------------------------------------------------------------------------------------------------- //

import {
  ChartInfoTSC,
  ChartSettingsInfoTSC,
  ColumnInfo,
  ColumnInfoTSC,
  FontsInfo,
  defaultFontsInfo
} from "@tsconline/shared";

/**
 *
 * @param settingsNode DOM node with name settings
 * @returns json object containing information about the settings of the current node
 */

function processSettings(settingsNode: any): any {
  let settings: ChartSettingsInfoTSC = {
    topAge: {
      source: "",
      unit: "",
      stage: undefined,
      text: undefined
    },
    baseAge: {
      source: "",
      unit: "",
      stage: undefined,
      text: undefined
    },
    unitsPerMY: {
      unit: "",
      text: 0
    },
    skipEmptyColumns: {
      unit: "",
      text: false
    },
    variableColors: "",
    noIndentPattern: false,
    negativeChk: false,
    doPopups: false,
    enEventColBG: false,
    enChartLegend: false,
    enPriority: false,
    enHideBlockLable: false
  };
  //https://stackoverflow.com/questions/69917159/type-any-is-not-assignable-to-type-never-when-trying-to-set-object-property
  //TLDR: since properties of settings has different types, can't infer type of property from variable name, so use generics
  function updateSetting<T extends keyof ChartSettingsInfoTSC>(settingName: T, value: ChartSettingsInfoTSC[T]) {
    settings[settingName] = value;
  }

  const settingNodes = settingsNode.getElementsByTagName("setting");
  for (let i = 0; i < settingNodes.length; i++) {
    const settingNode = settingNodes[i];
    const settingName = settingNode.getAttribute("name");
    const nestedSettingsNode = settingNode.getElementsByTagName("setting")[0];
    let settingValue = nestedSettingsNode ? nestedSettingsNode.textContent.trim() : settingNode.textContent.trim();
    //since we access the elements by tag name, the nested settings of topage and baseage
    //are treated on the same level, so skip when the setting name is text or stage.
    if (settingName === "text" || settingName === "stage") {
      continue;
    }
    if (settingName === "topAge" || settingName === "baseAge") {
      let stage = undefined;
      let text = undefined;

      if (nestedSettingsNode.getAttribute("name") === "stage") {
        stage = settingValue;
      } else {
        text = settingValue;
      }
      if (settingNode.getElementsByTagName("setting")[1]) {
        settingValue = settingNode.getElementsByTagName("setting")[1].textContent.trim();
        if (settingNode.getElementsByTagName("setting")[1].getAttribute("name") === "stage") {
          stage = settingValue;
        } else {
          text = settingValue;
        }
      }
      updateSetting(settingName, {
        source: settingNode.getAttribute("source"),
        unit: settingNode.getAttribute("unit"),
        stage: stage,
        text: text
      });
    }
    //these two tags have units, so make an object storing its unit and value
    else if (settingName === "unitsPerMY" || settingName === "skipEmptyColumns") {
      updateSetting(settingName, { unit: "Ma", text: settingValue });
    } else {
      const settingValue = settingNode.textContent.trim();
      updateSetting(settingName, settingValue);
    }
  }
  return settings;
}
/**
 *
 * @param fontsNode DOM node with font name, has font settings as children
 * @returns json object containing the font info
 */
function processFonts(fontsNode: any): FontsInfo {
  const fonts: FontsInfo = defaultFontsInfo;
  // const fontNodes = fontsNode.getElementsByTagName("font");
  // for (let i = 0; i < fontNodes.length; i++) {
  //   const fontNode = fontNodes[i];
  //   const fontFunction = fontNode.getAttribute("function");
  //   const inheritable = fontNode.getAttribute("inheritable");
  //   const fontInfo = { inheritable: inheritable === "true" };
  //   fonts[fontFunction] = fontInfo;
  // }
  return fonts;
}
/**
 *
 * @param node DOM node of a column in the settings file, usually starts with the chart root
 * @returns json object containing the info of the current and children columns
 */
function processColumn(node: any, id: string): ColumnInfoTSC {
  const column: ColumnInfoTSC = {
    _id: "",
    title: "",
    useNamedColor: true,
    placeHolder: true,
    drawTitle: true,
    drawAgeLabel: true,
    drawUncertaintyLabel: true,
    isSelected: true,
    width: 0,
    pad: 0,
    "age pad": 0,
    backgroundColor: {
      text: ""
    },
    customColor: {
      text: ""
    },
    children: []
  };
  function updateColumn<T extends keyof ColumnInfoTSC>(settingName: T, value: ColumnInfoTSC[T]) {
    column[settingName] = value;
  }

  const nodeAttributes = node.attributes;

  if (nodeAttributes.length > 0) {
    for (let i = 0; i < nodeAttributes.length; i++) {
      const attribute = nodeAttributes[i];
      updateColumn(attribute.name, attribute.value);
    }
  }

  const childNodes = node.childNodes;
  column._id = id;
  if (childNodes.length > 0) {
    for (let i = 0; i < childNodes.length; i++) {
      const child = childNodes[i];
      if (child.nodeType === node.ELEMENT_NODE) {
        const childName = child.getAttribute("id");
        if (child.nodeName === "column") {
          //regex to find substring between first period and first colon
          const childTSC = processColumn(child, childName);
          column.children.push(childTSC);
        } else if (child.nodeName === "fonts") {
          column.fonts = processFonts(child);
        } else if (child.nodeName === "setting") {
          const settingName = child.getAttribute("name") as keyof ColumnInfoTSC;
          const justificationValue = child.getAttribute("justification");
          const orientationValue = child.getAttribute("orientation");
          const useNamedValue = child.getAttribute("useNamed");
          const standardizedValue = child.getAttribute("standardized");
          if (settingName === "backgroundColor" || settingName === "customColor") {
            column[settingName] = {
              standardized: standardizedValue,
              useNamed: useNamedValue,
              text: child.textContent.trim()
            };
          } else if (justificationValue) {
            updateColumn(settingName, justificationValue);
          } else if (orientationValue) {
            updateColumn(settingName, orientationValue);
          } else {
            const textContent = child.textContent.trim();
            if (textContent) {
              updateColumn(settingName, textContent);
            }
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
export function xmlToJson(xml: string): any {
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
      settingsTSC["class datastore.RootColumn:Chart Root"] = processColumn(rootColumnNode, "RootColumn");
      settingsTSC["class datastore.RootColumn:Chart Root"]._id = "class datastore.RootColumn:Chart Root";
    }
  }
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
function generateSettingsXml(settings: any, chartSettings: any, indent: string): string {
  let xml = "";
  for (const key in settings) {
    if (Object.prototype.hasOwnProperty.call(settings, key)) {
      const value = settings[key];
      if (typeof value === "object") {
        if (key === "topAge") {
          xml += `${indent}<setting name="${key}" source="text" unit="${value.unit}">\n`;
          xml += `${indent}    <setting name="text">${chartSettings.topStageAge}</setting>\n`;
          xml += `${indent}</setting>\n`;
        } else if (key === "baseAge") {
          xml += `${indent}<setting name="${key}" source="text" unit="${value.unit}">\n`;
          //this is a hack, right now the parser gets the chart settings from state which is initialized to zero
          //so if settings state hasn't changed, use preset value.
          //later use something other than checking if base stage is zero.
          if (chartSettings.baseStageAge === 0) {
            xml += `${indent}    <setting name="text">${value.text}</setting>\n`;
          } else xml += `${indent}    <setting name="text">${chartSettings.baseStageAge}</setting>\n`;
          xml += `${indent}</setting>\n`;
        } else if (key === "unitsPerMY" || key === "skipEmptyColumns") {
          xml += `${indent}<setting name="${key}" unit="${value.unit}">${value.text}</setting>\n`;
        }
      } else if (key === "justification") {
        xml += `${indent}<setting justification="${value}" name="${key}"/>\n`;
      } else if (key === "doPopups") {
        xml += `${indent}<setting name="${key}">${chartSettings.mouseOverPopupsEnabled}</setting>\n`;
      } else {
        xml += `${indent}<setting name="${key}">${value}</setting>\n`;
      }
    }
  }
  return xml;
}
/**
 *
 * @param fonts font json object
 * @param indent the amount of indent to place in the xml file
 * @returns xml string with settings info
 */
function generateFontsXml(fonts: any, colName: string, stateColumn: any, indent: string): string {
  if (!stateColumn) {
    return "";
  }
  let defInfo = JSON.parse(JSON.stringify(defaultFontsInfo));
  if (
    colName === "Chart Root" ||
    colName === "Facies" ||
    colName === "Members" ||
    colName === "Facies Label" ||
    colName === "Series Label"
  ) {
    let newStateColumn = {};
    if (stateColumn) {
      newStateColumn = JSON.parse(JSON.stringify(stateColumn));
    }
    return "";
  }
  let newStateColumn = JSON.parse(JSON.stringify(stateColumn));
  let xml = "";
  for (const key in fonts) {
    if (Object.prototype.hasOwnProperty.call(fonts, key)) {
      const inheritable = fonts[key].inheritable;
      if (JSON.stringify(newStateColumn[key]) === JSON.stringify(defInfo[key])) {
        xml += `${indent}<font function="${key}" inheritable="${inheritable}"/>\n`;
      } else {
        xml += `${indent}<font function="${key}" inheritable="${inheritable}">`;
        for (let fKey in newStateColumn[key]) {
          if (JSON.stringify(newStateColumn[key][fKey]) !== JSON.stringify(defInfo[key][fKey])) {
            if (fKey === "fontFace") {
              xml += `font-family: ${newStateColumn[key][fKey]};`;
            }
            if (fKey === "size") {
              xml += `font-size: ${newStateColumn[key][fKey]}px;`;
            }
            if (fKey === "italic") {
              xml += `font-style: italic;`;
            }
            if (fKey === "bold") {
              xml += `font-weight: bold;`;
            }
            if (fKey === "color") {
              xml += `fill: ${newStateColumn[key][fKey]};`;
            }
          }
        }
        xml += `</font>\n`;
      }
    }
  }
  return xml;
}

function columnIsChild(columns: ColumnInfoTSC[], name: string) {
  for (let i = 0; i < columns.length; i++) {
    if (name === columns[i]._id) {
      return true;
    }
  }
  return false;
}

function getChildColumn(columns: ColumnInfoTSC[], name: string) {
  for (let i = 0; i < columns.length; i++) {
    if (name === columns[i]._id) {
      return columns[i];
    }
  }
}

/**
 * generates xml string with column info
 * @param presetColumn json object with column info
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
        if (presetColumn[key].standardized && presetColumn[key].useNamed) {
          xml += `${indent}<setting name="${xmlKey}" standardized="${presetColumn[key].standardized}" 
          useNamed="${presetColumn[key].useNamed}">${presetColumn[key].text}</setting>\n`;
        } else if (presetColumn[key].useNamed) {
          xml += `${indent}<setting name="${xmlKey}" useNamed="${presetColumn[key].useNamed}">${presetColumn[key].text}</setting>\n`;
        } else if (presetColumn[key].standardized) {
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
        // } else if (key.startsWith("_")) {
        //   xml += `${indent}<${xmlKey.slice(1)}>${presetColumn[key]}</${xmlKey.slice(1)}>\n`;
        //
      } else if (key === "fonts") {
        xml += `${indent}<fonts>\n`;
        xml += generateFontsXml(presetColumn[key], colName, stateColumn?.fontsInfo, `${indent}    `);
        xml += `${indent}</fonts>\n`;
      } else if (key === "children") {
        let currName = extractName(presetColumn._id);
        if (currName === "Chart Root") {
          xml += `${indent}<column id="class datastore.RootColumn:Chart Title">\n`;
          xml += generateColumnXml(presetColumn.children[0], stateColumn, `${indent}    `);
          xml += `${indent}</column>\n`;
        } else {
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
  chartSettings: any,
  version: string = "PRO8.1"
): string {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<TSCreator version="${version}">\n`;
  if (settingsTSC["settings"]) {
    xml += '    <settings version="1.0">\n';
    xml += generateSettingsXml(settingsTSC["settings"], chartSettings, "        ");
    xml += "    </settings>\n";
  }
  xml += '    <column id="class datastore.RootColumn:Chart Root">\n';
  xml += generateColumnXml(settingsTSC["class datastore.RootColumn:Chart Root"]!, columnSettings, "        ");
  xml += "    </column>\n";
  xml += "</TSCreator>\n";
  return xml;
}
