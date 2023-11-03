//-------------------------------------------------------------------------------------------------- //
//                                          XML to JSON parser                                       //
//-------------------------------------------------------------------------------------------------- //

import { ColumnSetting, state } from "./state";

function processSettings(settingsNode: any): any {
  const settings: any = {};
  const settingNodes = settingsNode.getElementsByTagName("setting");
  for (let i = 0; i < settingNodes.length; i++) {
    const settingNode = settingNodes[i];
    const settingName = settingNode.getAttribute("name");
    const nestedSettingsNode = settingNode.getElementsByTagName("setting")[0];
    const justificationValue = settingNode.getAttribute("justification");
    const settingValue = nestedSettingsNode
      ? nestedSettingsNode.textContent.trim()
      : settingNode.textContent.trim();

    if (settingName === "topAge" || settingName === "baseAge") {
      settings[settingName] = {
        source: "text",
        unit: "Ma",
        text: settingValue,
      };
    } else if (justificationValue !== null) {
      settings[settingName] = justificationValue;
    } else {
      const settingValue = settingNode.textContent.trim();
      settings[settingName] = settingValue;
    }
  }
  return settings;
}

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

      if (child.nodeType === Node.ELEMENT_NODE) {
        const childName = child.getAttribute("id");

        if (child.nodeName === "column") {
          result[childName] = processColumn(child);
        } else if (child.nodeName === "fonts") {
          result["fonts"] = processFonts(child);
        } else if (child.nodeName === "setting") {
          const settingName = child.getAttribute("name");
          const justificationValue = child.getAttribute("justification");

          if (justificationValue !== null) {
            result[settingName] = justificationValue;
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

//the main parser
export function xmlToJson(xml: string): any {
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
      json[rootColumnNode.getAttribute("id") || "unknown"] =
        processColumn(rootColumnNode);
    }
  }

  return json;
}

//-------------------------------------------------------------------------------------------------- //
//                                          JSON to XML parser                                       //
//-------------------------------------------------------------------------------------------------- //

function generateSettingsXml(settings: any, indent: string = ""): string {
  let xml = "";
  for (const key in settings) {
    if (Object.prototype.hasOwnProperty.call(settings, key)) {
      const value = settings[key];
      //TODO: hard coded top age and base age for testing africa and nigeria datapack, change later
      // if (key === "topAge") {
      //   xml += `${indent}<setting name="${key}" source="text" unit="Ma">\n`;
      //   xml += `${indent}${indent}<setting name="stage">Present (0 Ma)</setting>\n`;
      //   xml += `${indent}${indent}<setting name="text">0.0</setting>\n`;
      //   xml += `${indent}</setting>\n`;
      // } else if (key === "baseAge") {
      //   xml += `${indent}<setting name="${key}" source="text" unit="Ma">\n`;
      //   xml += `${indent}${indent}<setting name="stage">Lt. Pleist. (0.129 Ma base</setting>\n`;
      //   xml += `${indent}${indent}<setting name="text">10.0</setting>\n`;
      //   xml += `${indent}</setting>\n`;
      // }
      if (typeof value === "object") {
        xml += `${indent}<setting name="${key}" source="${value.source}" unit="${value.unit}">\n`;
        xml += `${indent}  <setting name="text">${value.text}</setting>\n`;
        xml += `${indent}</setting>\n`;
      } else if (key === "justification") {
        xml += `${indent}<setting justification="${value}" name="${key}"/>\n`;
      } else {
        xml += `${indent}<setting name="${key}">${value}</setting>\n`;
      }
    }
  }
  return xml;
}

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

function generateColumnXml(column: any, indent: string): string {
  let xml = "";
  let columns = state.settingsTabs.columns;
  for (const key in column) {
    //console.log(key);
    if (Object.prototype.hasOwnProperty.call(column, key)) {
      //console.log(key);
      if (key === "id") {
        // Skip the 'id' element.
        continue;
      } else if (key.startsWith("_")) {
        xml += `${indent}<${key.slice(1)}>${column[key]}</${key.slice(1)}>\n`;
      } else if (key === "fonts") {
        xml += `${indent}<fonts>\n`;
        xml += generateFontsXml(column[key], `${indent}  `);
        xml += `${indent}</fonts>\n`;
      } else if (typeof column[key] === "object") {
        xml += `${indent}<column id="${key}">\n`;
        xml += generateColumnXml(column[key], `${indent}  `);
        xml += `${indent}</column>\n`;
      } else {
        if (`${key}` === "isSelected") {
          //extract column name
          let temp = column._id.substring(
            column._id.indexOf(":") + 1,
            column._id.length
          );
          console.log(temp);
          //check if column is checked or not, and change the isSelected field to true or false
          if (columns[temp]) {
            console.log(columns[temp].on);
            if (columns[temp].on) {
              xml += `${indent}<setting name="${key}">true</setting>\n`;
            } else {
              xml += `${indent}<setting name="${key}">false</setting>\n`;
            }
          }
        } else
          xml += `${indent}<setting name="${key}">${column[key]}</setting>\n`;
      }
    }
  }
  return xml;
}
//the main parser
export function jsonToXml(json: any, version: string = "PRO8.0"): string {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<TSCreator version="${version}">\n`;

  if (json["settings"]) {
    xml += '  <settings version="1.0">\n';
    xml += generateSettingsXml(json["settings"], "    ");
    xml += "  </settings>\n";
  }

  if (json["id"]) {
    xml += `  <column id="${json["id"]}">\n`;
    xml += generateColumnXml(json, "    ");
    xml += "  </column>\n";
  }
  //generate columns
  else {
    for (const key in json) {
      if (
        key !== "settings" &&
        key !== "id" &&
        Object.prototype.hasOwnProperty.call(json, key)
      ) {
        xml += `  <column id="${key}">\n`;
        xml += generateColumnXml(json[key], "    ");
        xml += "  </column>\n";
      }
    }
  }
  xml += "</TSCreator>\n";
  //when the xml file is converted to json, the special characters in xml are
  //changed back to their original characters. The next code is to change them back
  //so the java app can have the correct xml format. Currently only works with the
  //Africa Nigeria map, more edge cases might be considered with other datapacks.
  xml = xml.replaceAll("&", "&amp;");
  xml = xml.replaceAll(" < ", " &lt; ");
  xml = xml.replaceAll(" > ", " &gt; ");
  xml = xml.replaceAll(' "', " &quot;");
  xml = xml.replaceAll("'", "&apos;");
  for (let i = 5; i < xml.length; i++) {
    if (
      xml.at(i) === '"' &&
      xml.at(i - 1) !== "=" &&
      xml.at(i + 1) !== "/" &&
      xml.at(i + 1) !== ">" &&
      xml.at(i + 1) !== ">" &&
      xml.at(i + 1) !== "?" &&
      xml.at(i + 1) !== " "
    ) {
      xml = xml.substring(0, i) + "&quot;" + xml.substring(i + 1, xml.length);
    }
    if (xml.at(i) === "<" && xml.at(i - 1) === "(") {
      xml = xml.substring(0, i) + "&lt;" + xml.substring(i + 1, xml.length);
    }
  }
  return xml;
}
