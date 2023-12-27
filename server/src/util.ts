import fs from 'fs';
import path from 'path';
import PDFParser from 'pdf2json';
import { exec } from 'child_process';

/**
 * Recursively deletes directory INCLUDING directoryPath
 */
export function deleteDirectory(directoryPath: string) {
    // Check if the directory exists
    if (fs.existsSync(directoryPath)) {
        fs.readdirSync(directoryPath).forEach((file) => {
            const currentPath = path.join(directoryPath, file);

            // Check if the current path is a directory
            if (fs.lstatSync(currentPath).isDirectory()) {
                deleteDirectory(currentPath);
            } else {
                // Delete the file
                fs.unlinkSync(currentPath);
                console.log(`Deleted file: ${currentPath}`)
            }
        });

        // Delete the now-empty directory
        fs.rmdirSync(directoryPath);
    } else {
        console.log("Directory not found: ", directoryPath);
    }
}
/**
 * Will attempt to read pdf and return whether it can or not
 * Runs with await
 */
export function checkIfPdfIsReady(hash: string, chartsDirectory: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        const filepath = `${chartsDirectory}/${hash}/chart.pdf`;
        if (!fs.existsSync(filepath)) {
            return resolve(false);
        }

        const pdfParser = new PDFParser();

        pdfParser.on('pdfParser_dataError', (errData: any) => {
            console.error('PDF Parser Error:', errData.parserError);
            resolve(false);
        });

        pdfParser.on('pdfParser_dataReady', _pdfData => {
            console.log("Successfully read chart.pdf");
            resolve(true);
        });

        pdfParser.loadPDF(filepath);
    });
}