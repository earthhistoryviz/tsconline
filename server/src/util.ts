import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import fsPromises from 'fs/promises';
import { glob } from 'glob';

/**
 * Recursively deletes directory INCLUDING directoryPath
 */
export function deleteDirectory(directoryPath: string): string {
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
        return `Directory ${directoryPath} successfully deleted`
    } else {
        return `Directory not found: ${directoryPath}`;
    }
}


/**
 * Copy a directory recursively
 */
export async function copyDirectory(src: string, destination: string): Promise<void> {
    try {
        await fsPromises.mkdir(destination, { recursive: true });

        const entries = await fsPromises.readdir(src, { withFileTypes: true });

        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(destination, entry.name);

            if (entry.isDirectory()) {
                await copyDirectory(srcPath, destPath);
            } else {
                await fsPromises.copyFile(srcPath, destPath);
            }
        }
    } catch (error) {
        console.error('An error occurred:', error);
        throw error;
    }
}
/**
 * Of the form <topDirectory>/<filename>/<botDirectory>
 */
export async function grabFilepaths(files: string[], topDirectory: string, botDirectory: string): Promise<string[]> {
    // regular expression for all filenames located in <topDirectory>/<file_name>/<botDirectory>
    const pattern = new RegExp(files.map(name => {
        const lastIndex = name.lastIndexOf(".");
        const filename = lastIndex !== -1 ? name.substring(0, lastIndex) : name;
        return `${topDirectory}/${filename}/${botDirectory}/.*`
    }).join('|'));
    let paths = await glob(`${topDirectory}/**/*`);
    paths = paths.filter(path => pattern.test(path));
    return paths 
}