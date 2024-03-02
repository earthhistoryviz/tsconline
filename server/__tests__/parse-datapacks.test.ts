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
import { parseDatapacks, processFacies } from "../src/parse-datapacks";
import { readFileSync } from "fs";
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

describe("process facies line tests", () =>{
  it("should process facies line for top label of age 100", () => {
    const line = "\ttop\t\t100"
    expect(processFacies(line)).toEqual({rockType: "top", age: 100, info: ""})
  })
  it("should process facies line standard", () => {
    const line = "\trockType\tlabel\t100\tinfo"
    expect(processFacies(line)).toEqual({rockType: "rockType",label: "label", age: 100, info: "info"})
  })
  it("should process facies and return null on small line", () => {
    const line = "\tsome bad line\t"
    expect(processFacies(line)).toBeNull()
  })
  it("should process facies and return null on large line", () => {
    const line = "\tsome bad line\t\t\t\t"
    expect(processFacies(line)).toBeNull()
  })
  it("should process facies and return null on empty line", () => {
    const line = ""
    expect(processFacies(line)).toBeNull()
  })
  it("should process facies and throw error on bad number", () => {
    const line = "\trockType\tlabel\tbadNumber\tinfo"
    expect(() => processFacies(line)).toThrow("Error processing facies line, age: badNumber is NaN")
  })
})
