import { describe, it, vi, expect, beforeEach } from "vitest";
import {
  fetchAllUsersDatapacks,
  fetchUserDatapack,
  renameUserDatapack,
  writeUserDatapack
} from "../src/user/user-handler";
import * as fsPromises from "fs/promises";
import * as util from "../src/util";
import * as shared from "@tsconline/shared";
import * as logger from "../src/error-logger";
import * as fileMetadataHandler from "../src/file-metadata-handler";
import path from "path";
import * as fetchUserFiles from "../src/user/fetch-user-files";

vi.mock("../src/file-metadata-handler", () => {
  return {
    changeFileMetadataKey: vi.fn(async () => {})
  };
});

vi.mock("../src/constants", () => {
  return {
    CACHED_USER_DATAPACK_FILENAME: "test"
  };
});

vi.mock("@tsconline/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof shared>();
  return {
    ...actual,
    assertPrivateUserDatapack: vi.fn(),
    assertDatapack: vi.fn()
  };
});

vi.mock("path", async (importOriginal) => {
  const actual = await importOriginal<typeof path>();
  return {
    ...actual,
    default: {
      ...actual,
      resolve: vi.fn(actual.resolve),
      join: vi.fn(actual.join)
    }
  };
});
vi.mock("../src/file-metadata-handler", () => {
  return {
    changeFileMetadataKey: vi.fn(async () => {})
  };
});

vi.mock("../src/error-logger", () => {
  return {
    default: {
      error: vi.fn().mockResolvedValue(undefined)
    }
  };
});

vi.mock("fs/promises", () => {
  return {
    rename: vi.fn(async () => {}),
    writeFile: vi.fn(async () => {}),
    readFile: vi.fn(async () => Promise.resolve(JSON.stringify(readFileMockReturn)))
  };
});
vi.mock("../src/util", () => {
  return {
    verifyFilepath: vi.fn(async () => true),
    assetconfigs: {
      uploadDirectory: "test",
      privateDatapacksDirectory: "private",
      publicDatapacksDirectory: "public"
    }
  };
});
vi.mock("../src/user/fetch-user-files", () => {
  return {
    getAllUserDatapackDirectories: vi.fn(async () => ["test1/test"]),
    getDirectories: vi.fn(async () => ["test"]),
    fetchUserDatapackDirectory: vi.fn(async () => "test/test")
  };
});
const readFileMockReturn = { title: "test" };

describe("fetchAllUsersDatapacks test", () => {
  const readFile = vi.spyOn(fsPromises, "readFile");
  const getDirectories = vi.spyOn(fetchUserFiles, "getDirectories");
  const getAllUserDatapackDirectories = vi.spyOn(fetchUserFiles, "getAllUserDatapackDirectories");
  const verifyFilepath = vi.spyOn(util, "verifyFilepath");
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should throw an error if fetchAllUsersDatapacks fails", async () => {
    getAllUserDatapackDirectories.mockRejectedValueOnce(new Error("fetchAllUsersDatapacks error"));
    await expect(fetchAllUsersDatapacks("test")).rejects.toThrow("fetchAllUsersDatapacks error");
    expect(getAllUserDatapackDirectories).toHaveBeenCalledOnce();
  });
  it("should throw an error if getDirectories fails", async () => {
    getDirectories.mockRejectedValueOnce(new Error("getDirectories error"));
    await expect(fetchAllUsersDatapacks("test")).rejects.toThrow("getDirectories error");
    expect(getDirectories).toHaveBeenCalledOnce();
  });
  it("should return an array of user datapacks", async () => {
    const array = [{ title: "test1" }, { title: "test2" }, { title: "test3" }, { title: "test4" }];
    getDirectories.mockResolvedValueOnce(array.map((datapack) => datapack.title));
    for (const datapack of array) {
      readFile.mockResolvedValueOnce(JSON.stringify(datapack));
    }
    expect(await fetchAllUsersDatapacks("test")).toEqual(array);
  });
  it("should log an error if the datapack is invalid", async () => {
    getDirectories.mockResolvedValueOnce(["test"]);
    readFile.mockRejectedValueOnce(new Error("readFile error"));
    expect(await fetchAllUsersDatapacks("test")).toEqual([]);
    expect(logger.default.error).toHaveBeenCalledOnce();
  });
  it("should log an error if verifyFilepath fails", async () => {
    getDirectories.mockResolvedValueOnce(["test"]);
    verifyFilepath.mockResolvedValueOnce(false);
    expect(await fetchAllUsersDatapacks("test")).toEqual([]);
    expect(logger.default.error).toHaveBeenCalledOnce();
  });
  it("should log an error if the datapack already exists in the array", async () => {
    getDirectories.mockResolvedValueOnce(["test", "test"]);
    readFile
      .mockResolvedValueOnce(JSON.stringify(readFileMockReturn))
      .mockResolvedValueOnce(JSON.stringify(readFileMockReturn));
    expect(await fetchAllUsersDatapacks("test")).toEqual([readFileMockReturn]);
    expect(logger.default.error).toHaveBeenCalledOnce();
  });
  it("should log an error verifyFilepath returns false", async () => {
    verifyFilepath.mockResolvedValueOnce(false);
    expect(await fetchAllUsersDatapacks("test")).toEqual([]);
    expect(logger.default.error).toHaveBeenCalledOnce();
  });
  it("should still return one datapack if the verifyFilepath fails for only one of the two datapacks", async () => {
    getDirectories.mockResolvedValueOnce(["test", "test2"]);
    readFile
      .mockResolvedValueOnce(JSON.stringify({ title: "test" }))
      .mockRejectedValueOnce(new Error("readFile error"));
    expect(await fetchAllUsersDatapacks("test")).toEqual([{ title: "test" }]);
    expect(logger.default.error).toHaveBeenCalledOnce();
  });
});

describe("fetchUserDatapack test", () => {
  const fetchUserDatapackDirectory = vi.spyOn(fetchUserFiles, "fetchUserDatapackDirectory");
  const verifyFilepath = vi.spyOn(util, "verifyFilepath");
  const readFile = vi.spyOn(fsPromises, "readFile");
  const assertDatapack = vi.spyOn(shared, "assertDatapack");
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should throw an error if fetchUserDatapackDirectory fails", async () => {
    fetchUserDatapackDirectory.mockRejectedValueOnce(new Error("fetchUserDatapackDirectory error"));
    await expect(fetchUserDatapack("test", "test")).rejects.toThrow("fetchUserDatapackDirectory error");
    expect(fetchUserDatapackDirectory).toHaveBeenCalledOnce();
  });
  it("should throw an error if verifyFilepath fails", async () => {
    verifyFilepath.mockResolvedValueOnce(false);
    await expect(fetchUserDatapack("test", "test")).rejects.toThrow(`File ${readFileMockReturn.title} doesn't exist`);
    expect(verifyFilepath).toHaveBeenCalledOnce();
  });
  it("should throw an error if verifyFilepath throws an error", async () => {
    verifyFilepath.mockResolvedValueOnce(false);
    await expect(fetchUserDatapack("test", "test")).rejects.toThrow(`File ${readFileMockReturn.title} doesn't exist`);
    expect(verifyFilepath).toHaveBeenCalledOnce();
  });
  it("should throw an error if readFile fails", async () => {
    readFile.mockRejectedValueOnce(new Error("readFile error"));
    await expect(fetchUserDatapack("test", "test")).rejects.toThrow("readFile error");
    expect(readFile).toHaveBeenCalledOnce();
  });
  it("should throw an error if assertDatapack fails", async () => {
    assertDatapack.mockImplementationOnce(() => {
      throw new Error("assertDatapack error");
    });
    await expect(fetchUserDatapack("test", "test")).rejects.toThrow("assertDatapack error");
    expect(assertDatapack).toHaveBeenCalledOnce();
  });
  it("should return the datapack", async () => {
    expect(await fetchUserDatapack("test", "test")).toEqual({ title: "test" });
  });
});
describe("renameUserDatapack test", () => {
  const fetchUserDatapackDirectory = vi.spyOn(fetchUserFiles, "fetchUserDatapackDirectory");
  const resolve = vi.spyOn(path, "resolve");
  const writeFile = vi.spyOn(fsPromises, "writeFile");
  const rename = vi.spyOn(fsPromises, "rename");
  const changeFileMetadataKey = vi.spyOn(fileMetadataHandler, "changeFileMetadataKey");
  const datapack = {
    title: "datapack"
  } as shared.Datapack;
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should throw an error if fetchUserDatapackDirectory fails", async () => {
    fetchUserDatapackDirectory.mockRejectedValueOnce(new Error("fetchUserDatapackDirectory error"));
    await expect(renameUserDatapack("test", "test", datapack)).rejects.toThrow("fetchUserDatapackDirectory error");
    expect(fetchUserDatapackDirectory).toHaveBeenCalledOnce();
  });
  it("should throw an error if resolve fails", async () => {
    resolve.mockImplementationOnce(() => {
      throw new Error("resolve error");
    });
    await expect(renameUserDatapack("test", "test", datapack)).rejects.toThrow("resolve error");
    expect(resolve).toHaveBeenCalledOnce();
  });
  it("should throw error if resolve check fails", async () => {
    resolve.mockReturnValueOnce("test");
    await expect(renameUserDatapack("test", "test", datapack)).rejects.toThrow("Invalid filepath");
    expect(resolve).toHaveBeenCalledTimes(2);
  });
  it("should throw error and rename if writeUserDatapack fails", async () => {
    writeFile.mockRejectedValueOnce(new Error("writeUserDatapack error"));
    await expect(renameUserDatapack("test", "test", datapack)).rejects.toThrow("writeUserDatapack error");
    expect(writeFile).toHaveBeenCalledOnce();
    expect(rename).toHaveBeenCalledTimes(2);
  });
  it("should clean up and throw error if changeFileMetadataKey fails", async () => {
    changeFileMetadataKey.mockRejectedValueOnce(new Error("changeFileMetadataKey error"));
    await expect(renameUserDatapack("test", "test", datapack)).rejects.toThrow("changeFileMetadataKey error");
    expect(writeFile).toHaveBeenCalledTimes(2);
    expect(rename).toHaveBeenCalledTimes(2);
  });
  it("should rename the datapack", async () => {
    await renameUserDatapack("test", "test", datapack);
    expect(rename).toHaveBeenCalledTimes(1);
    // once in the method and twice when writing
    expect(fetchUserDatapackDirectory).toHaveBeenCalledTimes(3);
    expect(writeFile).toHaveBeenCalledTimes(1);
  });
});

describe("writeUserDatapack test", () => {
  const fetchUserDatapackDirectory = vi.spyOn(fetchUserFiles, "fetchUserDatapackDirectory");
  const writeFile = vi.spyOn(fsPromises, "writeFile");
  const verifyFilepath = vi.spyOn(util, "verifyFilepath");
  const datapack = { title: "test" } as shared.Datapack;
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should throw an error if fetchUserDatapackDirectory fails", async () => {
    fetchUserDatapackDirectory.mockRejectedValueOnce(new Error("fetchUserDatapackDirectory error"));
    await expect(writeUserDatapack("test", datapack)).rejects.toThrow("fetchUserDatapackDirectory error");
    expect(fetchUserDatapackDirectory).toHaveBeenCalledOnce();
  });
  it("should throw an error if verifyFilepath fails", async () => {
    verifyFilepath.mockResolvedValueOnce(false);
    await expect(writeUserDatapack("test", datapack)).rejects.toThrow("Invalid filepath");
    expect(verifyFilepath).toHaveBeenCalledOnce();
  });
  it("should throw an error if writeFile fails", async () => {
    writeFile.mockRejectedValueOnce(new Error("writeFile error"));
    await expect(writeUserDatapack("test", datapack)).rejects.toThrow("writeFile error");
    expect(writeFile).toHaveBeenCalledOnce();
  });
  it("should write the datapack", async () => {
    await writeUserDatapack("test", datapack);
    expect(writeFile).toHaveBeenCalledOnce();
    expect(writeFile).toHaveBeenCalledWith("test/test/test", JSON.stringify(datapack, null, 2));
  });
});
