import { glob } from 'glob';
import { readFile } from 'fs/promises';
import pmap from 'p-map';
import type { ColumnSetting } from '@tsconline/shared';

export async function getColumns(decrypt_filepath: string, files: string[]): Promise<ColumnSetting> {
    const pattern = new RegExp(files.map(name => `${decrypt_filepath}/${name}`).join('|'));
    // console.log("pattern: ", pattern)
    let decrypt_paths = await glob(`${decrypt_filepath}/*`);
    decrypt_paths = decrypt_paths.filter(path => pattern.test(path));
    // console.log("result: ", decrypt_paths)
    function spliceArrayAtFirstSpecialMatch(array: string[]): string[] {
        const regexQuotePattern = /href=["'][^"']*["']/;
        // const regexSpacePattern = /\s+/;
        const metaColumnOffIndex = array.findIndex(item => item === "_METACOLUMN_OFF");
        // const spaceIndex = array.findIndex(item => regexSpacePattern.test(item))
        const quoteIndex = array.findIndex(item => regexQuotePattern.test(item));

        // Determine the first index where either condition is met
        let indices = [metaColumnOffIndex, quoteIndex].filter(index => index !== -1);
        const firstIndex = indices.length > 0 ? Math.min(...indices) : -1;
        if (firstIndex !== -1) {
            return array.slice(0, firstIndex);
        }
        // if (array.length > 2 && array[array.length - 1] !== "" && array[array.length - 2] !== "") {
        //     array = array.slice(0, -2);
        // }
        if (array[array.length - 1]!.trim() === "") {
            return array.slice(0, -1)
        }
        return array;
    }
    function recursive(parents: string[], lastparent: string, children: string[], stateSettings: any, allEntries: any) {
        const index = lastparent.indexOf("_METACOLUMN_OFF");
        if (index != -1) {
            lastparent = lastparent.slice(0, index)
        }
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
    let decryptedfiles: String = ""
    let settings: ColumnSetting = {}; 
    await pmap(decrypt_paths, async (decryptedfile) => {
        const contents = (await readFile(decryptedfile)).toString();
        decryptedfiles = decryptedfiles + "\n" + contents;
    })
    try {
        const isChild: Set<string> = new Set();
        let lines = decryptedfiles.split("\n");
        const allEntries: Map<string, string[]> = new Map();

        // First, gather all parents and their direct children
        lines.forEach(line => {
            if (!line) return
            if (!line.includes("\t:\t")) {
                if (line.includes(":") && line.split(":")[0]!.includes("age units")) {
                    settings['MA'] = {
                        on: true,
                        children: {},
                        parents: []
                    }
                }
                return;
            }
            const parent = line.split("\t:\t")[0];
            let childrenstring = line.split("\t:\t")[1];
            if (!parent || !childrenstring) return;
            childrenstring = childrenstring!.split("\t\t")[0];
            let children = spliceArrayAtFirstSpecialMatch(childrenstring!.split("\t"));
            // children = children.filter(str => str.trim() !== "");
            // console.log(children)
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
        // console.log(JSON.stringify(settings, null, 2));
    } catch (e: any) {
        console.log('ERROR: failed to read columns for path '+decryptedfiles+'.  Error was: ', e);
    }
    return settings;
}