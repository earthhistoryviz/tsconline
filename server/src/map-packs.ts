import fs from 'fs/promises';
import path from 'path';
import { grabFilepaths, trimQuotes } from './util.js'
import assetconfigs from './index.js';
import pmap from 'p-map';
import type { MapHierarchy, MapInfo, MapPoints } from '@tsconline/shared'
import { assertMapPoints, assertInfoPoints, assertMapHierarchy, assertMapInfo, assertRectBounds, assertVertBounds, assertParentMap } from '@tsconline/shared';

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
    const map_info_paths = await grabFilepaths(datapacks, assetconfigs.decryptionDirectory, "map-packs")
    let mapInfo: MapInfo = {}
    let mapHierarchy: MapHierarchy = {}
    try {
        await pmap(map_info_paths, async (map_info) => {
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
                mapPoints: {},
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
                const headerLabels = grabNames(line)
                // console.log(`line: ${line}, index ${index}`)
                let info = tabSeparated[index + 1]
                switch (header) {
                    case 'HEADER-MAP INFO':
                        if (!info || info.length < 4)  {
                            throw new Error(`${error}: HEADER-MAP INFO isn't properly formatted`)
                        }
                        mapname = String(info[1])
                        map.img = `/${assetconfigs.imagesDirectory}/${String(info[2])}`
                        map.note = String(info[3])
                        break;
                    case 'HEADER-COORD':
                        if (!info || info.length < 6) {
                            throw new Error(`${error}: HEADER-COORD isn't properly formatted`)
                        }
                        map.coordtype = String(info[1])
                        switch (map.coordtype) {
                            case 'RECTANGULAR':
                                const rectBounds = grabRectBounds(headerLabels, info)
                                assertRectBounds(rectBounds)
                                map.bounds = rectBounds
                                break
                            case 'VERTICAL PERSPECTIVE':
                                let vertBounds: any = {}
                                for (let i = 1; i < info.length; i++) {
                                    if (!info[i] || !headerLabels || !headerLabels[i] || !headerLabels[i]!.label) continue
                                    switch (headerLabels[i]!.label) {
                                        case 'CENTER LON':
                                        case 'CENTER LONG':
                                            vertBounds.centerLon = Number(info[i])
                                            break;
                                        case 'CENTER LAT':
                                            vertBounds.centerLat = Number(info[i])
                                            break;
                                        case 'HEIGHT':
                                            vertBounds.height = Number(info[i])
                                            break;
                                        case 'SCALE':
                                            vertBounds.scale = Number(info[i])
                                            break;
                                    }
                                }
                                assertVertBounds(vertBounds)
                                map.bounds = vertBounds 
                                break
                            default:
                                throw new Error(`Unrecognized coordtype: ${map.coordtype}`)

                        }
                        break;
                    case 'HEADER-PARENT MAP':
                        if (!info || info.length < 7) {
                            throw new Error(`${error}: HEADER-PARENT MAP isn't properly formatted`)
                        }
                        let parent: any = {}
                        //TODO: we only assume rect bounds as parent, will need change if not the case
                        let bounds = grabRectBounds(headerLabels, info)
                        assertRectBounds(bounds)
                        for (let i = 1; i < info.length; i++) {
                            if (!info[i] || !headerLabels || !headerLabels[i] || !headerLabels[i]!.label) continue
                            switch(headerLabels[i]!.label) {
                                case "PARENT NAME":
                                    parent.name = info[i]
                                    break
                                case "COORDINATE TYPE":
                                    parent.coordtype = info[i]
                                    break
                            }
                        }
                        parent.bounds = bounds
                        assertParentMap(parent)
                        map.parent = parent
                        if (mapHierarchy[parent.name]) {
                            mapHierarchy[parent.name]!.push(mapname)
                        } else {
                            mapHierarchy[parent!.name] = [mapname]
                        }
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
                        // grab setting names for the map point
                        let i = index + 1
                        // iterate over the line and depending on the columns above, figure out which
                        // parts of MapPoints to put it in
                        while (info && info[0] === "DATACOL") {
                            let mapPoint: MapPoints[string] = {
                                lat: 0,
                                lon: 0
                            }
                            let mapPointName = ""
                            for (let j = 1; j < info.length; j++) {
                                if (!info[j] || !headerLabels || !headerLabels[j] || !headerLabels[j]!.label) continue
                                switch (headerLabels[j]!.label) {
                                    case 'NAME':
                                        mapPointName = trimQuotes(info[j]!)
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
                                        throw new Error(`Unrecognized component of DATACOL: ${headerLabels[j]!.label}`)
                                }
                            }
                            i++
                            info = tabSeparated[i]
                            map.mapPoints[mapPointName] = mapPoint
                        }
                        assertMapPoints(map.mapPoints)
                        break
                    case "HEADER-INFORMATION POINTS":
                        if (!info || info.length < 4) {
                            throw new Error(`Map info file: ${path.basename(map_info)}' is not in the correct format. HEADER-INFORMATION POINTS does not have proper format`)
                        }
                        if (!map.infoPoints) map.infoPoints = {}
                        let pointIndex = index + 1
                        while (info && info[0] === 'INFOPT') {
                            let infoPoint: any = {}
                            let name = ""
                            for (let i = 1; i < info.length; i++) {
                                if (!info[i] || !headerLabels || !headerLabels[i] || !headerLabels[i]!.label) continue
                                switch (headerLabels[i]!.label) {
                                    case "NAME":
                                        name = info[i]!
                                        break
                                    case "LAT":
                                        infoPoint.lat = Number(info[i])
                                        break
                                    case "LONG":
                                    case "LON":
                                        infoPoint.lon = Number(info[i])
                                        break
                                    case "NOTE":
                                        infoPoint.note = info[i]
                                        break
                                }
                            }
                            pointIndex++
                            info = tabSeparated[pointIndex]
                            map.infoPoints[name] = infoPoint
                        }
                        assertInfoPoints(map.infoPoints)
                        break
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
            //console.log(map)
            mapInfo[mapname] = map
        })
    } catch (e) {
        console.log("grabMapInfo threw error: ", e)
        throw e
    }
    // console.log("reply of mapInfo: ", JSON.stringify(mapInfo, null, 2))
    assertMapInfo(mapInfo)
    assertMapHierarchy(mapHierarchy)
    return {mapInfo: mapInfo, mapHierarchy: mapHierarchy}
}

function grabNames(line: string[]) {
    const headerLabels: {
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
        headerLabels[i] = { label: line[i]! }
    }
    return headerLabels 
}

function grabRectBounds(headerLabels: {[key: number] : {label : string}}, info: string[]) {
    let rectBounds: any = {}
    for (let i = 1; i < info.length; i++) {
        if (!headerLabels || !headerLabels[i] || !headerLabels[i]!.label) continue
        switch (headerLabels[i]!.label) {
            case 'UPPER LEFT LON':
            case 'UPPER LEFT LONG':
                rectBounds.upperLeftLon = Number(info[i])
                break;
            case 'UPPER LEFT LAT':
                rectBounds.upperLeftLat = Number(info[i])
                break;
            case 'LOWER RIGHT LON':
            case 'LOWER RIGHT LONG':
                rectBounds.lowerRightLon = Number(info[i])
                break;
            case 'LOWER RIGHT LAT':
                rectBounds.lowerRightLat = Number(info[i])
                break;
        }
    }
    return rectBounds
}