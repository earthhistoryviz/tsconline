import { describe, it, vi, expect, beforeEach } from "vitest";
import { fetchAllUsersDatapacks, getDirectories } from "../src/user/user-handler";
import * as fsPromises from "fs/promises";
import * as util from "../src/util";
vi.mock("fs/promises", () => {
  return {
    readdir: vi.fn(async () => {
      return [
        { isDirectory: () => true, name: "test1" },
        { isDirectory: () => false, name: "test2" },
        { isDirectory: () => true, name: "test3" }
      ];
    }),
    mkdir: vi.fn(async () => {})
  };
});
vi.mock("../src/util", () => {
  return {
    checkFileExists: vi.fn(async () => true)
  };
});
describe("getDirectories test", () => {
  const readdir = vi.spyOn(fsPromises, "readdir");
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should return an array of directories", async () => {
    expect(await getDirectories("test")).toEqual(["test1", "test3"]);
  });
  it("should throw an error if readdir fails", async () => {
    readdir.mockRejectedValueOnce(new Error("readdir error"));
    await expect(getDirectories("test")).rejects.toThrow("readdir error");
    expect(readdir).toHaveBeenCalledOnce();
  });
});

describe("fetchAllUsersDatapacks test", () => {
  const checkFileExists = vi.spyOn(util, "checkFileExists");
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should throw an error if mkdir fails", async () => {
    const mkdir = vi.spyOn(fsPromises, "mkdir");
    mkdir.mockRejectedValueOnce(new Error("mkdir error"));
    await expect(fetchAllUsersDatapacks("test")).rejects.toThrow("mkdir error");
    expect(mkdir).toHaveBeenCalledOnce();
  });
  it("should thow an error if readdir fails", async () => {
    const readdir = vi.spyOn(fsPromises, "readdir");
    readdir.mockRejectedValueOnce(new Error("readdir error"));
    await expect(fetchAllUsersDatapacks("test")).rejects.toThrow("readdir error");
    expect(readdir).toHaveBeenCalledOnce();
  });
  it("should throw an error if checkFileExists fails for a datapack", async () => {
    checkFileExists.mockRejectedValueOnce(new Error("checkFileExists error"));
    await expect(fetchAllUsersDatapacks("test")).rejects.toThrow("checkFileExists error");
    expect(checkFileExists).toHaveBeenCalledOnce();
  });
});
