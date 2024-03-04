jest.mock("glob", () => ({
  __esModule: true,
  glob: jest.fn().mockImplementation((pattern) => {
    const mockFiles = [
      "/top/directory/file1/bot/file.txt",
      "/top/directory/file2/bot/file.txt",
      "/top/directory/otherfile/bot/file.txt"
    ];
    if (pattern.endsWith("**/*")) pattern = pattern.replace("**/*", ".*");
    return Promise.resolve(mockFiles.filter((path) => new RegExp(pattern).test(path)));
  })
}));

import { trimInvisibleCharacters, componentToHex, rgbToHex, trimQuotes, grabFilepaths } from "../src/util";

describe("grabFilepaths", () => {
  test('grabFilepaths(["file1.txt", "file2.txt"], "/top/directory", "bot") returns ["/top/directory/file1/bot/file.txt", "/top/directory/file2/bot/file.txt"]', async () => {
    expect(await grabFilepaths(["file1.txt", "file2.txt"], "/top/directory", "bot")).toEqual([
      "/top/directory/file1/bot/file.txt",
      "/top/directory/file2/bot/file.txt"
    ]);
  });
  test('grabFilepaths(["nonExistentFile1.txt", "nonExistentFile2.txt"], "/top/directory", "bot") returns []', async () => {
    expect(await grabFilepaths(["nonExistentFile1.txt", "nonExistentFile2.txt"], "/top/directory", "bot")).toEqual([]);
  });
});

describe("rgbToHex tests", () => {
  test("rgbToHex(0, 0, 0) returns #000000", () => {
    expect(rgbToHex(0, 0, 0)).toBe("#000000");
  });

  test("rgbToHex(255, 255, 255) returns #ffffff", () => {
    expect(rgbToHex(255, 255, 255)).toBe("#ffffff");
  });

  test("rgbToHex(256, 0, 0) throws Invalid rgb value", () => {
    expect(() => rgbToHex(256, 0, 0)).toThrow("Invalid rgb value");
  });
});

describe("componentToHex tests", () => {
  test("componentToHex(c: 0) returns 00", () => {
    expect(componentToHex(0)).toBe("00");
  });

  test("componentToHex(c: 256) throws Invalid hex value", () => {
    expect(() => componentToHex(256)).toThrow("Invalid hex value");
  });

  test("componentToHex(c: -1) throws Invalid hex value", () => {
    expect(() => componentToHex(-1)).toThrow("Invalid hex value");
  });
});

describe("trimQuotes tests", () => {
  test('trimQuotes("test") returns test', () => {
    expect(trimQuotes('"test"')).toBe("test");
  });

  test("trimQuotes(noquotes) returns noquotes", () => {
    expect(trimQuotes("noquotes")).toBe("noquotes");
  });
});

describe("trimInvisibleCharacters tests", () => {
  test("trimInvisibleCharacters(`<tab>test<newline><space>`) returns test", () => {
    expect(trimInvisibleCharacters("\ttest\n ")).toBe("test");
  });
  test("trimInvisibleCharacters(`test`) returns test", () => {
    expect(trimInvisibleCharacters("test")).toBe("test");
  });
});
