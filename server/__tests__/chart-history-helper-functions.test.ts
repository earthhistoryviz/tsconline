import { describe, it, vi, expect, beforeEach } from "vitest";

import * as util from "../src/util";
import * as fs from "fs/promises";
import {
  getHistoryEntryDatapacksPath,
  getSpecificUserHistoryRootFilePath,
  getUserHistoryRootFilePath
} from "../src/user/chart-history-helper-functions";
import { join } from "path";

vi.mock("fs/promises", async () => {
  return {
    mkdir: vi.fn().mockResolvedValue({}),
    readdir: vi.fn().mockResolvedValue(["1", "2"]),
    rm: vi.fn().mockResolvedValue({}),
    cp: vi.fn().mockResolvedValue({}),
    symlink: vi.fn().mockResolvedValue({}),
    readFile: vi.fn().mockResolvedValue("file-content")
  };
});

vi.mock("../src/util", async () => {
  return {
    verifyFilepath: vi.fn().mockResolvedValue(true),
    verifyNonExistentFilepath: vi.fn().mockResolvedValue(true),
    assetconfigs: {
      uploadDirectory: "/testdir/uploadDirectory"
    }
  };
});

describe("getUserHistoryRootFilePath", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  const mkdir = vi.spyOn(fs, "mkdir");
  const verifyFilepath = vi.spyOn(util, "verifyFilepath");
  const verifyNonExistentFilepath = vi.spyOn(util, "verifyNonExistentFilepath");
  it("should make directory if it doesn't exist", async () => {
    const uuid = "test-uuid";
    verifyFilepath.mockResolvedValueOnce(false);
    const filepath = await getUserHistoryRootFilePath(uuid);
    expect(filepath).toBe(join("/testdir/uploadDirectory/private", uuid, "history"));
    expect(mkdir).toHaveBeenCalledWith(join("/testdir/uploadDirectory/private", uuid, "history"), { recursive: true });
  });
  it("should throw error if filepath is invalid", async () => {
    const uuid = "test-uuid";
    verifyFilepath.mockResolvedValueOnce(false);
    verifyNonExistentFilepath.mockResolvedValueOnce(false);
    await expect(getUserHistoryRootFilePath(uuid)).rejects.toThrow("Invalid filepath");
  });
  it("should return filepath if it exists", async () => {
    const uuid = "test-uuid";
    verifyFilepath.mockResolvedValueOnce(true);
    const filepath = await getUserHistoryRootFilePath(uuid);
    expect(filepath).toBe(join("/testdir/uploadDirectory/private", uuid, "history"));
  });
});

describe("getHistoryEntryDatapacksPath", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  const verifyFilepath = vi.spyOn(util, "verifyFilepath");
  it("should return the correct path", async () => {
    const uuid = "test-uuid";
    const timestamp = "1234567890123";
    const filepath = await getHistoryEntryDatapacksPath(uuid, timestamp);
    expect(filepath).toBe(join("/testdir/uploadDirectory", "private", uuid, "history", timestamp, "datapacks"));
    expect(verifyFilepath).toHaveBeenNthCalledWith(3, filepath);
  });
  it("should throw error if filepath is invalid", async () => {
    const uuid = "test-uuid";
    const timestamp = "1234567890123";
    verifyFilepath.mockResolvedValueOnce(true).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    await expect(getHistoryEntryDatapacksPath(uuid, timestamp)).rejects.toThrow("Invalid filepath");
    expect(verifyFilepath).toHaveBeenNthCalledWith(
      3,
      join("/testdir/uploadDirectory", "private", uuid, "history", timestamp, "datapacks")
    );
    expect(verifyFilepath).toHaveBeenCalledTimes(3);
  });
});

describe("getSpecificUserHistoryRootFilePath", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  const verifyFilepath = vi.spyOn(util, "verifyFilepath");
  it("should return the correct path", async () => {
    const uuid = "test-uuid";
    const timestamp = "1234567890123";
    const filepath = await getSpecificUserHistoryRootFilePath(uuid, timestamp);
    expect(filepath).toBe(join("/testdir/uploadDirectory", "private", uuid, "history", timestamp));
    expect(verifyFilepath).toHaveBeenNthCalledWith(2, filepath);
    expect(verifyFilepath).toHaveBeenCalledTimes(2);
  });
  it("should throw error if filepath is invalid", async () => {
    const uuid = "test-uuid";
    const timestamp = "1234567890123";
    verifyFilepath.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    await expect(getSpecificUserHistoryRootFilePath(uuid, timestamp)).rejects.toThrow("Invalid filepath");
    expect(verifyFilepath).toHaveBeenNthCalledWith(
      2,
      join("/testdir/uploadDirectory", "private", uuid, "history", timestamp)
    );
    expect(verifyFilepath).toHaveBeenCalledTimes(2);
  });
});
