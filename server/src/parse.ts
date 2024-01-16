import { readFile } from "fs/promises";
import pmap from "p-map";
import type { ColumnInfo } from "@tsconline/shared";
import { grabFilepaths } from "./util.js";
import { DOMParser } from "@xmldom/xmldom";

//-------------------------------------------------------------------------------------------------- //
//                                          XML to JSON parser                                       //
//-------------------------------------------------------------------------------------------------- //

function processSettings(settingsNode: any): any {
  const settings: any = {};
  const settingNodes = settingsNode.getElementsByTagName("setting");
  for (let i = 0; i < settingNodes.length; i++) {
    const settingNode = settingNodes[i];
    const settingName = settingNode.getAttribute("name");
    const nestedSettingsNode = settingNode.getElementsByTagName("setting")[0];
    //TODO: determine what the value of this is if there isn't a justification value
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
    } else if (justificationValue.length !== 0) {
      settings[settingName] = justificationValue;
    } else {
      const settingValue = settingNode.textContent.trim();
      settings[settingName] = settingValue;
    }
  }
  //console.log("result of processSettings in xmlToJson...\n", settings);
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
  //console.log("result of processFonts in xmlToJson...\n", fonts);
  return fonts;
}

function processColumn(node: any): any {
  const result: any = {};
  const nodeAttributes = node.attributes;

  if (nodeAttributes.length > 0) {
    for (let i = 0; i < nodeAttributes.length; i++) {
      const attribute = nodeAttributes[i];
      if (attribute.value.includes("INIOPTERYGIA")) {
        console.log(
          `attribute.name: ${attribute.name}\nattribute.value: ${attribute.value}`
        );
      }
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
          } else if (justificationValue.length !== 0) {
            result[settingName] = justificationValue;
          } else if (orientationValue.length !== 0) {
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
  //console.log("xml at start of xmlToJson...\n", xml);
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
  //console.log("json at end of xmlToJson\n", json);
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
  for (let key in jsonColumn) {
    if (Object.prototype.hasOwnProperty.call(jsonColumn, key)) {
      //for replacing special characters in the key to its xml versions
      let xmlKey = key;
      xmlKey = key.replaceAll('"', "quot&;");
      xmlKey = key.replaceAll("&", "&amp;");
      xmlKey = key.replaceAll("<", " &lt; ");
      xmlKey = key.replaceAll(">", " &gt; ");
      xmlKey = key.replaceAll("'", "&apos;");
      //console.log(jsonColumn[key]);
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
          //TODO: make initial stateColumn object wh
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
export function jsonToXml(
  settings: any,
  columnSettings: any,
  version: string = "PRO8.1"
): string {
  //console.log("in json to xml", settings);
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<TSCreator version="${version}">\n`;
  //console.log("json 2...\n", state.settingsJSON);
  if (settings["settings"]) {
    xml += '  <settings version="1.0">\n';
    xml += generateSettingsXml(settings["settings"], "    ");
    xml += "  </settings>\n";
  }
  //the top level doesn't have _id so it usually doesn't proc, but
  //procs if used for a child
  if (settings["_id"]) {
    xml += `  <column id="${settings["id"]}">\n`;
    let temp = columnSettings;
    xml += generateColumnXml(settings, temp, "", "    ");
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
        xml += generateColumnXml(settings[key], columnSettings, "", "    ");
        xml += "  </column>\n";
      }
    }
  }
  xml += "</TSCreator>\n";
  //console.log("xml at the end of json to xml", xml, "asdfasdf");
  return xml;
}

/**
 * TODO:
 * This function is meant to catch all strange occurences at the end
 * of the tab seperated decrypted file. Should get rid of METACOLUMN_OFF
 * and any extraneuous info bits that shouldn't be a togglable column.
 * At the moment, is not currently working
 */
function spliceArrayAtFirstSpecialMatch(array: string[]): string[] {
  const regexQuotePattern = /href=["'][^"']*["']/;
  // const regexSpacePattern = /\s+/;
  const metaColumnOffIndex = array.findIndex(
    (item) => item === "_METACOLUMN_OFF"
  );
  // const spaceIndex = array.findIndex(item => regexSpacePattern.test(item))
  const quoteIndex = array.findIndex((item) => regexQuotePattern.test(item));

  // Determine the first index where either condition is met
  let indices = [metaColumnOffIndex, quoteIndex].filter(
    (index) => index !== -1
  );
  const firstIndex = indices.length > 0 ? Math.min(...indices) : -1;
  if (firstIndex !== -1) {
    return array.slice(0, firstIndex);
  }
  // if (array.length > 2 && array[array.length - 1] !== "" && array[array.length - 2] !== "") {
  //     array = array.slice(0, -2);
  // }
  if (array[array.length - 1]!.trim() === "") {
    return array.slice(0, -1);
  }
  return array;
}

/**
 * This is a recursive function meant to instantiate all columns.
 * Datapack is encrypted as <parent>\t:\t<child>\t<child>\t<child>
 * Where children could be parents later on
 */
function recursive(
  parents: string[],
  lastparent: string,
  children: string[],
  stateSettings: any,
  allEntries: any
) {
  //if somehow the data at this point is _METACOLUMN_OFF, remove it
  const index = lastparent.indexOf("_METACOLUMN_OFF");
  if (index != -1) {
    lastparent = lastparent.slice(0, index);
  }
  stateSettings[lastparent] = {
    on: true,
    children: {},
    parents: parents,
  };
  const newParents = [...parents, lastparent];
  // console.log("lastparent: ", lastparent)
  // console.log("children: ", children)
  // console.log("stateSettings: ", stateSettings)
  // console.log("parents: ", parents)
  children.forEach((child) => {
    if (child && allEntries.get(child)) {
      recursive(
        newParents,
        child,
        allEntries.get(child),
        stateSettings[lastparent].children,
        allEntries
      );
    } else if (!allEntries.get(child)) {
      recursive(
        newParents,
        child,
        [],
        stateSettings[lastparent].children,
        allEntries
      );
    }
  });
}

/**
 * Main Function...
 * Get columns based on a decrypt_filepath that leads to the decrypted directory
 * and an amount of files in a string array that should pop up in that decrypted directory
 * Have not checked edge cases in which a file doesn't show up, will only return any that are correct.
 * Maybe add functionality in the future to check if all the files exist
 */
export async function parseDatapacks(
  decrypt_filepath: string,
  files: string[]
): Promise<{ columns: ColumnInfo }> {
  const decrypt_paths = await grabFilepaths(
    files,
    decrypt_filepath,
    "datapacks"
  );
  if (decrypt_paths.length == 0) return { columns: {} };
  // let fileSettingsMap: { [filePath: string]: ColumnInfo } = {};
  let decryptedfiles: String = "";
  let settings: ColumnInfo = {};
  //put all contents into one string for parsing
  await pmap(decrypt_paths, async (decryptedfile) => {
    const contents = (await readFile(decryptedfile)).toString();
    decryptedfiles = decryptedfiles + "\n" + contents;
  });
  try {
    const isChild: Set<string> = new Set();
    let lines = decryptedfiles.split("\n");
    const allEntries: Map<string, string[]> = new Map();

    // First, gather all parents and their direct children
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      if (!line.includes("\t:\t")) {
        if (line.includes(":") && line.split(":")[0]!.includes("age units")) {
          //create MA setting since this doesn't follow the standard format of "\t:\t"
          settings["MA"] = {
            on: true,
            children: {},
            parents: [],
          };
        }
        continue;
      }
      const parent = line.split("\t:\t")[0];
      let childrenstring = line.split("\t:\t")[1];
      if (!parent || !childrenstring) continue;
      childrenstring = childrenstring!.split("\t\t")[0];
      let children = spliceArrayAtFirstSpecialMatch(
        childrenstring!.split("\t")
      );
      allEntries.set(parent, children);
    }
    //if the entry is a child, add it to a set.
    allEntries.forEach((children) => {
      children.forEach((child) => {
        isChild.add(child);
      });
    });
    // only iterate over parents. if we encounter one that is a child, the recursive function
    // should have already processed it.
    allEntries.forEach((children, parent) => {
      if (!isChild.has(parent)) {
        recursive([], parent, children, settings, allEntries);
      }
    });
    // console.log(JSON.stringify(settings, null, 2));
  } catch (e: any) {
    console.log(
      "ERROR: failed to read columns for path " +
        decryptedfiles +
        ".  Error was: ",
      e
    );
  }
  return { columns: settings };
}
