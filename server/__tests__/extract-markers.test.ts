import { it, describe, beforeEach, vi, expect } from "vitest";

import { getMarkersFromTextFile } from "../src/crossplot/extract-markers";
import * as fs from "fs";
import * as readline from "readline";
import * as util from "../src/util";
import * as shared from "@tsconline/shared";

vi.mock("fs", async () => {
  return {
    createReadStream: vi.fn().mockReturnValue({
      setEncoding: vi.fn(),
      on: vi.fn()
    })
  };
});

vi.mock("readline", async () => {
  return {
    createInterface: vi.fn().mockReturnValue({
      on: vi.fn()
    })
  };
});
vi.mock("../src/util", async () => {
  return {
    verifyFilepath: vi.fn().mockResolvedValue(true)
  };
});

vi.mock("@tsconline/shared", async () => {
  return {
    getMarkerTypeFromNum: vi.fn().mockReturnValue("test")
  };
});

function mockReadline(lines: string[]) {
  return {
    [Symbol.asyncIterator]() {
      let i = 0;
      return {
        async next() {
          if (i < lines.length) {
            return { value: lines[i++], done: false };
          }
          return { value: undefined, done: true };
        }
      };
    },
    on: vi.fn() // mock .on for error handling
  };
}

describe("extractMarkers", async () => {
  const verifyFilepath = vi.spyOn(util, "verifyFilepath");
  const getMarkerTypeFromNum = vi.spyOn(shared, "getMarkerTypeFromNum");
  const createReadStream = vi.spyOn(fs, "createReadStream");
  const createInterface = vi.spyOn(readline, "createInterface");
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should throw an error if filepath doesn't exist", async () => {
    verifyFilepath.mockResolvedValueOnce(false);
    await expect(getMarkersFromTextFile("test")).rejects.toThrow("File does not exist");
  });
  it("should throw an error if createReadStream throws an error", async () => {
    createReadStream.mockImplementationOnce(() => {
      throw new Error("Error reading file");
    });
    await expect(getMarkersFromTextFile("test")).rejects.toThrow("Error reading file");
  });
  it("should throw an error if any line is invalid", async () => {
    createInterface.mockReturnValueOnce(mockReadline(["header", "1\t2\t3\t4"]) as unknown as readline.Interface);
    await expect(getMarkersFromTextFile("test")).rejects.toThrow("Invalid file format");
  });
  it("should throw an error if an entry is empty/missing", async () => {
    createInterface.mockReturnValueOnce(mockReadline(["header", "1\t2\t3\t4\t\t"]) as unknown as readline.Interface);
    await expect(getMarkersFromTextFile("test")).rejects.toThrow("Invalid file format");
  });
  it("should return no markers if there are no entries", async () => {
    createInterface.mockReturnValueOnce(mockReadline(["header"]) as unknown as readline.Interface);
    const markers = await getMarkersFromTextFile("test");
    expect(markers).toEqual([]);
  });
  it("should return throw an error if one entry that is a number is invalid", async () => {
    createInterface.mockReturnValueOnce(mockReadline(["header", "1\t2\t3\t4\ta"]) as unknown as readline.Interface);
    await expect(getMarkersFromTextFile("test")).rejects.toThrow("Invalid file format");
  });
  it("should return markers if entries are valid", async () => {
    createInterface.mockReturnValueOnce(mockReadline(["header", "1\t2\t3\t4\t5"]) as unknown as readline.Interface);
    const markers = await getMarkersFromTextFile("test");
    expect(getMarkerTypeFromNum).toHaveBeenCalledOnce();
    expect(markers).toEqual([
      {
        age: 1,
        depth: 2,
        comment: "3",
        selected: false,
        type: "test",
        color: "#FF0000",
        id: "1-2-3-5"
      }
    ]);
  });
});
