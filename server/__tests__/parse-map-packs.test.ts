import * as utilModule from "../src/util";
import { readFileSync } from "fs";
jest.mock("./util.js", () => ({
  ...utilModule,
  grabFilepaths: jest.fn().mockImplementation((files: string[]) => {
    return Promise.resolve(files.map((file) => `server/__tests__/__data__/${file}`));
  })
}));
jest.mock("./index.js", () => ({
  assetconfigs: { decryptionDirectory: "decryptionDirectory", imagesDirectory: "imagesDirectory" }
}));
jest.mock("p-map", () => ({
  default: jest.fn().mockImplementation(async (array: string[], callback: (src: string) => Promise<void>) => {
    for (const mapInfo of array) {
      await callback(mapInfo);
    }
  })
}));
jest.mock("path", () => ({
  _esModule: true,
  default: {
    basename: jest.fn().mockImplementation((path: string) => {
      if (path.indexOf(".") !== -1) {
        if (path.indexOf("/") !== -1) {
          return path.slice(path.lastIndexOf("/") + 1, path.indexOf("."));
        }
        return path.slice(0, path.indexOf("."));
      }
      return path;
    })
  }
}));
jest.mock("fs/promises", () => ({
  _esModule: true,
  default: {
    readFile: jest.fn().mockImplementation((path: string) => {
      return Promise.resolve(readFileSync(path));
    })
  }
}));
jest.mock("@tsconline/shared", () => ({
  assertMapPoints: jest.fn().mockReturnValue(true),
  assertMapInfo: jest.fn().mockReturnValue(true),
  assertRectBounds: jest.fn().mockReturnValue(true),
  assertParentMap: jest.fn().mockReturnValue(true),
  assertInfoPoints: jest.fn().mockReturnValue(true),
  assertMapHierarchy: jest.fn().mockReturnValue(true),
  assertVertBounds: jest.fn().mockReturnValue(true),
  assertTransects: jest.fn().mockReturnValue(true)
}));

import { grabParent, grabVertBounds, parseMapPacks, processLine } from "../src/parse-map-packs";
import { MapHierarchy, MapInfo } from "@tsconline/shared";
const key = JSON.parse(readFileSync("server/__tests__/__data__/map-pack-keys.json").toString());

const vertBoundsHeaders = ["HEADER-COORD", "COORDINATE TYPE", "CENTER LAT", "CENTER LON", "HEIGHT", "SCALE"];
const vertBoundsInfo = ["COORD", "VERTICAL PERSPECTIVE", "1", "2", "3", "4"];

const rectBoundsHeaders = [
  "HEADER-COORD",
  "COORDINATE TYPE",
  "UPPER LEFT LON",
  "UPPER LEFT LAT",
  "LOWER RIGHT LON",
  "LOWER RIGHT LAT"
];
const rectBoundsInfo = ["COORD", "RECTANGULAR", "1", "2", "3", "4"];

const parentHeaders = [
  "HEADER-PARENT MAP",
  "PARENT NAME",
  "COORDINATE TYPE",
  "UPPER LEFT LON",
  "UPPER LEFT LAT",
  "LOWER RIGHT LON",
  "LOWER RIGHT LAT"
];
const parentsInfo = ["PARENT MAP", "PARENT NAME", "RECTANGULAR", "1", "2", "3", "4"];

const headerMapHeaders = ["HEADER-MAP INFO", "MAP NAME", "IMAGE", "NOTE"];
const headerMapInfo = ["MAP INFO", "MAP TITLE TEST", "IMAGE", "NOTE"];

const headerDatacolMaxHeaders = [
  "HEADER-DATACOL",
  "NAME",
  "LAT",
  "LON",
  "DEFAULT ON/OFF",
  "MIN-AGE",
  "MAX-AGE",
  "NOTE"
];
const headerDatacolMaxInfo = ["DATACOL", "POINT NAME", "1", "2", "ON", "3", "4", "NOTE"];
const headerDatacolMinHeaders = ["HEADER-DATACOL", "NAME", "LAT", "LON"];
const headerDatacolMinInfo = ["DATACOL", "POINT NAME", "1", "2"];

const headerInfoPointsHeaders = ["HEADER-INFORMATION POINTS", "NAME", "LAT", "LON", "NOTE"];
const headerInfoPointsInfo = ["INFOPT", "POINT NAME", "1", "2", "NOTE"];

const headerTransectsHeaders = ["HEADER-TRANSECTS", "NAME", "STARTLOC", "ENDLOC", "NOTE"];
const headerTransectsInfo = ["TRANSECT", "TRANSECT 1", "START", "END", "NOTE"];

describe("parseMapPacks tests", () => {
  it("should parse africa general map pack", async () => {
    const mapPacks = await parseMapPacks(["parse-map-packs-test-1.txt"], "");
    expect(mapPacks).toEqual(key["map-pack-key-1"]);
  });

  /**
   * parses the belgium map pack with a parent map
   */
  it("should parse belgium map-pack", async () => {
    const mapPacks = await parseMapPacks(["parse-map-packs-test-2.txt"], "");
    expect(mapPacks).toEqual(key["map-pack-key-2"]);
  });

  /**
   * parses transects, info points, map points, parent, coord, and header
   */
  it("should parse everything", async () => {
    const mapPacks = await parseMapPacks(["parse-map-packs-test-3.txt"], "");
    expect(mapPacks).toEqual(key["map-pack-key-3"]);
  });

  /**
   * parses two packs with same parent "World map"
   */
  it("should parse two packs with same parent", async () => {
    const mapPacks = await parseMapPacks(["parse-map-packs-test-2.txt", "parse-map-packs-test-3.txt"], "");
    const expected = {
      mapInfo: { ...key["map-pack-key-2"]["mapInfo"], ...key["map-pack-key-3"]["mapInfo"] },
      mapHierarchy: { "World Map": ["Belgium", "MAP TITLE TEST"] }
    };
    expect(mapPacks).toEqual(expected);
  });

  /**
   * parses three packs with same parent "World map" (not parse-map-packs-test-1)
   */
  it("should parse all packs", async () => {
    const mapPacks = await parseMapPacks(
      ["parse-map-packs-test-1.txt", "parse-map-packs-test-2.txt", "parse-map-packs-test-3.txt"],
      ""
    );
    const expected = {
      mapInfo: {
        ...key["map-pack-key-1"]["mapInfo"],
        ...key["map-pack-key-2"]["mapInfo"],
        ...key["map-pack-key-3"]["mapInfo"]
      },
      mapHierarchy: { "World Map": ["Belgium", "MAP TITLE TEST"] }
    };
    expect(mapPacks).toEqual(expected);
  });

  it("should return empty if bad data", async () => {
    await expect(parseMapPacks(["bad-data.txt"], "")).rejects.toThrow(
      new Error("Map info file: bad-data is not in the correct format/version")
    );
  });
});

describe("grab from headers and info tests", () => {
  /**
   * Standard parent map
   */
  it("should return the parent map", () => {
    const parent = grabParent(parentHeaders, parentsInfo);
    expect(parent).toEqual({
      name: "PARENT NAME",
      coordtype: "RECTANGULAR",
      bounds: {
        upperLeftLon: 1,
        upperLeftLat: 2,
        lowerRightLon: 3,
        lowerRightLat: 4
      }
    });
  });

  /**
   * standard vert bounds with center lon
   */
  it("should return vert bounds with CENTER LON", () => {
    const vertBounds = grabVertBounds(vertBoundsHeaders, vertBoundsInfo);
    expect(vertBounds).toEqual({
      centerLat: 1,
      centerLon: 2,
      height: 3,
      scale: 4
    });
  });

  /**
   * standard vert bounds with center long
   */
  it("should return vert bounds with CENTER LONG", () => {
    vertBoundsHeaders[3] = "CENTER LONG";
    const vertBounds = grabVertBounds(vertBoundsHeaders, vertBoundsInfo);
    expect(vertBounds).toEqual({
      centerLat: 1,
      centerLon: 2,
      height: 3,
      scale: 4
    });
  });
});

describe("processLine tests", () => {
  let map: MapInfo[string], mapHierarchy: MapHierarchy, index: number;
  beforeEach(() => {
    index = 0;
    map = {
      name: "",
      img: "",
      coordtype: "",
      bounds: {
        upperLeftLon: 0,
        upperLeftLat: 0,
        lowerRightLon: 0,
        lowerRightLat: 0
      },
      mapPoints: {}
    };
    mapHierarchy = {};
  });

  describe("HEADER-MAP INFO tests", () => {
    /**
     * Should parse and fill out map info header correctly
     */
    it("should process a HEADER-MAP INFO", async () => {
      const tabSeparated = [headerMapHeaders, headerMapInfo];
      const expectedMap = {
        name: "MAP TITLE TEST",
        img: "/imagesDirectory/IMAGE",
        coordtype: "",
        note: "NOTE",
        bounds: {
          upperLeftLon: 0,
          upperLeftLat: 0,
          lowerRightLon: 0,
          lowerRightLat: 0
        },
        mapPoints: {}
      };
      const expectedMapHierarchy = {};
      processLine(index, tabSeparated, "test", map, mapHierarchy);
      expect(map).toEqual(expectedMap);
      expect(mapHierarchy).toEqual(expectedMapHierarchy);
    });

    /**
     * should throw error on bad header size
     */
    it("should throw error on bad info size", () => {
      const tabSeparated = [headerMapHeaders, headerMapInfo.slice(0, -1)];
      expect(() => processLine(index, tabSeparated, "test", map, mapHierarchy)).toThrow();
    });
  });

  describe("HEADER-COORD tests", () => {
    /**
     * Process a standard vertical perspective boundary
     */
    it("should process a HEADER-COORD with vertical perspective", async () => {
      const tabSeparated = [vertBoundsHeaders, vertBoundsInfo];
      const expectedMap = {
        name: "",
        img: "",
        coordtype: "VERTICAL PERSPECTIVE",
        bounds: {
          centerLat: 1,
          centerLon: 2,
          height: 3,
          scale: 4
        },
        mapPoints: {}
      };
      processLine(index, tabSeparated, "test", map, mapHierarchy);
      expect(map).toEqual(expectedMap);
      expect(mapHierarchy).toEqual({});
    });

    /**
     * should process a HEADER-COORD with standard rectangular bounds
     */
    it("should process a HEADER-COORD with rectangular bounds", async () => {
      const tabSeparated = [rectBoundsHeaders, rectBoundsInfo];
      const expectedMap = {
        name: "",
        img: "",
        coordtype: "RECTANGULAR",
        bounds: {
          upperLeftLon: 1,
          upperLeftLat: 2,
          lowerRightLon: 3,
          lowerRightLat: 4
        },
        mapPoints: {}
      };
      processLine(index, tabSeparated, "test", map, mapHierarchy);
      expect(map).toEqual(expectedMap);
      expect(mapHierarchy).toEqual({});
    });

    /**
     * should throw error on bad coordtype
     */
    it("should throw error on bad coordtype", () => {
      const testRectBoundsInfo = [...rectBoundsInfo];
      testRectBoundsInfo[1] = "BAD COORDINATE TYPE";
      const tabSeparated = [rectBoundsHeaders, testRectBoundsInfo];
      expect(() => processLine(index, tabSeparated, "test", map, mapHierarchy)).toThrow();
    });

    /**
     * should throw error on bad header size
     */
    it("should throw error on bad info size", () => {
      const tabSeparated = [rectBoundsHeaders, rectBoundsInfo.slice(0, -1)];
      expect(() => processLine(index, tabSeparated, "test", map, mapHierarchy)).toThrow();
    });

    /**
     * this changes instead of CENTER LON, BAD HEADER
     */
    it("should throw error on bad header for vertbounds", () => {
      const testVertBoundsHeaders = [...vertBoundsHeaders];
      testVertBoundsHeaders[3] = "BAD HEADER";
      const tabSeparated = [testVertBoundsHeaders, vertBoundsInfo];
      expect(() => processLine(index, tabSeparated, "test", map, mapHierarchy)).toThrow();
    });
  });

  describe("HEADER-PARENT tests", () => {
    /**
     * Map with a parent fills map and map hierarchy correctly
     */
    it("should process a HEADER-PARENT", async () => {
      const tabSeparated = [parentHeaders, parentsInfo];
      const mapTest = { ...map };
      mapTest.name = "MAP TEST HEADER-PARENT";
      const expectedMap = {
        name: "MAP TEST HEADER-PARENT",
        img: "",
        coordtype: "",
        parent: {
          name: "PARENT NAME",
          coordtype: "RECTANGULAR",
          bounds: {
            upperLeftLon: 1,
            upperLeftLat: 2,
            lowerRightLon: 3,
            lowerRightLat: 4
          }
        },
        bounds: {
          upperLeftLon: 0,
          upperLeftLat: 0,
          lowerRightLon: 0,
          lowerRightLat: 0
        },
        mapPoints: {}
      };
      const expectedMapHierarchy = { [parentsInfo[1]!]: ["MAP TEST HEADER-PARENT"] };
      processLine(index, tabSeparated, "test", mapTest, mapHierarchy);
      expect(mapTest).toEqual(expectedMap);
      expect(mapHierarchy).toEqual(expectedMapHierarchy);
    });

    /**
     * should throw error on bad info size
     */
    it("should throw error on bad info size", () => {
      const tabSeparated = [parentHeaders, parentsInfo.slice(0, -1)];
      expect(() => processLine(index, tabSeparated, "test", map, mapHierarchy)).toThrow();
    });

    /**
     * needs to be rectangular
     */
    it("should throw error on bad coordtype", () => {
      const testParentsInfo = [...parentsInfo];
      testParentsInfo[2] = "BAD COORDINATE TYPE";
      const tabSeparated = [parentHeaders, testParentsInfo];
      expect(() => processLine(index, tabSeparated, "test", map, mapHierarchy)).toThrow();
    });

    /**
     * bad coord headers (not in the correct format/version through lon or lat)
     */
    it("should throw error on bad coord headers", () => {
      const testParentHeaders = [...parentHeaders];
      testParentHeaders[3] = "BAD COORD HEADER";
      const tabSeparated = [testParentHeaders, parentsInfo];
      expect(() => processLine(index, tabSeparated, "test", map, mapHierarchy)).toThrow();
    });
  });

  describe("HEADER-DATACOL tests", () => {
    /**
     * should process a HEADER-DATACOL with max amount of headers
     */
    it("should process a HEADER-DATACOL with max amount of headers", async () => {
      const tabSeparated = [headerDatacolMaxHeaders, headerDatacolMaxInfo];
      const expectedMap = {
        name: "",
        img: "",
        coordtype: "",
        bounds: {
          upperLeftLon: 0,
          upperLeftLat: 0,
          lowerRightLon: 0,
          lowerRightLat: 0
        },
        mapPoints: {
          "POINT NAME": {
            lat: 1,
            lon: 2,
            default: "ON",
            minage: 3,
            maxage: 4,
            note: "NOTE"
          }
        }
      };
      processLine(index, tabSeparated, "test", map, mapHierarchy);
      expect(map).toEqual(expectedMap);
      expect(mapHierarchy).toEqual({});
    });

    /**
     * should process a HEADER-DATACOL with min amount of headers
     */
    it("should process a HEADER-DATACOL with min amount of headers", async () => {
      const tabSeparated = [headerDatacolMinHeaders, headerDatacolMinInfo];
      const expectedMap = {
        name: "",
        img: "",
        coordtype: "",
        bounds: {
          upperLeftLon: 0,
          upperLeftLat: 0,
          lowerRightLon: 0,
          lowerRightLat: 0
        },
        mapPoints: {
          "POINT NAME": {
            lat: 1,
            lon: 2
          }
        }
      };
      processLine(index, tabSeparated, "test", map, mapHierarchy);
      expect(map).toEqual(expectedMap);
      expect(mapHierarchy).toEqual({});
    });

    /**
     * Two points should be added to mapPoints
     */
    it("should prcoess a HEADER-DATACOL with multiple points", async () => {
      const secondPoint = [...headerDatacolMaxInfo];
      secondPoint[1] = "POINT NAME 2";
      const tabSeperated = [headerDatacolMaxHeaders, headerDatacolMaxInfo, secondPoint];
      const expectedMap = {
        name: "",
        img: "",
        coordtype: "",
        bounds: {
          upperLeftLon: 0,
          upperLeftLat: 0,
          lowerRightLon: 0,
          lowerRightLat: 0
        },
        mapPoints: {
          "POINT NAME": {
            lat: 1,
            lon: 2,
            default: "ON",
            minage: 3,
            maxage: 4,
            note: "NOTE"
          },
          "POINT NAME 2": {
            lat: 1,
            lon: 2,
            default: "ON",
            minage: 3,
            maxage: 4,
            note: "NOTE"
          }
        }
      };
      processLine(index, tabSeperated, "test", map, mapHierarchy);
      expect(map).toEqual(expectedMap);
      expect(mapHierarchy).toEqual({});
    });

    /**
     * should throw error on bad header size
     */
    it("should throw error on bad info size", () => {
      const tabSeparated = [headerDatacolMinHeaders, headerDatacolMinInfo.slice(0, -1)];
      expect(() => processLine(index, tabSeparated, "test", map, mapHierarchy)).toThrow();
    });

    /**
     * bad header (not in the correct format/version)
     */
    it("should throw error on bad unrecognized header", () => {
      const testHeaders = [...headerDatacolMaxHeaders];
      testHeaders[1] = "BAD HEADER";
      const tabSeparated = [testHeaders, headerDatacolMaxInfo];
      expect(() => processLine(index, tabSeparated, "test", map, mapHierarchy)).toThrow();
    });
  });

  describe("HEADER-INFORMATION POINTS tests", () => {
    /**
     * should process a standard HEADER-INFORMATION POINTS
     */
    it("should process a HEADER-INFORMATION POINTS", () => {
      const tabSeparated = [headerInfoPointsHeaders, headerInfoPointsInfo];
      const expectedMap = {
        name: "",
        img: "",
        coordtype: "",
        bounds: {
          upperLeftLon: 0,
          upperLeftLat: 0,
          lowerRightLon: 0,
          lowerRightLat: 0
        },
        mapPoints: {},
        infoPoints: {
          "POINT NAME": {
            lat: 1,
            lon: 2,
            note: "NOTE"
          }
        }
      };
      processLine(index, tabSeparated, "test", map, mapHierarchy);
      expect(map).toEqual(expectedMap);
      expect(mapHierarchy).toEqual({});
    });

    /**
     * should process a HEADER-INFORMATION POINTS with multiple points
     */
    it("should process multiple info points", () => {
      const secondPoint = [...headerInfoPointsInfo];
      secondPoint[1] = "POINT NAME 2";
      const tabSeparated = [headerInfoPointsHeaders, headerInfoPointsInfo, secondPoint];
      const expectedMap = {
        name: "",
        img: "",
        coordtype: "",
        bounds: {
          upperLeftLon: 0,
          upperLeftLat: 0,
          lowerRightLon: 0,
          lowerRightLat: 0
        },
        mapPoints: {},
        infoPoints: {
          "POINT NAME": {
            lat: 1,
            lon: 2,
            note: "NOTE"
          },
          "POINT NAME 2": {
            lat: 1,
            lon: 2,
            note: "NOTE"
          }
        }
      };
      processLine(index, tabSeparated, "test", map, mapHierarchy);
      expect(map).toEqual(expectedMap);
      expect(mapHierarchy).toEqual({});
    });

    /**
     * should process a HEADER-INFORMATION POINTS with no note
     */
    it("should generate info points with no note", () => {
      const tabSeparated = [headerInfoPointsHeaders.slice(0, -1), headerInfoPointsInfo.slice(0, -1)];
      const expectedMap = {
        name: "",
        img: "",
        coordtype: "",
        bounds: {
          upperLeftLon: 0,
          upperLeftLat: 0,
          lowerRightLon: 0,
          lowerRightLat: 0
        },
        mapPoints: {},
        infoPoints: {
          "POINT NAME": {
            lat: 1,
            lon: 2
          }
        }
      };
      processLine(index, tabSeparated, "test", map, mapHierarchy);
      expect(map).toEqual(expectedMap);
      expect(mapHierarchy).toEqual({});
    });

    /**
     * should throw error on bad header size
     * we slice two because note is optional
     */
    it("should throw error on bad info size", () => {
      const tabSeparated = [headerInfoPointsHeaders, headerInfoPointsInfo.slice(0, -2)];
      expect(() => processLine(index, tabSeparated, "test", map, mapHierarchy)).toThrow();
    });

    /**
     * should throw error on bad header
     */
    it("should throw error on bad header", () => {
      const testHeaders = [...headerInfoPointsHeaders];
      testHeaders[2] = "BAD HEADER";
      const tabSeparated = [testHeaders, headerInfoPointsInfo];
      expect(() => processLine(index, tabSeparated, "test", map, mapHierarchy)).toThrow();
    });
  });

  describe("HEADER-TRANSECTS tests", () => {
    /**
     * should process a standard HEADER-TRANSECTS
     */
    it("should process a HEADER-TRANSECTS", () => {
      const tabSeparated = [headerTransectsHeaders, headerTransectsInfo];
      const expectedMap = {
        name: "",
        img: "",
        coordtype: "",
        bounds: {
          upperLeftLon: 0,
          upperLeftLat: 0,
          lowerRightLon: 0,
          lowerRightLat: 0
        },
        mapPoints: {},
        transects: {
          "TRANSECT 1": {
            startMapPoint: "START",
            endMapPoint: "END",
            note: "NOTE"
          }
        }
      };
      processLine(index, tabSeparated, "test", map, mapHierarchy);
      expect(map).toEqual(expectedMap);
      expect(mapHierarchy).toEqual({});
    });

    /**
     * should process a HEADER-TRANSECTS with no note
     */
    it("should process a HEADER-TRANSECTS with no note", () => {
      const tabSeparated = [headerTransectsHeaders.slice(0, -1), headerTransectsInfo.slice(0, -1)];
      const expectedMap = {
        name: "",
        img: "",
        coordtype: "",
        bounds: {
          upperLeftLon: 0,
          upperLeftLat: 0,
          lowerRightLon: 0,
          lowerRightLat: 0
        },
        mapPoints: {},
        transects: {
          "TRANSECT 1": {
            startMapPoint: "START",
            endMapPoint: "END",
          }
        }
      };
      processLine(index, tabSeparated, "test", map, mapHierarchy);
      expect(map).toEqual(expectedMap);
      expect(mapHierarchy).toEqual({});
    });

    /**
     * should process a HEADER-TRANSECTS with 3 transects
     */
    it("should process multiple transects", () => {
      const secondTransect = [...headerTransectsInfo];
      const thirdTransect = [...headerTransectsInfo];
      secondTransect[1] = "TRANSECT 2";
      thirdTransect[1] = "TRANSECT 3";
      const tabSeparated = [headerTransectsHeaders, headerTransectsInfo, secondTransect, thirdTransect];
      const expectedMap = {
        name: "",
        img: "",
        coordtype: "",
        bounds: {
          upperLeftLon: 0,
          upperLeftLat: 0,
          lowerRightLon: 0,
          lowerRightLat: 0
        },
        mapPoints: {},
        transects: {
          "TRANSECT 1": {
            startMapPoint: "START",
            endMapPoint: "END",
            note: "NOTE"
          },
          "TRANSECT 2": {
            startMapPoint: "START",
            endMapPoint: "END",
            note: "NOTE"
          },
          "TRANSECT 3": {
            startMapPoint: "START",
            endMapPoint: "END",
            note: "NOTE"
          }
        }
      };
      processLine(index, tabSeparated, "test", map, mapHierarchy);
      expect(map).toEqual(expectedMap);
      expect(mapHierarchy).toEqual({});
    });

    /**
     * should throw error on bad info size (note can possibly be empty so we slice 2)
     */
    it("should throw error on bad info size", () => {
      const tabSeparated = [headerTransectsHeaders, headerTransectsInfo.slice(0, -2)];
      expect(() => processLine(index, tabSeparated, "test", map, mapHierarchy)).toThrow();
    });

    /**
     * should throw error on bad header
     */
    it("should throw error on bad header", () => {
      const testHeaders = [...headerTransectsHeaders];
      testHeaders[2] = "BAD HEADER";
      const tabSeparated = [testHeaders, headerTransectsInfo];
      expect(() => processLine(index, tabSeparated, "test", map, mapHierarchy)).toThrow();
    });
  });
});
