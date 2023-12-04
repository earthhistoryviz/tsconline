import express, { Request, Response } from 'express';
import XLSX from 'xlsx';

function readExcelFile(filePath: string): string[] {
  const workbook = XLSX.readFile(filePath);
  const sheetName: string = workbook.SheetNames[0]; // Assuming the data is in the first sheet
  const sheet = workbook.Sheets[sheetName];

  const columnData: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 }) // Convert sheet to array of arrays
    .filter((row: string[]) => row.length >= 3) // Filter rows with at least 3 columns
    .map((row: string[]) => row[2]); // Extract data from third column
  const uniqueValues: string[] = Array.from(new Set(columnData));

  return uniqueValues;
}

const app = express();

// Endpoint to serve the timescale data
app.get('/timescale', (req: Request, res: Response) => {
  const timescaleData = readExcelFile('path.xlsx'); // what is path.xlsx from the GitHub repo?
  res.json({ stages: timescaleData });
});

// const PORT: number = 3001; // Choose a port for your server
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });
