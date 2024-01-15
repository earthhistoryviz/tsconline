//-------------------------------------------------------------------------------------------------- //
//                                          XML to JSON parser                                       //
//-------------------------------------------------------------------------------------------------- //

import { TempleBuddhist } from "@mui/icons-material";
import { state } from "./state";
import { set } from "mobx";

function processSettings(settingsNode: any): any {
  const settings: any = {};
  const settingNodes = settingsNode.getElementsByTagName("setting");
  //console.log(settingsNode);
  for (let i = 0; i < settingNodes.length; i++) {
    const settingNode = settingNodes[i];
    const settingName = settingNode.getAttribute("name");
    const nestedSettingsNode = settingNode.getElementsByTagName("setting")[0];
    const justificationValue = settingNode.getAttribute("justification");
    const settingValue = nestedSettingsNode
      ? nestedSettingsNode.textContent.trim()
      : settingNode.textContent.trim();
    //when the setting object is created, it looks like the nested objects in topAge and baseAge
    //are taken out and created as standalone setting options. This should not happen,
    //so skip when the setting name is text.
    if (settingName === "text") {
      continue;
    } else if (settingName === "topAge" || settingName === "baseAge") {
      settings[settingName] = {
        source: "text",
        unit: "Ma",
        text: settingValue,
      };
    }
    //these two tags have units, so make an object storing its unit and value
    else if (
      settingName === "unitsPerMY" ||
      settingName === "skipEmptyColumns"
    ) {
      settings[settingName] = {
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
  // console.log(
  //   "result of processSettings in xmlToJson under actions...\n",
  //   settings
  // );
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
          const orientationValue = child.getAttribute("orientation");
          const useNamedValue = child.getAttribute("useNamed");
          //console.log(settingName);
          if (
            settingName === "backgroundColor" ||
            settingName === "customColor"
          ) {
            if (useNamedValue !== null) {
              result[settingName] = {
                useNamed: useNamedValue,
                text: child.textContent.trim(),
              };
            } else {
              result[settingName] = child.textContent.trim();
            }
          } else if (justificationValue !== null) {
            result[settingName] = justificationValue;
          } else if (orientationValue !== null) {
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

//the main parser
export function xmlToJson(xml: string): any {
  // console.log("xml at start of xmlToJson...\n", xml);
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
  // console.log("json at end of xmlToJson\n", json);
  return json;
}

//-------------------------------------------------------------------------------------------------- //
//                                          JSON to XML parser                                       //
//-------------------------------------------------------------------------------------------------- //

function generateSettingsXml(settings: any, indent: string = ""): string {
  let xml = "";
  //console.log(settings);
  for (const key in settings) {
    if (Object.prototype.hasOwnProperty.call(settings, key)) {
      const value = settings[key];
      //console.log(key, value);
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
        if (key === "topAge" || key === "baseAge") {
          xml += `${indent}<setting name="${key}" source="${value.source}" unit="${value.unit}">\n`;
          xml += `${indent}  <setting name="text">${value.text}</setting>\n`;
          xml += `${indent}</setting>\n`;
        } else if (key === "unitsPerMY" || key === "skipEmptyColumns") {
          xml += `${indent}<setting name="${key}" unit="${value.unit}">${value.text}</setting>\n`;
        }
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

function generateColumnXml(
  jsonColumn: any,
  stateColumn: any | null,
  parent: string,
  indent: string
): string {
  let xml = "";
  //let columns = state.settingsTabs.columns;
  //console.log("start ", parent, column, stateColumn);
  //console.log("poop", jsonColumn);
  for (let key in jsonColumn) {
    if (Object.prototype.hasOwnProperty.call(jsonColumn, key)) {
      //for replacing special characters in the key to its xml versions
      let xmlKey = key;
      xmlKey = key.replaceAll('"', "quot&;");
      xmlKey = key.replaceAll("&", "&amp;");
      xmlKey = key.replaceAll("<", " &lt; ");
      xmlKey = key.replaceAll(">", " &gt; ");
      xmlKey = key.replaceAll("'", "&apos;");
      //console.log(key);
      if (key === "_id") {
        // Skip the 'id' element.
        continue;
      } else if (key === "backgroundColor" || key === "customColor") {
        if (jsonColumn[key].useNamed) {
          xml += `${indent}<setting name="${xmlKey}" useNamed="${jsonColumn[key].useNamed}">${jsonColumn[key].text}</setting>\n`;
        } else {
          xml += `${indent}<setting name="${xmlKey}"/>\n`;
        }
      } else if (key === "customColor") {
      } else if (key === "justification") {
        xml += `${indent}<setting justification="${jsonColumn[key]}" name="${xmlKey}"/>\n`;
      } else if (key === "orientation") {
        xml += `${indent}<setting name="${xmlKey}" orientation="${jsonColumn[key]}"/>\n`;
      } else if (key === "isSelected") {
        //extract column name
        let colName = jsonColumn._id.substring(
          jsonColumn._id.indexOf(":") + 1,
          jsonColumn._id.length
        );
        //always display these things (the original tsc throws an error if not selected)
        //(but online doesn't have option to deselect them)
        if (
          colName === "Chart Root" ||
          colName === "Chart Title" ||
          colName === "Ma"
        ) {
          xml += `${indent}<setting name="${xmlKey}">true</setting>\n`;
          continue;
        }
        //if column isn't in state, then use default given by the original xml
        else if (stateColumn === null) {
          xml += `${indent}<setting name="${xmlKey}">${jsonColumn["isSelected"]}</setting>\n`;
        }
        //let temp = column._id.split(":")[1];
        //check if column is checked or not, and change the isSelected field to true or false
        if (stateColumn && !parent.includes("Chart") && parent != "") {
          //console.log("inside on", column._id);
          //console.log(stateColumn.on);
          if (stateColumn.on) {
            xml += `${indent}<setting name="${xmlKey}">true</setting>\n`;
          } else {
            xml += `${indent}<setting name="${xmlKey}">false</setting>\n`;
          }
        }
      } else if (key.startsWith("_")) {
        xml += `${indent}<${xmlKey.slice(1)}>${jsonColumn[key]}</${xmlKey.slice(
          1
        )}>\n`;
      } else if (key === "fonts") {
        xml += `${indent}<fonts>\n`;
        xml += generateFontsXml(jsonColumn[key], `${indent}  `);
        xml += `${indent}</fonts>\n`;
      } else if (typeof jsonColumn[key] === "object") {
        xml += `${indent}<column id="${xmlKey}">\n`;
        //pass the full state of columns for first iteration
        if (key === "class datastore.RootColumn:Chart Title") {
          xml += generateColumnXml(
            jsonColumn[key],
            stateColumn,
            key,
            `${indent}  `
          );
        }
        //recursively go down column settings
        else {
          let temp = jsonColumn[key]._id.substring(
            jsonColumn[key]._id.indexOf(":") + 1,
            jsonColumn[key]._id.length
          );
          if (stateColumn === null) {
            xml += generateColumnXml(
              jsonColumn[key],
              null,
              temp,
              `${indent}  `
            );
          }
          if (stateColumn != null) {
            // reached end of column tree, no more children
            if (
              stateColumn.children == null ||
              stateColumn.children == undefined
            ) {
              xml += generateColumnXml(
                jsonColumn[key],
                null,
                temp,
                `${indent}  `
              );
            } else {
              //more children to be had
              xml += generateColumnXml(
                jsonColumn[key],
                stateColumn.children[temp],
                temp,
                `${indent}  `
              );
            }
          }
        }
        xml += `${indent}</column>\n`;
      } else {
        xml += `${indent}<setting name="${xmlKey}">${jsonColumn[key]}</setting>\n`;
      }
    }
  }
  return xml;
}
//the main parser
export function jsonToXml(json: any, version: string = "PRO8.1"): string {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<TSCreator version="${version}">\n`;
  //console.log("json 2...\n", state.settingsJSON);
  if (json["settings"]) {
    xml += '  <settings version="1.0">\n';
    xml += generateSettingsXml(json["settings"], "    ");
    xml += "  </settings>\n";
  }
  //the top level doesn't have _id so it usually doesn't proc, but
  //procs if used for a child
  if (json["_id"]) {
    xml += `  <column id="${json["id"]}">\n`;
    let temp = state.settingsTabs.columns;
    xml += generateColumnXml(json, temp, "", "    ");
    xml += "  </column>\n";
  }
  //generate columns
  else {
    for (const key in json) {
      if (
        key !== "settings" &&
        Object.hasOwn(json, key) //maybe not necessary since we are iterating over the keys of json
      ) {
        //console.log(key);
        xml += `  <column id="${key}">\n`;
        xml += generateColumnXml(
          json[key],
          state.settingsTabs.columns,
          "",
          "    "
        );
        xml += "  </column>\n";
      }
    }
  }
  xml += "</TSCreator>\n";
  //when the xml file is converted to json, the special characters in xml are
  //changed back to their original characters. The next code is to change them back
  //so the java app can have the correct xml format. Currently only works with the
  //Africa Nigeria map, more edge cases might be considered with other datapacks.
  // xml = xml.replaceAll("&", "&amp;");
  // xml = xml.replaceAll(" < ", " &lt; ");
  // xml = xml.replaceAll(" > ", " &gt; ");
  // xml = xml.replaceAll(' "', " &quot;");
  // xml = xml.replaceAll("'", "&apos;");
  // for (let i = 5; i < xml.length; i++) {
  //   if (
  //     xml.at(i) === '"' &&
  //     xml.at(i - 1) !== "=" &&
  //     xml.at(i + 1) !== "/" &&
  //     xml.at(i + 1) !== ">" &&
  //     xml.at(i + 1) !== ">" &&
  //     xml.at(i + 1) !== "?" &&
  //     xml.at(i + 1) !== " "
  //   ) {
  //     xml = xml.substring(0, i) + "&quot;" + xml.substring(i + 1, xml.length);
  //   }
  //   if (xml.at(i) === "<" && xml.at(i - 1) === "(") {
  //     xml = xml.substring(0, i) + "&lt;" + xml.substring(i + 1, xml.length);
  //   }
  // }
  console.log("printing final xml...\n", xml);
  return xml;
}
