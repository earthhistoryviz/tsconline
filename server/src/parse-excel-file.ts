import XLSX from "xlsx";

/**
 * Parses an Excel file into a 2D array of data.
 *
 * @param filePath The path to the excel file
 * @param skipRows The number of rows to skip (optional, default is 0)
 * @returns A 2D array of the data in the excel file
 */
export async function parseExcelFile(filePath: string, skipRows: number = 0) {
  const workbook = XLSX.readFile(filePath);
  const sheetName: string = workbook.SheetNames[0] || "";
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];

  const jsonData: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const dataWithoutHeader = jsonData.slice(skipRows);

  if (!dataWithoutHeader || dataWithoutHeader.length == 0) {
    throw new Error("No data available after removing header");
  }

  return dataWithoutHeader;
}
