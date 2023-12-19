import { glob } from 'glob';
import { readFile } from 'fs/promises';
import pmap from 'p-map';
import type { ColumnSetting } from '@tsconline/shared';

export async function getColumns(decrypt_filepath: string): Promise<{[filepath: string]: ColumnSetting}> {
    const decrypt_paths = await glob(`${decrypt_filepath}/*`)
    function recursive(parents: string[], lastparent: string, children: string[], stateSettings: any, allEntries: any) {
        stateSettings[lastparent] = {
            on: true,
            children: {},
            parents: parents
        }
        const newParents = [...parents, lastparent];
        // console.log("lastparent: ", lastparent)
        // console.log("children: ", children)
        // console.log("stateSettings: ", stateSettings)
        // console.log("parents: ", parents)
        children.forEach((child) => {
            if (child && allEntries.get(child)) {
                recursive(
                    newParents, 
                    child, 
                    allEntries.get(child), 
                    stateSettings[lastparent].children, 
                    allEntries
                )
            } else if (!allEntries.get(child)){
                recursive(
                    newParents,
                    child,
                    [],
                    stateSettings[lastparent].children,
                    allEntries
                )
            }
        });
        // parents.pop();
    }
    let fileSettingsMap: { [filePath: string]: ColumnSetting } = {};
    await pmap(decrypt_paths, async (decryptedfile) => {
        try {
            let settings: ColumnSetting = {}; 
            const contents = (await readFile(decryptedfile)).toString();
            let lines = contents.split("\n");
            const allEntries: Map<string, string[]> = new Map();

            // First, gather all parents and their direct children
            lines.forEach(line => {
                if (!line || !line.includes("\t:\t")) return;
                const parent = line.split("\t:\t")[0];
                const childrenstring = line.split("\t:\t")[1];
                if (!parent || !childrenstring) return;

                const children = childrenstring.split('\t');
                allEntries.set(parent, children);
            });
            allEntries.forEach((children, parent) => {
                recursive([], parent, children, settings,allEntries);
            });
            fileSettingsMap[decryptedfile] = settings;
            return 1;
            // console.log(JSON.stringify(settings, null, 2));
        } catch (e: any) {
            console.log('ERROR: failed to read columns for path '+decryptedfile+'.  Error was: ', e);
            return 0; 
        }
    })
    return fileSettingsMap;
}