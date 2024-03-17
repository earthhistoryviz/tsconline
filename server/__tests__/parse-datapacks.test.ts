import * as utilModule from "../src/util";
jest.mock("./util.js", () => ({
  ...utilModule,
  grabFilepaths: jest.fn().mockImplementation((_files, decrypt_filepath) => {
    return Promise.resolve([`server/__tests__/__data__/${decrypt_filepath}`]);
  })
}));
jest.mock("@tsconline/shared", () => ({
  assertSubEventInfo: jest.fn().mockImplementation(() => true),
  assertSubChronInfo: jest.fn().mockImplementation(() => true),
  assertSubFaciesInfo: jest.fn().mockImplementation(() => true),
  assertSubBlockInfo: jest.fn().mockImplementation(() => true),
  assertSubRangeInfo: jest.fn().mockImplementation(() => true),
  assertRGB: jest.fn().mockImplementation((o) => {
    if (!o || typeof o !== "object") throw new Error("RGB must be a non-null object");
    if (typeof o.r !== "number") throw new Error("Invalid rgb");
    if (o.r < 0 || o.r > 255) throw new Error("Invalid rgb");
    if (typeof o.g !== "number") throw new Error("Invalid rgb");
    if (o.g < 0 || o.g > 255) throw new Error("Invalid rgb");
    if (typeof o.b !== "number") throw new Error("Invalid rgb");
    if (o.b < 0 || o.b > 255) throw new Error("Invalid rgb");
  }),
  defaultFontsInfo: { font: "Arial" },
  assertFontsInfo: jest.fn().mockImplementation((fonts) => {
    if (fonts.font !== "Arial") throw new Error("Invalid font");
  })
}));
import {
  ParsedColumnEntry,
  getAllEntries,
  getColumnTypes,
  parseDatapacks,
  processEvent,
  processFacies,
  processBlock,
  spliceArrayAtFirstSpecialMatch,
  processRange
} from "../src/parse-datapacks";
import { readFileSync } from "fs";
import { Block, Range, DatapackAgeInfo, Facies, Event, Chron } from "@tsconline/shared";
const key = JSON.parse(readFileSync("server/__tests__/__data__/column-keys.json").toString());

describe("general parse-datapacks tests", () => {
  /**
   * Parses the general Africa Bight map pack
   */
  it("should parse africa general datapack", async () => {
    const datapacks = await parseDatapacks("parse-datapacks-test-1.txt", []);
    expect(datapacks).toEqual(key["general-parse-datapacks-test-1-key"]);
  });

  /**
   * Parses a custom simple pack of both facies and block
   * Checks both datapack ages and columnInfo values
   */
  it("should parse general datapack with all column types", async () => {
    const datapacks = await parseDatapacks("parse-datapacks-test-2.txt", []);
    expect(datapacks).toEqual(key["general-parse-datapacks-test-2-key"]);
  });

  /**
   * Given a bad file, return empty array and default datapackAgeInfo
   */
  it("should not parse bad file return empty array", async () => {
    const datapacks = await parseDatapacks("bad-data.txt", []);
    expect(datapacks).toEqual({ columnInfoArray: [], datapackAgeInfo: { datapackContainsSuggAge: false } });
  });
});

describe("splice column entry tests", () => {
  it("should splice line and store 3 children. On should be false, info should be 'popup', enableTitle should be false", () => {
    const array = ["child1", "child2", "child3", "_METACOLUMN_OFF", "_TITLE_OFF", "", "popup"];
    expect(spliceArrayAtFirstSpecialMatch(array)).toEqual({
      children: ["child1", "child2", "child3"],
      on: false,
      info: "popup",
      enableTitle: false
    });
  });
  it("should splice line and store 3 children. Other fields should be set to default value.", () => {
    const array = ["child1", "child2", "child3"];
    expect(spliceArrayAtFirstSpecialMatch(array)).toEqual({
      children: ["child1", "child2", "child3"],
      on: true,
      info: "",
      enableTitle: true
    });
  });
  it("should splice line and store 3 children. On should be true, info should be empty, enableTitle should be true", () => {
    const array = ["child1", "child2", "child3", "_METACOLUMN_ON", "_TITLE_ON"];
    expect(spliceArrayAtFirstSpecialMatch(array)).toEqual({
      children: ["child1", "child2", "child3"],
      on: true,
      info: "",
      enableTitle: true
    });
  });
});

describe("process facies line tests", () => {
  test.each([
    ["\ttop\t\t100", { rockType: "top", age: 100, info: "" }],
    ["\trockType\tlabel\t100\tinfo", { rockType: "rockType", label: "label", age: 100, info: "info" }],
    ["\tsome bad line\t", null],
    ["\tsome bad line\t\t\t\t", null],
    ["", null]
  ])("should process '%s'", (line, expected) => {
    if (expected === null) {
      expect(processFacies(line)).toBeNull();
    } else {
      expect(processFacies(line)).toEqual(expected);
    }
  });

  it("should throw error on bad number", () => {
    const line = "\trockType\tlabel\tbadNumber\tinfo";
    expect(() => processFacies(line)).toThrow("Error processing facies line, age: badNumber is NaN");
  });
});

describe("process blocks line tests", () => {
  const defaultColor = { r: 255, g: 255, b: 255 };
  test.each([
    [" \tTOP\t100\t\t", { label: "TOP", age: 100, popup: "", lineStyle: "solid", rgb: defaultColor }],
    [
      " \tlabel\t100\tdotted\tpopup\t23/45/67",
      { label: "label", age: 100, popup: "popup", lineStyle: "dotted", rgb: { r: 23, g: 45, b: 67 } }
    ],
    [
      " \tlabel\t100\tdotted\tpopup\tbadcolor",
      { label: "label", age: 100, popup: "popup", lineStyle: "dotted", rgb: defaultColor }
    ],
    [
      " \tlabel\t100\t10/10/10\tpopup\t23/45/67",
      { label: "label", age: 100, popup: "popup", lineStyle: "solid", rgb: { r: 23, g: 45, b: 67 } }
    ],
    [
      " \tlabel\t100\tbadlinestyle\tpopup\t23/45/67",
      { label: "label", age: 100, popup: "popup", lineStyle: "solid", rgb: { r: 23, g: 45, b: 67 } }
    ]
  ])("should process '%s'", (line, expected) => {
    expect(processBlock(line, defaultColor)).toEqual(expected);
  });
  it("should process block and throw error on bad number", () => {
    const line = " \tlabel\tbadNumber\tdotted\tpopup\t23/45/67";
    expect(() => processBlock(line, defaultColor)).toThrow("Error processing block line, age: badNumber is NaN");
  });
});

describe("process event line tests", () => {
  test.each([
    ["\tlabel\t120", { label: "label", age: 120, lineStyle: "solid", popup: "" }],
    ["\tlabel\t120\t\tpopup", { label: "label", age: 120, lineStyle: "solid", popup: "popup" }],
    ["\tlabel\t140\tdashed\tpopup", { label: "label", age: 140, lineStyle: "dashed", popup: "popup" }],
    ["\tlabel\t160\tdotted\tpopup", { label: "label", age: 160, lineStyle: "dotted", popup: "popup" }],
    ["\tlabel\t180\tbadLineStyle\tpopup", { label: "label", age: 180, lineStyle: "solid", popup: "popup" }],
    ["\tlabel", null],
    ["\tlabel\t\t\t\t", null],
    ["", null]
  ])("should process '%s'", (line, expected) => {
    if (expected === null) {
      expect(processEvent(line)).toBeNull();
    } else {
      expect(processEvent(line)).toEqual(expected);
    }
  });
  it("should throw error on NaN age", () => {
    const line = "\tlabel\tbadNumber";
    expect(() => processEvent(line)).toThrow();
  });
});

describe("process range line tests", () => {
  test.each([
    ["\tlabel\t100\tTOP\tpopup", { label: "label", age: 100, abundance: "TOP", popup: "popup" }],
    ["\tlabel\t100", { label: "label", age: 100, abundance: "TOP", popup: "" }],
    ["\tlabel", null],
    ["\tlabel\t\t\t\t", null],
    ["", null],
    // Below are range lines with various abundances
    ["\tlabel\t100\tflood\tpopup", { label: "label", age: 100, abundance: "flood", popup: "popup" }],
    ["\tlabel\t100\tmissing\tpopup", { label: "label", age: 100, abundance: "missing", popup: "popup" }],
    ["\tlabel\t100\trare\tpopup", { label: "label", age: 100, abundance: "rare", popup: "popup" }],
    ["\tlabel\t100\tcommon\tpopup", { label: "label", age: 100, abundance: "common", popup: "popup" }]
  ])("should process '%s'", (line, expected) => {
    if (expected === null) {
      expect(processRange(line)).toBeNull();
    } else {
      expect(processRange(line)).toEqual(expected);
    }
  });

  it("should throw error on NaN age", () => {
    const line = "\tlabel\tbadNumber";
    expect(() => processRange(line)).toThrow();
  });
});

describe("getColumnTypes tests", () => {
  let faciesMap: Map<string, Facies>,
    blockMap: Map<string, Block>,
    eventMap: Map<string, Event>,
    rangeMap: Map<string, Range>,
    chronMap: Map<string, Chron>,
    expectedFaciesMap: Map<string, Facies>,
    expectedBlockMap: Map<string, Block>,
    expectedEventMap: Map<string, Event>,
    expectedRangeMap: Map<string, Range>,
    expectedChronMap: Map<string, Chron>;
  beforeEach(() => {
    faciesMap = new Map<string, Facies>();
    blockMap = new Map<string, Block>();
    eventMap = new Map<string, Event>();
    rangeMap = new Map<string, Range>();
    chronMap = new Map<string, Chron>();
    expectedFaciesMap = new Map<string, Facies>();
    expectedBlockMap = new Map<string, Block>();
    expectedEventMap = new Map<string, Event>();
    expectedRangeMap = new Map<string, Range>();
    expectedChronMap = new Map<string, Chron>();
  });

  /**
   * Checks both map creation all column types
   */
  it("should create all column types correctly", async () => {
    const file = "server/__tests__/__data__/parse-datapacks-test-2.txt";
    await getColumnTypes(file, faciesMap, blockMap, eventMap, rangeMap, chronMap);
    expectedFaciesMap.set(key["column-types-test-3-key"]["Facies 1"].name, key["column-types-test-3-key"]["Facies 1"]);
    expectedBlockMap.set(key["column-types-test-3-key"]["Block 1"].name, key["column-types-test-3-key"]["Block 1"]);
    expectedEventMap.set(key["column-types-test-3-key"]["Event 1"].name, key["column-types-test-3-key"]["Event 1"]);
    expectedRangeMap.set(key["column-types-test-3-key"]["Range 1"].name, key["column-types-test-3-key"]["Range 1"]);
    expectedChronMap.set(key["column-types-test-3-key"]["Chron 1"].name, key["column-types-test-3-key"]["Chron 1"])
    expectMapsToBeEqual();
  });

  /**
   * This test checks for the correct creation of the faciesMap
   */
  it("should create correct faciesMap only", async () => {
    const file = "server/__tests__/__data__/parse-datapacks-test-3.txt";
    await getColumnTypes(file, faciesMap, blockMap, eventMap, rangeMap, chronMap);
    for (const val in key["column-types-test-1-key"]) {
      expectedFaciesMap.set(val, key["column-types-test-1-key"][val]);
    }
    expectMapsToBeEqual();
  });

  /**
   * This test checks for the correct creation of the blockMap
   */
  it("should create correct blockMap only, the second block should has max amount of information", async () => {
    const file = "server/__tests__/__data__/parse-datapacks-test-4.txt";
    await getColumnTypes(file, faciesMap, blockMap, eventMap, rangeMap, chronMap);
    for (const val in key["column-types-test-2-key"]) {
      expectedBlockMap.set(val, key["column-types-test-2-key"][val]);
    }
    expectMapsToBeEqual();
  });

  /**
   * This checks a file with two events with two sub events each
   */
  it("should create correct eventMap only", async () => {
    const file = "server/__tests__/__data__/parse-datapacks-test-5.txt";
    await getColumnTypes(file, faciesMap, blockMap, eventMap, rangeMap, chronMap);
    for (const val in key["column-types-test-4-key"]) {
      expectedEventMap.set(val, key["column-types-test-4-key"][val]);
    }
    expectMapsToBeEqual();
  });

  it("should create correct rangeMap only", async () => {
    const file = "server/__tests__/__data__/parse-datapacks-test-6.txt";
    await getColumnTypes(file, faciesMap, blockMap, eventMap, rangeMap, chronMap);
    for (const val in key["column-types-test-5-key"]) {
      expectedRangeMap.set(val, key["column-types-test-5-key"][val]);
    }
    expectMapsToBeEqual();
  });

  it("should create correct chronMap only", async () => {
    const file = "server/__tests__/__data__/parse-datapacks-test-7.txt";
    await getColumnTypes(file, faciesMap, blockMap, eventMap, rangeMap, chronMap);
    for (const val in key["column-types-test-6-key"]) {
      expectedChronMap.set(val, key["column-types-test-6-key"][val]);
    }
    expectMapsToBeEqual();
  });

  /**
   * Given a bad file, the maps should not be initialized
   */
  it("should not initialize maps on bad file", async () => {
    const file = "server/__tests__/__data__/bad-data.txt";
    await getColumnTypes(file, faciesMap, blockMap, eventMap, rangeMap, chronMap);
    expectMapsToBeEqual();
  });

  function expectMapsToBeEqual() {
    expect(blockMap.size).toBe(expectedBlockMap.size);
    expect(faciesMap.size).toBe(expectedFaciesMap.size);
    expect(eventMap.size).toBe(expectedEventMap.size);
    expect(rangeMap.size).toBe(expectedRangeMap.size);
    expect(chronMap.size).toBe(expectedChronMap.size);
    expect(blockMap).toEqual(expectedBlockMap);
    expect(faciesMap).toEqual(expectedFaciesMap);
    expect(eventMap).toEqual(expectedEventMap);
    expect(rangeMap).toEqual(expectedRangeMap);
    expect(chronMap).toEqual(expectedChronMap);
  }
});

describe("getAllEntries tests", () => {
  let entriesMap: Map<string, ParsedColumnEntry>, datapackAgeInfo: DatapackAgeInfo, isChild: Set<string>;
  beforeEach(() => {
    entriesMap = new Map<string, ParsedColumnEntry>();
    datapackAgeInfo = { datapackContainsSuggAge: false };
    isChild = new Set<string>();
  });

  /**
   * Most basic test with only parents and children
   */
  it("should create correct basic entries map", async () => {
    const file = "server/__tests__/__data__/get-all-entries-test-1.txt";
    await getAllEntries(file, entriesMap, isChild, datapackAgeInfo);
    const expectedEntriesMap = new Map<string, ParsedColumnEntry>();
    expectedEntriesMap.set("Parent 1", {
      children: ["Child 11", "Child 12"],
      on: true,
      info: "",
      enableTitle: true
    });
    expectedEntriesMap.set("Parent 2", {
      children: ["Child 21", "Child 22"],
      on: true,
      info: "",
      enableTitle: true
    });
    expect(entriesMap).toEqual(expectedEntriesMap);
  });

  /**
   * Just checks for the correct creation of the entries map with _METACOLUMN_OFF and _TITLE_OFF
   */
  it("should create correct entries map with meta and title", async () => {
    const file = "server/__tests__/__data__/get-all-entries-test-2.txt";
    await getAllEntries(file, entriesMap, isChild, datapackAgeInfo);
    const expectedEntriesMap = new Map<string, ParsedColumnEntry>();
    expectedEntriesMap.set("Parent 1", {
      children: ["Child 11", "Child 12"],
      on: false,
      info: "",
      enableTitle: false
    });
    expectedEntriesMap.set("Parent 2", {
      children: ["Child 21", "Child 22"],
      on: true,
      info: "",
      enableTitle: true
    });
    expect(entriesMap).toEqual(expectedEntriesMap);
  });

  /**
   * This test checks for the correct creation of the entries map with _METACOLUMN_OFF, _TITLE_OFF, and info
   * alone and all togther
   */
  it("should create correct entries map with meta and title and info", async () => {
    const file = "server/__tests__/__data__/get-all-entries-test-3.txt";
    await getAllEntries(file, entriesMap, isChild, datapackAgeInfo);
    const expectedEntriesMap = new Map<string, ParsedColumnEntry>();
    expectedEntriesMap.set("Parent 1", {
      children: ["Child 11", "Child 12"],
      on: false,
      info: "info",
      enableTitle: false
    });
    expectedEntriesMap.set("Parent 2", {
      children: ["Child 21", "Child 22"],
      on: false,
      info: "info2",
      enableTitle: true
    });
    expectedEntriesMap.set("Parent 3", {
      children: ["Child 31", "Child 32"],
      on: true,
      info: "info3",
      enableTitle: true
    });
    expect(entriesMap).toEqual(expectedEntriesMap);
  });

  /**
   * Simply checks for the correct creation of the datapackAgeInfo object
   * Given SetTopAge and SetBaseAge headers
   */
  it("should create correct datapackAgeInfo", async () => {
    const file = "server/__tests__/__data__/get-all-entries-test-4.txt";
    await getAllEntries(file, entriesMap, isChild, datapackAgeInfo);
    const correctDatapackInfo = { datapackContainsSuggAge: true, topAge: 100, bottomAge: 200 };
    expect(datapackAgeInfo).toEqual(correctDatapackInfo);
  });

  /**
   * Bad file should not initialize maps
   */
  it("should not initialize maps on bad file", async () => {
    const file = "server/__tests__/__data__/bad-data.txt";
    await getAllEntries(file, entriesMap, isChild, datapackAgeInfo);
    expect(entriesMap.size).toBe(0);
  });
});
