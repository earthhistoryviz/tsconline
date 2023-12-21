import fs from 'fs';
import path from 'path';
export function deleteDirectory(directory: string) {
    fs.readdir(directory, (err, files) => {
        if (err) {
        // handle error
        console.log(err);
        return;
        }
    
        for (const file of files) {
            fs.unlink(path.join(directory, file), err => {
                if (err) {
                // handle error
                console.log(err);
                } else {
                console.log(`Deleted: ${file}`);
                }
            });
        }
        fs.rmdir(directory, err => {
        if (err) {
            // handle error
            console.log(err);
        } else {
            console.log(`Deleted: ${directory}`);
        }
        });
    });
}