import { vi, describe, expect, test } from "vitest";
vi.mock("glob", () => ({
  __esModule: true,
  glob: vi.fn().mockImplementation((pattern) => {
    const mockFiles = [
      "/top/directory/file1/bot/file.txt",
      "/top/directory/file2/bot/file.txt",
      "/top/directory/otherfile/bot/file.txt"
    ];
    if (pattern.endsWith("**/*")) pattern = pattern.replace("**/*", ".*");
    return Promise.resolve(mockFiles.filter((path) => new RegExp(pattern).test(path)));
  })
}));

import {
  componentToHex,
  rgbToHex,
  trimQuotes,
  grabFilepaths,
  setCommonProperties,
  capitalizeFirstLetter,
  checkHeader,
  convertTitleToUrlPath,
  verifySymlink,
  uploadFileToGitHub,
  isFileTypeAllowed
} from "../src/util";
import * as fsModule from "fs";
import * as fsPromises from "fs/promises";
import path from "path";

vi.mock("path", async (importOriginal) => {
  const actual = await importOriginal<typeof path>();
  return {
    ...actual,
    resolve: vi.fn().mockImplementation((...args) => {
      const resolvedPath = args.join("/");
      return resolvedPath;
    })
  };
});
vi.mock("fs/promises", async () => {
  return {
    lstat: vi.fn().mockResolvedValue({ isSymbolicLink: () => true }),
    readir: vi.fn().mockResolvedValue(["1", "2"]),
    realpath: vi.fn().mockResolvedValue("/resolved")
  };
});
vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof fsModule>();
  return {
    ...actual,
    createReadStream: vi.fn().mockImplementation(() => {})
  };
});
vi.mock("readline/promises", async () => {
  return {
    createInterface: vi
      .fn()
      .mockImplementationOnce(() => {
        const lines: string[] = ["TSCreator Encrypted Datafile"];
        return lines;
      })
      .mockImplementationOnce(() => {
        const lines: string[] = ["default content"];
        return lines;
      })
  };
});
vi.mock("../src/error-logger", async () => {
  return {
    default: {
      error: vi.fn().mockReturnValue({})
    }
  };
});

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

describe("verifySymlink", () => {
  test("returns true for valid symlink", async () => {
    vi.spyOn(fsPromises, "lstat").mockResolvedValueOnce({ isSymbolicLink: () => true } as fsModule.Stats);
    vi.spyOn(process, "cwd").mockReturnValueOnce("/top/directory");
    expect(await verifySymlink("/top/directory/some/symlink")).toBe(true);
  });

  test("returns false for non-symlink", async () => {
    vi.spyOn(fsPromises, "lstat").mockResolvedValueOnce({ isSymbolicLink: () => false } as fsModule.Stats);
    expect(await verifySymlink("/some/file")).toBe(false);
  });

  test("returns false if realpath fails", async () => {
    vi.spyOn(fsPromises, "lstat").mockResolvedValueOnce({ isSymbolicLink: () => true } as fsModule.Stats);
    vi.spyOn(fsPromises, "realpath").mockRejectedValueOnce(new Error("not found"));
    expect(await verifySymlink("/bad/symlink")).toBe(false);
  });
  test("returns false if symlink does not start with root directory", async () => {
    vi.spyOn(process, "cwd").mockReturnValueOnce("/top/directory");
    vi.spyOn(fsPromises, "lstat").mockResolvedValueOnce({ isSymbolicLink: () => true } as fsModule.Stats);
    vi.spyOn(fsPromises, "realpath").mockResolvedValueOnce("/resolved");
    expect(await verifySymlink("/directory/bad/symlink")).toBe(false);
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

describe("setCommonProperties", () => {
  test.each([
    [
      { prop1: "value1", prop2: "value2" },
      { prop1: "value1", prop2: "value2" },
      { prop1: "value1", prop2: "value2" }
    ],
    [
      { prop1: "value1", prop2: "value2" },
      { prop1: "value1", prop2: "value2", prop3: "value3" },
      { prop1: "value1", prop2: "value2" }
    ],
    [
      { prop1: "value1", prop2: "value2" },
      { prop1: "value1", prop2: "value3" },
      { prop1: "value1", prop2: "value3" }
    ]
  ])("setCommonProperties(%j, %j) returns %j", (obj1, obj2, expected) => {
    expect(setCommonProperties(obj1, obj2)).toEqual(expected);
  });
});

describe("capitalizeFirstLetter tests", () => {
  test.each([
    ["test", "Test"],
    ["TEST", "Test"],
    ["tEST", "Test"],
    ["", ""]
  ])("capitalizeFirstLetter(%j) returns %j", (input, expected) => {
    expect(capitalizeFirstLetter(input)).toBe(expected);
  });
});
describe("checkHeader", () => {
  test('checkHeader("encrypted.txt") returns true', async () => {
    expect(await checkHeader("encrypted.txt")).toEqual(true);
  });
  test('checkHeader("unencrypted.txt") returns false', async () => {
    expect(await checkHeader("unencrypted.txt")).toEqual(false);
  });
});

describe("convertTitleToUrlPath", () => {
  test("convertTitleToUrlPath('Test Title') returns 'test-title'", () => {
    expect(convertTitleToUrlPath("Test Title")).toBe("test-title");
  });

  test("convertTitleToUrlPath('Another Test') returns 'another-test'", () => {
    expect(convertTitleToUrlPath("Another Test")).toBe("another-test");
  });

  test("convertTitleToUrlPath('') returns ''", () => {
    expect(convertTitleToUrlPath("")).toBe("");
  });
});

describe("uploadFileToGithub tests", () => {
  test("successfully uploads file and returns markdown image link if it's an image", async () => {
    process.env.GH_UPLOAD_TOKEN = "test_token";
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      text: vi.fn()
    });
    global.fetch = mockFetch;

    const buffer = Buffer.from("hello world");
    const result = await uploadFileToGitHub("myuser", "myrepo", "uploads", "image.png", buffer);

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.github.com/repos/myuser/myrepo/contents/uploads/image.png",
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          Authorization: "Bearer test_token"
        }),
        body: expect.stringContaining("aGVsbG8gd29ybGQ=") // base64 of "hello world"
      })
    );
    expect(result).toBe("https://github.com/myuser/myrepo/raw/main/uploads/image.png");
  });

  test("throws error if upload fails", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      text: vi.fn().mockResolvedValue("Bad credentials")
    });
    global.fetch = mockFetch;

    const buffer = Buffer.from("failure");

    await expect(uploadFileToGitHub("baduser", "badrepo", "nowhere", "fail.txt", buffer)).rejects.toThrow(
      "File upload failed: Bad credentials"
    );
  });
});

describe("isFileTypeAllowed", () => {
  const allowedFileTypes = ["txt", "jpg", "png"];
  const allowedMimeTypes = ["text/plain", "image/jpeg", "image/png"];

  test("returns true for valid file extension and mime type", () => {
    expect(isFileTypeAllowed("example.txt", "text/plain", allowedFileTypes, allowedMimeTypes)).toBe(true);
    expect(isFileTypeAllowed("photo.jpg", "image/jpeg", allowedFileTypes, allowedMimeTypes)).toBe(true);
    expect(isFileTypeAllowed("image.png", "image/png", allowedFileTypes, allowedMimeTypes)).toBe(true);
  });

  test("returns false for invalid file extension", () => {
    expect(isFileTypeAllowed("example.exe", "text/plain", allowedFileTypes, allowedMimeTypes)).toBe(false);
    expect(isFileTypeAllowed("archive.zip", "application/zip", allowedFileTypes, allowedMimeTypes)).toBe(false);
  });

  test("returns false for invalid mime type", () => {
    expect(isFileTypeAllowed("example.txt", "application/json", allowedFileTypes, allowedMimeTypes)).toBe(false);
    expect(isFileTypeAllowed("photo.jpg", "application/octet-stream", allowedFileTypes, allowedMimeTypes)).toBe(false);
  });

  test("returns false when both extension and mime type are invalid", () => {
    expect(isFileTypeAllowed("script.sh", "application/x-sh", allowedFileTypes, allowedMimeTypes)).toBe(false);
  });
});
