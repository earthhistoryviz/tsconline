//-------------------------------------------------------------------------------------------------- //
//                                          XML to JSON parser                                       //
//-------------------------------------------------------------------------------------------------- //

import { ColumnInfo } from "@tsconline/shared";

/**
 *
 * @param settingsNode DOM node with name settings
 * @returns json object containing information about the settings of the current node
 */
function processSettings(settingsNode: any): any {
  const settings: any = {};
  const settingNodes = settingsNode.getElementsByTagName("setting");
  for (let i = 0; i < settingNodes.length; i++) {
    const settingNode = settingNodes[i];
    const settingName = settingNode.getAttribute("name");
    const nestedSettingsNode = settingNode.getElementsByTagName("setting")[0];
    const justificationValue = settingNode.getAttribute("justification");
    let settingValue = nestedSettingsNode
      ? nestedSettingsNode.textContent.trim()
      : settingNode.textContent.trim();
    //since we access the elements by tag name, the nested settings of topage and baseage
    //are treated on the same level, so skip when the setting name is text or stage.
    if (settingName === "text" || settingName === "stage") {
      continue;
    } else if (settingName === "topAge" || settingName === "baseAge") {
      let stage = undefined;
      let text = undefined;
      if (nestedSettingsNode.getAttribute("name") === "stage") {
        stage = settingValue;
      } else {
        text = settingValue;
      }
      if (settingNode.getElementsByTagName("setting")[1]) {
        settingValue = settingNode
          .getElementsByTagName("setting")[1]
          .textContent.trim();
        if (
          settingNode
            .getElementsByTagName("setting")[1]
            .getAttribute("name") === "stage"
        ) {
          stage = settingValue;
        } else {
          text = settingValue;
        }
      }
      settings[settingName] = {
        source: settingNode.getAttribute("source"),
        unit: settingNode.getAttribute("unit"),
        stage: stage,
        text: text,
      };
    }
    //these two tags have units, so make an object storing its unit and value
    else if (settingName === "unitsPerMY" || settingName === "skipEmptyColumns") {
      settings[settingName] = {
        unit: "Ma",
        text: settingValue
      };
    } else if (justificationValue) {
      settings[settingName] = justificationValue;
    } else {
      const settingValue = settingNode.textContent.trim();
      settings[settingName] = settingValue;
    }
  }
  return settings;
}
/**
 *
 * @param fontsNode DOM node with font name, has font settings as children
 * @returns json object containing the font info
 */
function processFonts(fontsNode: any): any {
  const fonts: any = {};
  const fontNodes = fontsNode.getElementsByTagName("font");
  for (let i = 0; i < fontNodes.length; i++) {
    const fontNode = fontNodes[i];
    const fontFunction = fontNode.getAttribute("function");
    const inheritable = fontNode.getAttribute("inheritable");
    const fontInfo = { inheritable: inheritable === "true" };
    fonts[fontFunction] = fontInfo;
  }
  return fonts;
}
/**
 *
 * @param node DOM node of a column in the settings file, usually starts with the chart root
 * @returns json object containing the info of the current and children columns
 */
function processColumn(node: any): any {
  const result: any = {};
  const nodeAttributes = node.attributes;

  if (nodeAttributes.length > 0) {
    for (let i = 0; i < nodeAttributes.length; i++) {
      const attribute = nodeAttributes[i];
      result[`_${attribute.name}`] = attribute.value;
    }
  }

  const childNodes = node.childNodes;

  if (childNodes.length > 0) {
    for (let i = 0; i < childNodes.length; i++) {
      const child = childNodes[i];
      if (child.nodeType === node.ELEMENT_NODE) {
        const childName = child.getAttribute("id");
        if (child.nodeName === "column") {
          result[childName] = processColumn(child);
        } else if (child.nodeName === "fonts") {
          result["fonts"] = processFonts(child);
        } else if (child.nodeName === "setting") {
          const settingName = child.getAttribute("name");
          const justificationValue = child.getAttribute("justification");
          const orientationValue = child.getAttribute("orientation");
          const useNamedValue = child.getAttribute("useNamed");
          const standardizedValue = child.getAttribute("standardized");
          if (
            settingName === "backgroundColor" ||
            settingName === "customColor"
          ) {
            result[settingName] = {
              standardized: standardizedValue ? standardizedValue : undefined,
              useNamed: useNamedValue ? useNamedValue : undefined,
              text: child.textContent.trim(),
            };
          } else if (justificationValue) {
            result[settingName] = justificationValue;
          } else if (orientationValue) {
            result[settingName] = orientationValue;
          } else {
            const textContent = child.textContent.trim();
            if (textContent) {
              result[settingName] = textContent;
            }
          }
        }
      }
    }
  }

  return result;
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
  const json: any = {};
  const tsCreatorNode = xmlDoc.getElementsByTagName("TSCreator")[0];
  if (tsCreatorNode) {
    const settingsNode = tsCreatorNode.getElementsByTagName("settings")[0];
    if (settingsNode) {
      const versionAttr = settingsNode.getAttribute("version");
      if (versionAttr === "1.0") {
        json["settings"] = processSettings(settingsNode);
      }
    }

    const rootColumnNode = tsCreatorNode.getElementsByTagName("column")[0];
    if (rootColumnNode) {
      json[rootColumnNode.getAttribute("id") || "unknown"] = processColumn(rootColumnNode);
    }
  }
  return json;
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
        }
        //else if (key === "topAge" || key === "baseAge") {
        //   xml += `${indent}<setting name="${key}" source="${value.source}" unit="${value.unit}">\n`;
        //   xml += `${indent}    <setting name="${value.source}">${value.text}</setting>\n`;
        //   xml += `${indent}</setting>\n`;
        // }
        else if (key === "unitsPerMY" || key === "skipEmptyColumns") {
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
function generateFontsXml(fonts: any, indent: string): string {
  let xml = "";
  for (const key in fonts) {
    if (Object.prototype.hasOwnProperty.call(fonts, key)) {
      const inheritable = fonts[key].inheritable;
      xml += `${indent}<font function="${key}" inheritable="${inheritable}"/>\n`;
    }
  }
  return xml;
}
/**
 * generates xml string with column info
 * @param jsonColumn json object with column info
 * @param stateColumn json object containing the state of the columns
 * @param indent the amount of indent to place in the xml file
 * @returns xml string with column info
 */
function generateColumnXml(
  jsonColumn: any,
  stateColumn: ColumnInfo | null,
  indent: string
): string {
  let xml = "";
  for (let key in jsonColumn) {
    if (Object.prototype.hasOwnProperty.call(jsonColumn, key)) {
      let colName = extractName(jsonColumn._id);
      //check if the user has edited the name from the given name
      let xmlKey = replaceSpecialChars(key, 0);
      // Skip the 'id' element.

      if (key === "_id") {
        continue;
      }

      if (key === "title") {
        let useEditName = false;
        if (
          colName !== "Chart Root" &&
          colName !== "Ma"
        ) {
          if (stateColumn && stateColumn !== undefined) {
            if (stateColumn.editName !== undefined && stateColumn.editName !== colName) {
              xml += `${indent}<setting name="title">${stateColumn.editName}</setting>\n`;
              useEditName = true;
            }
          }
        }
        if (!useEditName) {
          xml += `${indent}<setting name="title">${replaceSpecialChars(jsonColumn[key], 1)}</setting>\n`;
        }
      } else if (key === "backgroundColor" || key === "customColor") {
        if (jsonColumn[key].standardized && jsonColumn[key].useNamed) {
          xml += `${indent}<setting name="${xmlKey}" standardized="${jsonColumn[key].standardized}" 
          useNamed="${jsonColumn[key].useNamed}">${jsonColumn[key].text}</setting>\n`;
        } else if (jsonColumn[key].useNamed) {
          xml += `${indent}<setting name="${xmlKey}" useNamed="${jsonColumn[key].useNamed}">${jsonColumn[key].text}</setting>\n`;
        } else if (jsonColumn[key].standardized) {
          xml += `${indent}<setting name="${xmlKey}" useNamed="${jsonColumn[key].standardized}">${jsonColumn[key].text}</setting>\n`;
        } else {
          xml += `${indent}<setting name="${xmlKey}"/>\n`;
        }
      } else if (key === "customColor") {
      } else if (key === "justification") {
        xml += `${indent}<setting justification="${jsonColumn[key]}" name="${xmlKey}"/>\n`;
      } else if (key === "orientation") {
        xml += `${indent}<setting name="${xmlKey}" orientation="${jsonColumn[key]}"/>\n`;
      } else if (key === "isSelected") {
        //if column isn't in state, then use default given by the original xml
        if (stateColumn == undefined || Object.keys(stateColumn).length == 0) {
          xml += `${indent}<setting name="${xmlKey}">${jsonColumn["isSelected"]}</setting>\n`;
        }
        //always display these things (the original tsc throws an error if not selected)
        //(but online doesn't have option to deselect them)
        else if (colName === "Chart Root" || colName === "Chart Title" || colName === "Ma") {
          xml += `${indent}<setting name="${xmlKey}">true</setting>\n`;
          continue;
        }
        //check if column is checked or not, and change the isSelected field to true or false
        else if (stateColumn && !colName.includes("Chart")) {
          if (stateColumn.on) {
            xml += `${indent}<setting name="${xmlKey}">true</setting>\n`;
          } else {
            xml += `${indent}<setting name="${xmlKey}">false</setting>\n`;
          }
        }
      } else if (key.startsWith("_")) {
        xml += `${indent}<${xmlKey.slice(1)}>${jsonColumn[key]}</${xmlKey.slice(1)}>\n`;
      } else if (key === "fonts") {
        xml += `${indent}<fonts>\n`;
        xml += generateFontsXml(jsonColumn[key], `${indent}    `);
        xml += `${indent}</fonts>\n`;
      } else if (typeof jsonColumn[key] === "object") {
        xml += `${indent}<column id="${xmlKey}">\n`;
        //recursively go down column settings
        let currName = extractName(jsonColumn._id);
        let childName = extractName(jsonColumn[key]._id);
        let params: { jsonColumn: any; stateColumn: any; indent: string } = {
          jsonColumn: jsonColumn[key],
          stateColumn: null,
          indent: `${indent}    `,
        };
        if (currName == "Chart Root") {
          params.stateColumn = stateColumn;
        } else if (stateColumn != null) {
          for (let i = 0; i < stateColumn.children.length; i++) {
            if (stateColumn.children[i].name == childName) {
              params.stateColumn = stateColumn.children[i];
              break;
            }
          }
        }

        xml += generateColumnXml(params.jsonColumn, params.stateColumn, params.indent);

        xml += `${indent}</column>\n`;
      } else {
        xml += `${indent}<setting name="${xmlKey}">${replaceSpecialChars(jsonColumn[key], 1)}</setting>\n`;
      }
    }
  }
  return xml;
}
/**
 * main parser
 * a major aspect for the parser is that it can only add fields that were part of the initial input settings
 * for example, if the settings doesn't have "isSelected" fields, it won't add "isSelected" settings in the final xml.
 *
 * @param settings the initial json object used to generate a chart that contains the settings info
 * @param columnSettings json object containing the state of the columns
 * @param version the version of the jar file (TimeScale Creator)
 * @returns xml string with the entire settings info
 */
export function jsonToXml(
  settings: any,
  columnSettings: any,
  chartSettings: any,
  version: string = "PRO8.1"
): string {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<TSCreator version="${version}">\n`;
  //console.log("json 2...\n", state.settingsJSON);
  if (settings["settings"]) {
    xml += '  <settings version="1.0">\n';
    xml += generateSettingsXml(settings["settings"], chartSettings, "    ");
    xml += "  </settings>\n";
  }
  //the top level doesn't have _id so it usually doesn't proc, but
  //procs if used for a child
  if (settings["_id"]) {
    xml += `  <column id="${settings["id"]}">\n`;
    xml += generateColumnXml(settings, columnSettings, "    ");
    xml += "  </column>\n";
  }
  //generate columns
  else {
    for (const key in settings) {
      if (
        key !== "settings" &&
        Object.hasOwn(settings, key) //maybe not necessary since we are iterating over the keys of json
      ) {
        xml += `  <column id="${key}">\n`;
        xml += generateColumnXml(settings[key], columnSettings, "    ");
        xml += "  </column>\n";
      }
    }
  }
  xml += "</TSCreator>\n";
  return xml;
}
