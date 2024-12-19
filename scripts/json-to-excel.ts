import * as fs from "fs";
import * as path from "path";
import * as XLSX from "xlsx";

const inputExcelFile = path.join(en.json, "app/translation/en.json");
const outputJsonFile = path.join(Translation_Keys.xlsx, "app/translation/Translation Keys.xlsx");

const convertExcelToJson = () => {
  try {
    const workbook = XLSX.readFile(inputExcelFile);
    const sheetName = workbook.SheetNames[0]; // Use the first sheet
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    const translations: Record<string, string> = {};
    jsonData.forEach((row) => {
      if (row[0] && row[1]) {
        translations[row[0]] = row[1];
      }
    });

    fs.writeFileSync(outputJsonFile, JSON.stringify(translations, null, 2));
    console.log(`Successfully converted ${inputExcelFile} to ${outputJsonFile}`);
  } catch (error) {
    console.error(`Error converting Excel to JSON: ${error.message}`);
  }
};

convertExcelToJson();
