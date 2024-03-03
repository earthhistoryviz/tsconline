import * as utilModule from "../src/util";
jest.mock("./util.js", () => ({
  ...utilModule,
  grabFilepaths: jest.fn().mockImplementation((files) => {
    return Promise.resolve([`server/__tests__/__data__/${files[0]}`]);
  })
}));
jest.mock("./index.js", () => ({
    assetconfigs: jest.fn().mockImplementation(() => {
        return { decryptionDirectory: ""}
    })
}))
jest.mock("p-map", () => ({
    default: jest.fn().mockImplementation(async (array: string[], callback: (src: string) => Promise<void>) => {
        for (const map_info of array) {
            await callback(map_info);
        }
    })
}))
jest.mock("@tsconline/shared", () => ({
    assertSubFaciesInfo: jest.fn().mockImplementation(() => true),
    assertSubBlockInfo: jest.fn().mockImplementation(() => true),
    defaultFontsInfo: { font: "Arial" },
    assertFontsInfo: jest.fn().mockImplementation((fonts) => {
        if (fonts.font !== "Arial") throw new Error("Invalid font");
    })
}));

import { parseMapPacks } from "../src/parse-map-packs";

describe("parseMapPacks tests", () => {
    it("should parse africa general map pack", async () => {
        const mapPacks = await parseMapPacks(["server/__tests__/__data__/parse-map-packs-test-1.txt"]);
        console.log(JSON.stringify(mapPacks, null, 2))
    });
})
