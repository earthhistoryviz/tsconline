import * as utilModule from "../src/util";
jest.mock("./util.js", () => ({
  ...utilModule,
  grabFilepaths: jest.fn().mockImplementation((_files, decrypt_filepath) => {
    return Promise.resolve([`server/__tests__/__data__/${decrypt_filepath}`]);
  })
}));
jest.mock("@tsconline/shared", () => ({
  assertSubFaciesInfo: jest.fn().mockImplementation(() => true),
  assertSubBlockInfo: jest.fn().mockImplementation(() => true),
  defaultFontsInfo: { font: "Arial" },
  assertFontsInfo: jest.fn().mockImplementation((fonts) => {
    if (fonts.font !== "Arial") throw new Error("Invalid font");
  })
}));
import {
  ParsedColumnEntry,
  getAllEntries,
  getFaciesOrBlock,
  parseDatapacks,
  processFacies
} from "../src/parse-datapacks";
import { readFileSync } from "fs";
import { Block, DatapackAgeInfo, Facies } from "@tsconline/shared";
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

describe("getFaciesOrBlock tests", () => {
  let faciesMap: Map<string, Facies>,
    blockMap: Map<string, Block>,
    expectedFaciesMap: Map<string, Facies>,
    expectedBlockMap: Map<string, Block>;
  beforeEach(() => {
    faciesMap = new Map<string, Facies>();
    blockMap = new Map<string, Block>();
    expectedFaciesMap = new Map<string, Facies>();
    expectedBlockMap = new Map<string, Block>();
  });

  /**
   * Checks both map creation with a simple facies and block
   */
  it("should create both maps correctly", async () => {
    const file = "server/__tests__/__data__/parse-datapacks-test-2.txt";
    await getFaciesOrBlock(file, faciesMap, blockMap);
    expectedFaciesMap.set(
      key["facies-or-block-test-3-key"]["Facies 1"].name,
      key["facies-or-block-test-3-key"]["Facies 1"]
    );
    expectedBlockMap.set(
      key["facies-or-block-test-3-key"]["Block 1"].name,
      key["facies-or-block-test-3-key"]["Block 1"]
    );
    expect(faciesMap.size).toBe(1);
    expect(blockMap.size).toBe(1);
    expect(faciesMap).toEqual(expectedFaciesMap);
    expect(blockMap).toEqual(expectedBlockMap);
  });

  /**
   * This test checks for the correct creation of the faciesMap
   */
  it("should create correct faciesMap only", async () => {
    const file = "server/__tests__/__data__/parse-datapacks-test-3.txt";
    await getFaciesOrBlock(file, faciesMap, blockMap);
    for (const val in key["facies-or-block-test-1-key"]) {
      expectedFaciesMap.set(val, key["facies-or-block-test-1-key"][val]);
    }
    expect(faciesMap.size).toBe(2);
    expect(blockMap.size).toBe(0);
    expect(faciesMap).toEqual(expectedFaciesMap);
    expect(blockMap).toEqual(expectedBlockMap);
  });

  /**
   * This test checks for the correct creation of the blockMap
   * TODO: @Jacqui fix this case where linestyle is being processed as a color
   */
  it("should create correct blockMap only", async () => {
    const file = "server/__tests__/__data__/parse-datapacks-test-4.txt";
    await getFaciesOrBlock(file, faciesMap, blockMap);
    for (const val in key["facies-or-block-test-2-key"]) {
      expectedBlockMap.set(val, key["facies-or-block-test-2-key"][val]);
    }
    expect(blockMap.size).toBe(2);
    expect(faciesMap.size).toBe(0);
    expect(blockMap).toEqual(expectedBlockMap);
    expect(faciesMap).toEqual(expectedFaciesMap);
  });

  /**
   * Given a bad file, the maps should not be initialized
   */
  it("should not initialize maps on bad file", async () => {
    const file = "server/__tests__/__data__/bad-data.txt";
    await getFaciesOrBlock(file, faciesMap, blockMap);
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
      info: ""
    });
    expectedEntriesMap.set("Parent 2", {
      children: ["Child 21", "Child 22"],
      on: true,
      info: ""
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
      info: ""
    });
    expectedEntriesMap.set("Parent 2", {
      children: ["Child 21", "Child 22"],
      on: true,
      info: ""
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
      info: "info"
    });
    expectedEntriesMap.set("Parent 2", {
      children: ["Child 21", "Child 22"],
      on: false,
      info: "info2"
    });
    expectedEntriesMap.set("Parent 3", {
      children: ["Child 31", "Child 32"],
      on: true,
      info: "info3"
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
