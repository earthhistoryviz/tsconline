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
import { parseDatapacks } from "../src/parse-datapacks";
import { readFileSync } from "fs";
const key = JSON.parse(readFileSync("server/__tests__/__data__/column-keys.json").toString());

describe("parse-datapacks", () => {
  it("should parse africa general datapack", async () => {
    const datapacks = await parseDatapacks("parse-datapacks-test-1.txt", []);
    expect(datapacks).toEqual(key["parse-datapacks-test-1-key"]);
  });
  it("should parse africa general datapack with datapack age and blocks", async () => {
    const datapacks = await parseDatapacks("parse-datapacks-test-2.txt", []);
    expect(datapacks).toEqual(key["parse-datapacks-test-2-key"]);
  });
});
