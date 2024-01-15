import fs from 'fs/promises';
import path from 'path';
import { grabFilepaths } from './util.js'
import assetconfigs from './index.js';
import pmap from 'p-map';
import type { MapHierarchy, MapInfo, MapPoints, Bounds} from '@tsconline/shared'

/**
 * Finds all map images and puts them in the public directory
 * For access from fastify server servicing
 */
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

export async function grabMapInfo(datapacks: string[]): Promise<{mapInfo: MapInfo, mapHierarchy: MapHierarchy}> {
    const map_info_paths = await grabFilepaths(datapacks, assetconfigs.decryptionDirectory, "mappacks")
    let mapInfo: MapInfo = {}
    let mapHierarchy: MapHierarchy = {}
    try {
        await pmap(map_info_paths, async (map_info) => {
            // const error = new Error(`Map info file: ${map_info} is not in the correct format`)
            const error = `Map info file: ${path.basename(map_info)} is not in the correct format`
            const contents = (await fs.readFile(map_info)).toString();
            const lines = contents.split(/\n|\r/)
            let map: MapInfo[string] = {
                img: "",
                coordtype: "",
                bounds: {
                    upperLeftLon: 0,
                    upperLeftLat: 0,
                    lowerRightLon: 0,
                    lowerRightLat: 0
                },
                mapPoints: {}
            }
            let mapname = ""
            let tabSeparated: string[][] = []
            lines.forEach(line => {
                tabSeparated.push(line.split('\t'))
            });
            tabSeparated = tabSeparated.filter(tokens => { return tokens[0] !== ''})
            /**
             * Process the line and update the map variable accordingly
             */
            function processLine (line: string[], index: number) {
                const header = line[0]
                // console.log(`line: ${line}, index ${index}`)
                let info = tabSeparated[index + 1]
                switch (header) {
                    case 'HEADER-MAP INFO':
                        if (!info || info.length < 4)  {
                            throw new Error(error)
                        }
                        mapname = String(info[1])
                        map.img = `/${assetconfigs.imagesDirectory}/${String(info[2])}`
                        map.note = String(info[3])
                        break;
                    case 'HEADER-COORD':
                        if (!info || info.length < 6) {
                            throw new Error(error)
                        }
                        // TODO: coordtype can be multiple things, so won't always be called upperLeftLon
                        map.coordtype = String(info[1])
                        switch (map.coordtype) {
                            case 'RECTANGULAR':
                                map.bounds = {
                                    upperLeftLon: Number(info[2]),
                                    upperLeftLat: Number(info[3]),
                                    lowerRightLon: Number(info[4]),
                                    lowerRightLat: Number(info[5])
                                }
                                // map.bounds.upperLeftLon = Number(info[2])
                                // map.bounds.upperLeftLat = Number(info[3])
                                // map.bounds.lowerRightLon = Number(info[4])
                                // map.bounds.lowerRightLat = Number(info[5])
                                break
                            case 'VERTICAL PERSPECTIVE':
                                map.bounds = {
                                    centerLat: Number(info[2]),
                                    centerLon: Number(info[3]),
                                    height: Number(info[4]),
                                    scale: Number(info[5])
                                }
                                // map.bounds.centerLat = Number(info[2])
                                // map.bounds.centerLon = Number(info[3])
                                // map.bounds.height = Number(info[4])
                                // map.bounds.scale = Number(info[5])
                                break
                            default:
                                throw new Error(`Unrecognized coordtype: ${map.coordtype}`)

                        }
                        break;
                    //TODO: Can this have multiple parents?
                    case 'HEADER-PARENT MAP':
                        if (!info || info.length < 7) {
                            throw new Error(error)
                        }
                        // TODO: coordtype can be multiple things, so won't always be called upperLeftLon
                        map.parent = {
                            name: String(info[1]),
                            coordtype: String(info[2]) ,
                            bounds: {
                                upperLeftLon: Number(info[3]),
                                upperLeftLat: Number(info[4]),
                                lowerRightLon: Number(info[5]),
                                lowerRightLat: Number(info[6])
                            }
                        }
                        mapHierarchy[map.parent.name] = mapname
                        // map.parent.coordtype = String(info[1])
                        // map.parent.bounds.upperLeftLon = Number(info[2])
                        // map.parent.bounds.upperLeftLat = Number(info[3])
                        // map.parent.bounds.lowerRightLon = Number(info[4])
                        // map.parent.bounds.lowerRightLat = Number(info[5])
                        break;
                    case 'HEADER-DATACOL':
                        if (!info || info.length < 3) {
                            throw new Error(`Map info file: ${path.basename(map_info)} is not in the correct format`)
                        }
                        const settingsNames: {
                            [key: number]: {
                                label: string
                            }
                        } = {}
                        // get the header columns to see which ones exist
                        // EX: HEADER-DATACOL	NAME	LAT	LON	DEFAULT ON/OFF	MIN-AGE	MAX-AGE	NOTE
                        for (let i = 1; i < line.length; i++) {
                            if (!line[i]) {
                                break
                            }
                            settingsNames[i] = { label: line[i]! }
                        }
                        // console.log(settingsNames)
                        let i = index + 1
                        // iterate over the line and depending on the columns above, figure out which
                        // parts of MapPoints to put it in
                        while (info && info[0] === "DATACOL") {
                            let mapPoint: MapPoints[string] = {
                                lat: 0,
                                lon: 0
                            }
                            let mapPointName = ""
                            // console.log(info)
                            for (let j = 1; j < info.length; j++) {
                                if (!settingsNames[j] || !settingsNames[j]!.label) {
                                    throw new Error(error)
                                }
                                switch (settingsNames[j]!.label) {
                                    case 'NAME':
                                        mapPointName = info[j]!
                                        break;
                                    case 'LAT':
                                        mapPoint.lat = Number(info[j]!)
                                        break;
                                    case 'LON':
                                        mapPoint.lon = Number(info[j]!)
                                        break;
                                    case 'DEFAULT ON/OFF':
                                        mapPoint.default = String(info[j]!)
                                        break;
                                    case 'MIN-AGE':
                                        mapPoint.minage = Number(info[j]!)
                                        break;
                                    case 'MAX-AGE':
                                        mapPoint.maxage = Number(info[j]!)
                                        break;
                                    case 'NOTE':
                                        mapPoint.note = String(info[j]!)
                                        break;
                                    default:
                                        throw new Error(`Unrecognized component of DATACOL: ${settingsNames[j]!.label}`)
                                        break;
                                }
                            }
                            i++
                            info = tabSeparated[i]
                            map.mapPoints[mapPointName] = mapPoint
                        }
                        break;
                }
            }
            // console.log(tabSeparated)
            if (!tabSeparated ||
                tabSeparated.length < 1 ||
                tabSeparated[0]![0] !== 'MAP-VERSION' || 
                tabSeparated[0]![1] !== '1' ||
                tabSeparated[0]!.length < 2) {
                throw new Error (`Map info file: ${path.basename(map_info)} is not in the correct format/version`)
            }
            tabSeparated.forEach((line, index) => {
                if (!line || !line[0]) return
                if (line[0]!.startsWith("HEADER-")) {
                    processLine(line, index)
                }
            });
            //if reached here map has been properly processed
            console.log(map)
            mapInfo[mapname] = map
        })
    } catch (e) {
        console.log("grabMapInfo threw error: ", e)
        throw e
    }
    return {mapInfo: mapInfo, mapHierarchy: mapHierarchy}
}