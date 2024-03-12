import XLSX from "xlsx";

export async function parseExcelFile(filePath: string) {
  const workbook = XLSX.readFile(filePath);
  const sheetName: string = workbook.SheetNames[0] || "";
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];

  const jsonData: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const dataWithoutHeader = jsonData.slice(2);

  if (!dataWithoutHeader || dataWithoutHeader.length == 0) {
    throw new Error("No data available after removing header");
  }

  return dataWithoutHeader;
}
