import { glob } from 'glob';
import { readFile } from 'fs/promises';
import pmap from 'p-map';
import type { ColumnSetting, GeologicalStages } from '@tsconline/shared';

/**
 * TODO:
 * This function is meant to catch all strange occurences at the end
 * of the tab seperated decrypted file. Should get rid of METACOLUMN_OFF
 * and any extraneuous info bits that shouldn't be a togglable column.
 * At the moment, is not currently working
 */
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

/**
 * This is a recursive function meant to instantiate all columns.
 * Datapack is encrypted as <parent>\t:\t<child>\t<child>\t<child>
 * Where children could be parents later on
 */
function recursive(parents: string[], lastparent: string, children: string[], stateSettings: any, allEntries: any) {
    //if somehow the data at this point is _METACOLUMN_OFF, remove it
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
}

/**
 * Main Function...
 * Get columns based on a decrypt_filepath that leads to the decrypted directory
 * and an amount of files in a string array that should pop up in that decrypted directory
 * Have not checked edge cases in which a file doesn't show up, will only return any that are correct.
 * Maybe add functionality in the future to check if all the files exist
 */
export async function parse(decrypt_filepath: string, files: string[]): Promise<{columns: ColumnSetting, stages: GeologicalStages}> {
    // regular expression for all filenames located in <decrypt_filepath>/<file_name>
    const pattern = new RegExp(files.map(name => {
        const lastIndex = name.lastIndexOf(".");
        const filename = lastIndex !== -1 ? name.substring(0, lastIndex) : name;
        return `${decrypt_filepath}/${filename}/datapacks/.*`
    }).join('|'));
    let decrypt_paths = await glob(`${decrypt_filepath}/**/*`);
    decrypt_paths = decrypt_paths.filter(path => pattern.test(path));
    if (decrypt_paths.length == 0) return {columns: {}, stages: {}}
    // let fileSettingsMap: { [filePath: string]: ColumnSetting } = {};
    let decryptedfiles: String = ""
    let settings: ColumnSetting = {}; 
    let geoStage: GeologicalStages = {};
    //put all contents into one string for parsing
    await pmap(decrypt_paths, async (decryptedfile) => {
        const contents = (await readFile(decryptedfile)).toString();
        decryptedfiles = decryptedfiles + "\n" + contents;
    })
    try {
        const isChild: Set<string> = new Set();
        let lines = decryptedfiles.split("\n");
        const allEntries: Map<string, string[]> = new Map();

        // First, gather all parents and their direct children
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i]
            if (!line) continue
            if (!line.includes("\t:\t")) {
                if (line.includes(":") && line.split(":")[0]!.includes("age units")) {
                    //create MA setting since this doesn't follow the standard format of "\t:\t"
                    settings['MA'] = {
                        on: true,
                        children: {},
                        parents: []
                    }
                }
                //TODO assess if Age/Stage can only appear once
                if (line.includes("Age/Stage")) {
                    // setAgeStage will return where it stops
                    // so the next iteration must start at where it stops
                    const { stages, index } = setAgeStage(lines, i + 1)
                    i = i + index - 1
                    geoStage = {...geoStage, ...stages}
                }
                continue
            }
            const parent = line.split("\t:\t")[0];
            let childrenstring = line.split("\t:\t")[1];
            if (!parent || !childrenstring) continue;
            childrenstring = childrenstring!.split("\t\t")[0];
            let children = spliceArrayAtFirstSpecialMatch(childrenstring!.split("\t"));
            allEntries.set(parent, children);
        }
        //if the entry is a child, add it to a set.
        allEntries.forEach(children => {
            children.forEach(child => {
                isChild.add(child);
            });
        });
        // only iterate over parents. if we encounter one that is a child, the recursive function
        // should have already processed it.
        allEntries.forEach((children, parent) => {
            if (!isChild.has(parent)) { 
                recursive([], parent, children, settings,allEntries);
            }
        });
        // console.log(JSON.stringify(settings, null, 2));
    } catch (e: any) {
        console.log('ERROR: failed to read columns for path '+decryptedfiles+'.  Error was: ', e);
    }
    return {columns: settings, stages: geoStage};
}

/**
 * Gets Age/Stage from the decrypted datapack
 */
function setAgeStage(lines: string[], index: number): {stages: GeologicalStages, index: number } {
    let geoStage: GeologicalStages = {}
    let i = 0
    if (!lines[index + i]) return {stages: geoStage, index: index + i} 
    let line: String = lines[index + i]!
    while(line.startsWith("\t")) {
       let items = line.split("\t")
       //first item is ""
       const name = items[1]
       const value = items[2]
       if (!name || !value) break
       geoStage[name] = Number(value)
       i += 1
       if (!lines[index + i]) break
       line = lines[index + i]!
    }
    const value = index + i
    return {stages: geoStage, index: value};
}