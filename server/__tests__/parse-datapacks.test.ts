import * as utilModule from "../src/util";
jest.mock("./util.js", () => ({
  ...utilModule,
  grabFilepaths: jest.fn().mockImplementation((files, decrypt_filepath, datapacks) => {
    return Promise.resolve([`server/__tests__/__data__/${decrypt_filepath}`]);
  })
}));
jest.mock("@tsconline/shared", () => ({
  assertSubFaciesInfo: jest.fn(),
  defaultFontsInfo: { font: "Arial" },
  assertFontsInfo: jest.fn().mockImplementation((fonts) => {
    if (fonts.font !== "Arial") throw new Error("Invalid font");
  })
}));
import { parseDatapacks } from "../src/parse-datapacks";
import { readFileSync } from "fs";

describe("parse-datapacks", () => {
  it("should parse africa general datapack", async () => {
    const datapacks = await parseDatapacks("parse-datapacks-test-1.txt", []);
    const key = JSON.parse(readFileSync("server/__tests__/__data__/column-keys.json").toString());
    expect(datapacks).toEqual(key["parse-datapacks-test-1-key"]);
  });
});
