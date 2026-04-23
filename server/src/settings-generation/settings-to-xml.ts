import { ColumnInfo, ChartSettingsInfoTSC, buildTscXmlDocument } from "@tsconline/shared";

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
 * Main function to convert ColumnInfo to XML settings
 */
export function jsonToXml(state: ColumnInfo, settings: ChartSettingsInfoTSC, version: string = "PRO8.1"): string {
  const settingsXml = generateSettingsXml(settings, "        ");
  return buildTscXmlDocument(state, settingsXml, version);
}
