import * as utilModule from "../src/util";
jest.mock("./util.js", () => ({
  ...utilModule,
  grabFilepaths: jest.fn().mockImplementation((_files, decrypt_filepath) => {
    return Promise.resolve([`server/__tests__/__data__/${decrypt_filepath}`]);
  })
}));
jest.mock("@tsconline/shared", () => ({
  assertSubEventInfo: jest.fn().mockImplementation(() => true),
  assertSubFaciesInfo: jest.fn().mockImplementation(() => true),
  assertSubBlockInfo: jest.fn().mockImplementation(() => true),
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
  processFacies,
  processBlock,
  spliceArrayAtFirstSpecialMatch
} from "../src/parse-datapacks";
import { readFileSync } from "fs";
import { Block, DatapackAgeInfo, Facies, Event, RGB } from "@tsconline/shared";
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
  it("should parse africa general datapack with datapack age and blocks", async () => {
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
  it("should process facies line for top label of age 100", () => {
    const line = "\ttop\t\t100";
    expect(processFacies(line)).toEqual({ rockType: "top", age: 100, info: "" });
  });
  it("should process facies line standard", () => {
    const line = "\trockType\tlabel\t100\tinfo";
    expect(processFacies(line)).toEqual({ rockType: "rockType", label: "label", age: 100, info: "info" });
  });
  it("should process facies and return null on small line", () => {
    const line = "\tsome bad line\t";
    expect(processFacies(line)).toBeNull();
  });
  it("should process facies and return null on large line", () => {
    const line = "\tsome bad line\t\t\t\t";
    expect(processFacies(line)).toBeNull();
  });
  it("should process facies and return null on empty line", () => {
    const line = "";
    expect(processFacies(line)).toBeNull();
  });
  it("should process facies and throw error on bad number", () => {
    const line = "\trockType\tlabel\tbadNumber\tinfo";
    expect(() => processFacies(line)).toThrow("Error processing facies line, age: badNumber is NaN");
  });
});

describe("process blocks line tests", () => {
  let defaultColor: RGB;
  beforeEach(() => {
    defaultColor = { r: 255, g: 255, b: 255 };
  });
  it("should process block line for top label of age 100 with default color and default lineStyle", () => {
    const line = " \tTOP\t100\t\t";
    expect(processBlock(line, defaultColor)).toEqual({
      label: "TOP",
      age: 100,
      popup: "",
      lineStyle: "solid",
      rgb: defaultColor
    });
  });
  it("should process block line standard", () => {
    const line = " \tlabel\t100\tdotted\tpopup\t23/45/67";
    expect(processBlock(line, defaultColor)).toEqual({
      label: "label",
      age: 100,
      popup: "popup",
      lineStyle: "dotted",
      rgb: { r: 23, g: 45, b: 67 }
    });
  });
  it("should process block and replace bad color with default color", () => {
    const line = " \tlabel\t100\tdotted\tpopup\tbadcolor";
    expect(processBlock(line, defaultColor)).toEqual({
      label: "label",
      age: 100,
      popup: "popup",
      lineStyle: "dotted",
      rgb: { r: 255, g: 255, b: 255 }
    });
  });
  it("should process block and replace bad linestyle that's in the format of color with default linestyle", () => {
    const line = " \tlabel\t100\t10/10/10\tpopup\t23/45/67";
    expect(processBlock(line, defaultColor)).toEqual({
      label: "label",
      age: 100,
      popup: "popup",
      lineStyle: "solid",
      rgb: { r: 23, g: 45, b: 67 }
    });
  });
  it("should process block and replace bad linestyle with default linestyle", () => {
    const line = " \tlabel\t100\tbadlinestyle\tpopup\t23/45/67";
    expect(processBlock(line, defaultColor)).toEqual({
      label: "label",
      age: 100,
      popup: "popup",
      lineStyle: "solid",
      rgb: { r: 23, g: 45, b: 67 }
    });
  });
  it("should process block and replace color with invalid rgb value with default color", () => {
    const line = " \tlabel\t100\tbadlinestyle\tpopup\t999/999/999";
    expect(processBlock(line, defaultColor)).toEqual({
      label: "label",
      age: 100,
      popup: "popup",
      lineStyle: "solid",
      rgb: { r: 255, g: 255, b: 255 }
    });
  });
  it("should process block and return null on small line", () => {
    const line = " \tsome bad line";
    expect(processBlock(line, defaultColor)).toBeNull();
  });
  it("should process block and return null on empty line", () => {
    const line = "";
    expect(processBlock(line, defaultColor)).toBeNull();
  });
  it("should process block and throw error on bad number", () => {
    const line = " \tlabel\tbadNumber\tdotted\tpopup\t23/45/67";
    expect(() => processBlock(line, defaultColor)).toThrow("Error processing block line, age: badNumber is NaN");
  });
});

describe("getColumnTypes tests", () => {
  let faciesMap: Map<string, Facies>,
    blockMap: Map<string, Block>,
    eventMap: Map<string, Event>,
    expectedFaciesMap: Map<string, Facies>,
    expectedBlockMap: Map<string, Block>,
    expectedEventMap: Map<string, Event>;
  beforeEach(() => {
    faciesMap = new Map<string, Facies>();
    blockMap = new Map<string, Block>();
    eventMap = new Map<string, Event>();
    expectedFaciesMap = new Map<string, Facies>();
    expectedBlockMap = new Map<string, Block>();
    expectedEventMap = new Map<string, Event>();
  });

  /**
   * Checks both map creation with a simple facies and block
   */
  it("should create facies, event, block maps correctly", async () => {
    const file = "server/__tests__/__data__/parse-datapacks-test-2.txt";
    await getColumnTypes(file, faciesMap, blockMap, eventMap);
    expectedFaciesMap.set(key["column-types-test-3-key"]["Facies 1"].name, key["column-types-test-3-key"]["Facies 1"]);
    expectedBlockMap.set(key["column-types-test-3-key"]["Block 1"].name, key["column-types-test-3-key"]["Block 1"]);
    expectedEventMap.set(key["column-types-test-3-key"]["Event 1"].name, key["column-types-test-3-key"]["Event 1"]);
    expect(faciesMap.size).toBe(1);
    expect(blockMap.size).toBe(1);
    expect(eventMap.size).toBe(1);
    expect(faciesMap).toEqual(expectedFaciesMap);
    expect(blockMap).toEqual(expectedBlockMap);
    expect(eventMap).toEqual(expectedEventMap);
  });

  /**
   * This test checks for the correct creation of the faciesMap
   */
  it("should create correct faciesMap only", async () => {
    const file = "server/__tests__/__data__/parse-datapacks-test-3.txt";
    await getColumnTypes(file, faciesMap, blockMap, eventMap);
    for (const val in key["column-types-test-1-key"]) {
      expectedFaciesMap.set(val, key["column-types-test-1-key"][val]);
    }
    expect(faciesMap.size).toBe(2);
    expect(blockMap.size).toBe(0);
    expect(eventMap.size).toBe(0);
    expect(faciesMap).toEqual(expectedFaciesMap);
    expect(blockMap).toEqual(expectedBlockMap);
    expect(eventMap).toEqual(expectedEventMap);
  });

  /**
   * This test checks for the correct creation of the blockMap
   * TODO: @Jacqui fix this case where linestyle is being processed as a color
   */
  it("should create correct blockMap only, the second block should has max amount of information", async () => {
    const file = "server/__tests__/__data__/parse-datapacks-test-4.txt";
    await getColumnTypes(file, faciesMap, blockMap, eventMap);
    for (const val in key["column-types-test-2-key"]) {
      expectedBlockMap.set(val, key["column-types-test-2-key"][val]);
    }
    expect(blockMap.size).toBe(2);
    expect(faciesMap.size).toBe(0);
    expect(eventMap.size).toBe(0);
    expect(blockMap).toEqual(expectedBlockMap);
    expect(faciesMap).toEqual(expectedFaciesMap);
    expect(eventMap).toEqual(expectedEventMap);
  });

  /**
   * Given a bad file, the maps should not be initialized
   */
  it("should not initialize maps on bad file", async () => {
    const file = "server/__tests__/__data__/bad-data.txt";
    await getColumnTypes(file, faciesMap, blockMap, eventMap);
    expect(eventMap.size).toBe(0);
    expect(faciesMap.size).toBe(0);
    expect(blockMap.size).toBe(0);
  });
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
