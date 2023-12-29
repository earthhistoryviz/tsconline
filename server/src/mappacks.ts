import fs from 'fs/promises';
import path from 'path';
import { grabFilepaths } from './util.js'
import assetconfigs from './index.js';
import pmap from 'p-map';

export async function grabMapImages(datapacks: string[], destination: string) {
    const image_paths = await grabFilepaths(datapacks, assetconfigs.decryptionDirectory, "MapImages")
    const compiled_images: string[] = [];
    try {
        // recursive: true ensures if it already exists, we continue with no error
        await fs.mkdir(destination, { recursive: true });
        await pmap(image_paths, async (image_path) => {
            const fileName = path.basename(image_path);
            const destPath = path.join(destination, fileName);
            try {
                await fs.copyFile(image_path, destPath);
                compiled_images.push(`/${destPath}`)
            } catch (e) {
                console.log("Error copying image file, file could already exist. Resulting Error: ", e)
            }
        }, { concurrency: 5 }); // Adjust concurrency as needed
    } catch(e) {
        console.log("Error processing image paths for datapacks: ", datapacks, " \n",
        "With error: ", e)
    }
    return compiled_images
}