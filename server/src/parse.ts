import { glob } from 'glob';
import { readFile } from 'fs/promises';
import pmap from 'p-map';

export async function getColumns(decrypt_filepath: string) {
    const decrypt_paths = await glob(`${decrypt_filepath}/*`)
    return pmap(decrypt_paths, async (decryptedfile) => {
        try {
            const contents = (await readFile(decryptedfile)).toString();
            console.log(contents);
        } catch (e: any) {
            console.log('ERROR: failed to read colums for path '+decryptedfile+'.  Error was: ', e);
        }
    })
}