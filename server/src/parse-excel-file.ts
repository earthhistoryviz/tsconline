import XLSX from "xlsx";

/**
 * Parses an Excel file into a 2D array of data.
 *
 * @param filePath The path to the excel file
 * @param skipRows The number of rows to skip (optional, default is 1)
 * @param hasHeader Whether the excel file has a header (optional, default is true)
 * @returns A 2D array of the data in the excel file
 */
export async function parseExcelFile(filePath: string, skipRows: number = 1, hasHeader: boolean = true) {
  const workbook = XLSX.readFile(filePath);
  const sheetName: string = workbook.SheetNames[0] || "";
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];

  const jsonData: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const startRow = hasHeader ? skipRows : 0;
  const dataWithoutHeader = jsonData.slice(startRow);

  if (!dataWithoutHeader || dataWithoutHeader.length == 0) {
    throw new Error("No data available after removing header");
  }

  return dataWithoutHeader;
}
