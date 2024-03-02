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
import { ParsedColumnEntry, getAllEntries, getFaciesOrBlock, parseDatapacks, processFacies } from "../src/parse-datapacks";
import { readFileSync } from "fs";
import { Block, DatapackAgeInfo, Facies } from "@tsconline/shared";
const key = JSON.parse(readFileSync("server/__tests__/__data__/column-keys.json").toString());

describe("general parse-datapacks tests", () => {
  it("should parse africa general datapack", async () => {
    const datapacks = await parseDatapacks("parse-datapacks-test-1.txt", []);
    expect(datapacks).toEqual(key["general-parse-datapacks-test-1-key"]);
  });
  it("should parse africa general datapack with datapack age and blocks", async () => {
    const datapacks = await parseDatapacks("parse-datapacks-test-2.txt", []);
    expect(datapacks).toEqual(key["general-parse-datapacks-test-2-key"]);
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
  it("should create maps of correct size", async () => {
    const file = "server/__tests__/__data__/parse-datapacks-test-2.txt";
    const faciesMap = new Map<string, Facies>();
    const blockMap = new Map<string, Block>();
    await getFaciesOrBlock(file, faciesMap, blockMap);
    expect(faciesMap.size).toBe(1);
    expect(blockMap.size).toBe(1);
  });
  it("should create correct faciesMap", async () => {
    const file = "server/__tests__/__data__/parse-datapacks-test-3.txt";
    const faciesMap = new Map<string, Facies>();
    const blockMap = new Map<string, Block>();
    await getFaciesOrBlock(file, faciesMap, blockMap);
    const expectedFaciesMap = new Map<string, Facies>();
    for (const val in key["facies-or-block-test-1-key"]) {
      expectedFaciesMap.set(val, key["facies-or-block-test-1-key"][val]);
    }
    expect(faciesMap.size).toBe(2);
    expect(blockMap.size).toBe(0);
    expect(faciesMap).toEqual(expectedFaciesMap);
  });
  it("should create correct blockMap", async () => {
    const file = "server/__tests__/__data__/parse-datapacks-test-4.txt";
    const faciesMap = new Map<string, Facies>();
    const blockMap = new Map<string, Block>();
    await getFaciesOrBlock(file, faciesMap, blockMap);
    const expectedFaciesMap = new Map<string, Facies>();
    // TODO: fix this case where linestyle is being processed as a color
    for (const val in key["facies-or-block-test-2-key"]) {
      expectedFaciesMap.set(val, key["facies-or-block-test-2-key"][val]);
    }
    expect(blockMap.size).toBe(2);
    expect(faciesMap.size).toBe(0);
    expect(blockMap).toEqual(expectedFaciesMap);
  });
});

describe("getAllEntries tests", () => {
  it("should create correct basic entries map", async () => {
    const file = "server/__tests__/__data__/get-all-entries-test-1.txt";
    const entriesMap = new Map<string, ParsedColumnEntry>();
    const datapackAgeInfo: DatapackAgeInfo = { datapackContainsSuggAge: false}
    const isChild = new Set<string>
    await getAllEntries(file, entriesMap, isChild, datapackAgeInfo)
    const expectedEntriesMap = new Map<string, ParsedColumnEntry>();
    expectedEntriesMap.set("Parent 1", {
      children: ["Child 11", "Child 12"],
      on: true,
      info: ""
    }
    );
    expectedEntriesMap.set("Parent 2", {
      children: ["Child 21", "Child 22"],
      on: true,
      info: ""});
    expect(entriesMap).toEqual(expectedEntriesMap);
  })
  it("should create correct entries map with meta and title", async () => {
    const file = "server/__tests__/__data__/get-all-entries-test-2.txt";
    const entriesMap = new Map<string, ParsedColumnEntry>();
    const datapackAgeInfo: DatapackAgeInfo = { datapackContainsSuggAge: false}
    const isChild = new Set<string>
    await getAllEntries(file, entriesMap, isChild, datapackAgeInfo)
    const expectedEntriesMap = new Map<string, ParsedColumnEntry>();
    expectedEntriesMap.set("Parent 1", {
      children: ["Child 11", "Child 12"],
      on: false,
      info: ""
    }
    );
    expectedEntriesMap.set("Parent 2", {
      children: ["Child 21", "Child 22"],
      on: true,
      info: ""});
    expect(entriesMap).toEqual(expectedEntriesMap);
  })
  it("should create correct entries map with meta and title and info", async () => {
    const file = "server/__tests__/__data__/get-all-entries-test-3.txt";
    const entriesMap = new Map<string, ParsedColumnEntry>();
    const datapackAgeInfo: DatapackAgeInfo = { datapackContainsSuggAge: false}
    const isChild = new Set<string>
    await getAllEntries(file, entriesMap, isChild, datapackAgeInfo)
    const expectedEntriesMap = new Map<string, ParsedColumnEntry>();
    expectedEntriesMap.set("Parent 1", {
      children: ["Child 11", "Child 12"],
      on: false,
      info: "info"
    }
    );
    expectedEntriesMap.set("Parent 2", {
      children: ["Child 21", "Child 22"],
      on: false,
      info: "info2"});
    expect(entriesMap).toEqual(expectedEntriesMap);
  })
  it("should create correct datapackAgeInfo", async () => {
    const file = "server/__tests__/__data__/get-all-entries-test-4.txt";
    const entriesMap = new Map<string, ParsedColumnEntry>();
    const datapackAgeInfo: DatapackAgeInfo = { datapackContainsSuggAge: false}
    const isChild = new Set<string>
    await getAllEntries(file, entriesMap, isChild, datapackAgeInfo)
    const correctDatapackInfo = { datapackContainsSuggAge: true , topAge: 100, bottomAge: 200}
    expect(datapackAgeInfo).toEqual(correctDatapackInfo);
  })
})
