import fs from 'fs';
import path from 'path';
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