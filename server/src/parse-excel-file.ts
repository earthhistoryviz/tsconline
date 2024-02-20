import XLSX from 'xlsx';

export async function parseExcelFile(filePath: string) {
    const workbook = XLSX.readFile(filePath);
    const sheetName: string = workbook.SheetNames[0] || "";
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return [];
  
    const jsonData: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
    const dataWithoutFirstRow = jsonData.slice(1);
  
    if (dataWithoutFirstRow.length > 0) {
      dataWithoutFirstRow[0] = dataWithoutFirstRow[0].slice(3);
    }
  
    return dataWithoutFirstRow;
  }