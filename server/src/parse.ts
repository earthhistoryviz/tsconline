import { glob } from 'glob';
import { readFile } from 'fs/promises';
import pmap from 'p-map';
import type { ColumnSetting } from '@tsconline/shared';

export async function getColumns(decrypt_filepath: string): Promise<{[filepath: string]: ColumnSetting}> {
    const decrypt_paths = await glob(`${decrypt_filepath}/*`)
    function spliceArrayAtFirstSpecialMatch(array: string[]): string[] {
        const regexQuotePattern = /"*"/;
        const regexSpacePattern = /"\s*"/;
        const metaColumnOffIndex = array.findIndex(item => item === "_METACOLUMN_OFF");
        const spaceIndex = array.findIndex(item => regexSpacePattern.test(item))
        const quoteIndex = array.findIndex(item => regexQuotePattern.test(item));

        // Determine the first index where either condition is met
        let indices = [metaColumnOffIndex, quoteIndex, spaceIndex].filter(index => index !== -1);
        const firstIndex = indices.length > 0 ? Math.min(...indices) : -1;
        if (firstIndex !== -1) {
            return array.slice(0, firstIndex);
        }
    
        return array; // Return the original array if no special condition is met
    }
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
            delete allEntries[child]
        });
        delete allEntries[lastparent]
        // parents.pop();
    }
    let fileSettingsMap: { [filePath: string]: ColumnSetting } = {};
    await pmap(decrypt_paths, async (decryptedfile) => {
        try {
            const isChild: Set<string> = new Set();
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

                const children = spliceArrayAtFirstSpecialMatch(childrenstring.split('\t'));
                console.log(children)
                allEntries.set(parent, children);
            });
            allEntries.forEach(children => {
                children.forEach(child => {
                    isChild.add(child);
                });
            });
            allEntries.forEach((children, parent) => {
                if (!isChild.has(parent)) { 
                    recursive([], parent, children, settings,allEntries);
                }
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