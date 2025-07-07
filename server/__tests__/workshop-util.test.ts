import * as shared from "@tsconline/shared";

import {
  extractWorkshopIdFromFolderName,
  getWorkshopCoverPath,
  getWorkshopFilesPath,
  getWorkshopIdFromUUID,
  isUUIDFolderAWorkshopFolder,
  verifyWorkshopValidity
} from "../src/workshop/workshop-util";
import { vi, describe, it, expect, beforeEach } from "vitest";
import * as database from "../src/database";
import * as util from "../src/util";
import * as fsPromises from "fs/promises";

vi.mock("../src/user/fetch-user-files", async () => {
  return {
    getUserUUIDDirectory: vi.fn().mockImplementation(() => "valid/path")
  };
});

vi.mock("fs/promises", async () => {
  return {
    mkdir: vi.fn().mockResolvedValue(undefined)
  };
});

vi.mock("../src/util", async () => {
  return {
    verifyFilepath: vi.fn().mockResolvedValue(true),
    verifyNonExistentFilepath: vi.fn().mockResolvedValue(true)
  };
});

vi.mock("../src/database", async () => {
  return {
    isUserInWorkshopAndWorkshopIsActive: vi.fn().mockResolvedValue(true)
  };
});
vi.mock("@tsconline/shared", async () => {
  return {
    isWorkshopUUID: vi.fn().mockResolvedValue(true),
    getWorkshopUUIDFromWorkshopId: vi.fn().mockImplementation((id) => `workshop-${id}`)
  };
});

describe("getWorkshopIdFromUUID", () => {
  const isWorkshopUUID = vi.spyOn(shared, "isWorkshopUUID");
  it("should return the workshop ID from a valid workshop UUID", () => {
    const uuid = "workshop-12345";
    const result = getWorkshopIdFromUUID(uuid);
    expect(result).toBe(12345);
  });

  it("should return null for an invalid workshop UUID", () => {
    const uuid = "invalid-uuid";
    isWorkshopUUID.mockReturnValueOnce(false);
    const result = getWorkshopIdFromUUID(uuid);
    expect(result).toBeNull();
  });
  it("should return null if second part of UUID is not a number", () => {
    const uuid = "workshop";
    isWorkshopUUID.mockReturnValueOnce(true);
    const result = getWorkshopIdFromUUID(uuid);
    expect(result).toBeNull();
  });
  it("should return null for a non-workshop UUID", () => {
    const uuid = "user-12345";
    isWorkshopUUID.mockReturnValueOnce(false);
    const result = getWorkshopIdFromUUID(uuid);
    expect(result).toBeNull();
  });
});

describe("isUUIDFolderAWorkshopFolder", () => {
  const isWorkshopUUID = vi.spyOn(shared, "isWorkshopUUID");
  it("should return true for a valid workshop UUID folder name", () => {
    const folderName = "workshop-12345";
    const result = isUUIDFolderAWorkshopFolder(folderName);
    expect(result).toBe(true);
  });

  it("should return false for an invalid workshop UUID folder name", () => {
    const folderName = "invalid-folder";
    isWorkshopUUID.mockReturnValueOnce(false);
    const result = isUUIDFolderAWorkshopFolder(folderName);
    expect(result).toBe(false);
  });
});

describe("verifyWorkshopValidity", async () => {
  const workshopId = 12345;
  const isUserInWorkshopAndWorkshopIsActive = vi.spyOn(database, "isUserInWorkshopAndWorkshopIsActive");
  it("should return 403 if the user does not have access to the workshop", async () => {
    isUserInWorkshopAndWorkshopIsActive.mockResolvedValueOnce(false);
    const result = await verifyWorkshopValidity(workshopId, 1);
    expect(result).toEqual({ code: 403, message: "User does not have access to this workshop" });
  });
  it("should return 200 if the user has access to the workshop", async () => {
    isUserInWorkshopAndWorkshopIsActive.mockResolvedValueOnce(true);
    const result = await verifyWorkshopValidity(workshopId, 1);
    expect(result).toEqual({ code: 200, message: "Success" });
  });
});

describe("extractWorkshopIdFromFolderName", () => {
  const isWorkshopUUID = vi.spyOn(shared, "isWorkshopUUID");
  it("should return the workshop ID from a valid workshop folder name", () => {
    isWorkshopUUID.mockReturnValueOnce(true);
    const folderName = "workshop-12345";
    const result = extractWorkshopIdFromFolderName(folderName);
    expect(result).toBe(12345);
  });
});

describe("getWorkshopFilesPath", async () => {
  const mkdir = vi.spyOn(fsPromises, "mkdir");
  const verifyFilepath = vi.spyOn(util, "verifyFilepath");
  const verifyNonExistentFilepath = vi.spyOn(util, "verifyNonExistentFilepath");
  const id = 12345;
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should throw error if the files directory doesn't exist and the filesDir is not a valid filepath", async () => {
    verifyFilepath.mockResolvedValueOnce(false);
    verifyNonExistentFilepath.mockResolvedValueOnce(false);
    await expect(getWorkshopFilesPath(id)).rejects.toThrow("Invalid Workshop Files Directory.");
  });
  it("should make a new directory and return the files directory if it doesn't initially exist", async () => {
    verifyFilepath.mockResolvedValueOnce(false);
    verifyNonExistentFilepath.mockResolvedValueOnce(true);
    const result = await getWorkshopFilesPath(id);
    expect(mkdir).toHaveBeenCalledWith("valid/path/files", { recursive: true });
    expect(result).toBe("valid/path/files");
  });
  it("should return the files directory if it already exists", async () => {
    verifyFilepath.mockResolvedValueOnce(true);
    const result = await getWorkshopFilesPath(id);
    expect(mkdir).not.toHaveBeenCalled();
    expect(result).toBe("valid/path/files");
  });
});

describe("getWorkshopCoverPath", async () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  const id = 12345;
  const verifyFilepath = vi.spyOn(util, "verifyFilepath");
  const verifyNonExistentFilepath = vi.spyOn(util, "verifyNonExistentFilepath");
  const mkdir = vi.spyOn(fsPromises, "mkdir");
  it("should return the cover directory path for a valid workshop directory", async () => {
    verifyFilepath.mockResolvedValueOnce(true);
    const result = await getWorkshopCoverPath(id);
    expect(result).toBe("valid/path/cover");
  });
  it("should throw an error if the direcotry is not a valid filepath", async () => {
    verifyFilepath.mockResolvedValueOnce(false);
    verifyNonExistentFilepath.mockResolvedValueOnce(false);
    await expect(getWorkshopCoverPath(id)).rejects.toThrow("Invalid Workshop Cover Picture Directory.");
  });
  it("should successfully create the cover directory if it doesn't exist", async () => {
    verifyFilepath.mockResolvedValueOnce(false);
    verifyNonExistentFilepath.mockResolvedValueOnce(true);
    const result = await getWorkshopCoverPath(id);
    expect(result).toBe("valid/path/cover");
    expect(mkdir).toHaveBeenCalledWith("valid/path/cover", { recursive: true });
  });
});
