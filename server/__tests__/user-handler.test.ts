import { describe, it, vi, expect, beforeEach } from "vitest";
import {
  fetchAllUsersDatapacks,
  fetchUserDatapack,
  getDirectories,
  getUserDirectory,
  renameUserDatapack,
  writeUserDatapack
} from "../src/user/user-handler";
import * as fsPromises from "fs/promises";
import * as util from "../src/util";
import * as shared from "@tsconline/shared";
import * as logger from "../src/error-logger";
import path from "path";
import * as fileMetadataHandler from "../src/file-metadata-handler";
import { Dirent } from "fs";

vi.mock("../src/file-metadata-handler", () => {
  return {
    changeFileMetadataKey: vi.fn(async () => {})
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
      resolve: vi.fn((...args: string[]) => {
        return args.join("/");
      }),
      join: vi.fn(actual.join)
    }
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
    readdir: vi.fn(async () => {
      return [
        { isDirectory: () => true, name: "test1" },
        { isDirectory: () => false, name: "test2" },
        { isDirectory: () => true, name: "test3" }
      ];
    }),
    rename: vi.fn(async () => {}),
    mkdir: vi.fn(async () => {}),
    writeFile: vi.fn(async () => {}),
    readFile: vi.fn(async () => JSON.stringify({ title: "test" }))
  };
});
vi.mock("../src/util", () => {
  return {
    checkFileExists: vi.fn(async () => true),
    verifyFilepath: vi.fn(async () => true),
    assetconfigs: {
      uploadDirectory: "test"
    }
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
  const readFile = vi.spyOn(fsPromises, "readFile");
  const assertPrivateUserDatapack = vi.spyOn(shared, "assertPrivateUserDatapack");
  const readdir = vi.spyOn(fsPromises, "readdir");
  const assertDatapack = vi.spyOn(shared, "assertDatapack");
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
    readdir.mockRejectedValueOnce(new Error("readdir error"));
    await expect(fetchAllUsersDatapacks("test")).rejects.toThrow("readdir error");
    expect(readdir).toHaveBeenCalledOnce();
  });
  it("should throw an error if checkFileExists fails for a datapack", async () => {
    checkFileExists.mockRejectedValueOnce(new Error("checkFileExists error"));
    await expect(fetchAllUsersDatapacks("test")).rejects.toThrow("checkFileExists error");
    expect(checkFileExists).toHaveBeenCalledOnce();
  });
  it("should throw an error if readFile fails for a datapack", async () => {
    readFile.mockRejectedValueOnce(new Error("readFile error"));
    await expect(fetchAllUsersDatapacks("test")).rejects.toThrow("readFile error");
    expect(readFile).toHaveBeenCalledOnce();
  });
  it("should throw an error if the datapack does not pass the private user datapack assertion", async () => {
    assertPrivateUserDatapack.mockImplementationOnce(() => {
      throw new Error("assertPrivateUserDatapack error");
    });
    await expect(fetchAllUsersDatapacks("test")).rejects.toThrow("assertPrivateUserDatapack error");
    expect(assertPrivateUserDatapack).toHaveBeenCalledOnce();
  });
  it("should throw an error if the datapack does not pass the datapack assertion", async () => {
    assertDatapack.mockImplementationOnce(() => {
      throw new Error("assertDatapack error");
    });
    await expect(fetchAllUsersDatapacks("test")).rejects.toThrow("assertDatapack error");
    expect(assertDatapack).toHaveBeenCalledOnce();
    expect(assertPrivateUserDatapack).toHaveBeenCalledOnce();
  });
  it("should log an error if multiple datapacks exist in the same directory", async () => {
    const error = vi.spyOn(logger.default, "error");
    readdir.mockResolvedValueOnce([
      { isDirectory: () => true, name: "test1" } as Dirent,
      { isDirectory: () => true, name: "test1" } as Dirent
    ]);
    checkFileExists.mockResolvedValueOnce(true).mockResolvedValueOnce(true);
    await expect(fetchAllUsersDatapacks("test")).rejects.toThrow("Datapack test1 already exists in the index");
    expect(error).toHaveBeenCalledOnce();
  });
  it("should return a datapack index", async () => {
    expect(await fetchAllUsersDatapacks("test")).toEqual({
      test1: { title: "test" },
      test3: { title: "test" }
    });
  });
});

describe("getUserDirectory test", () => {
  const verifyFilepath = vi.spyOn(util, "verifyFilepath");
  it("should throw an error if the filepath is invalid", async () => {
    verifyFilepath.mockResolvedValueOnce(false);
    await expect(getUserDirectory("test")).rejects.toThrow("Invalid filepath");
    expect(verifyFilepath).toHaveBeenCalledOnce();
  });
  it("should return a user directory", async () => {
    expect(await getUserDirectory("test")).toBe("test/test");
  });
});

describe("fetchUserDatapack test", () => {
  const verifyFilepath = vi.spyOn(util, "verifyFilepath");
  const checkFileExists = vi.spyOn(util, "checkFileExists");
  const readFile = vi.spyOn(fsPromises, "readFile");
  const assertPrivateUserDatapack = vi.spyOn(shared, "assertPrivateUserDatapack");
  const assertDatapack = vi.spyOn(shared, "assertDatapack");
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should throw an error if the filepath is invalid", async () => {
    verifyFilepath.mockResolvedValueOnce(false);
    await expect(fetchUserDatapack("test", "test")).rejects.toThrow("File test doesn't exist");
    expect(verifyFilepath).toHaveBeenCalledOnce();
  });
  it("should throw an error if the file does not exist", async () => {
    checkFileExists.mockResolvedValueOnce(false);
    await expect(fetchUserDatapack("test", "test")).rejects.toThrow("File test doesn't exist");
    expect(checkFileExists).toHaveBeenCalledOnce();
  });
  it("should throw an error if readFile fails", async () => {
    readFile.mockRejectedValueOnce(new Error("readFile error"));
    await expect(fetchUserDatapack("test", "test")).rejects.toThrow("readFile error");
    expect(readFile).toHaveBeenCalledOnce();
  });
  it("should throw an error if the datapack does not pass the private asserts", async () => {
    assertPrivateUserDatapack.mockImplementationOnce(() => {
      throw new Error("assertPrivateUserDatapack error");
    });
    await expect(fetchUserDatapack("test", "test")).rejects.toThrow("assertPrivateUserDatapack error");
    expect(assertPrivateUserDatapack).toHaveBeenCalledOnce();
  });
  it("should throw an error if the datapack does not pass the assert datapack check", async () => {
    assertDatapack.mockImplementationOnce(() => {
      throw new Error("assertDatapack error");
    });
    await expect(fetchUserDatapack("test", "test")).rejects.toThrow("assertDatapack error");
    expect(assertDatapack).toHaveBeenCalledOnce();
  });
});
describe("renameUserDatapack test", () => {
  const verifyFilepath = vi.spyOn(util, "verifyFilepath");
  const readFile = vi.spyOn(fsPromises, "readFile");
  const resolve = vi.spyOn(path, "resolve");
  const datapack = { title: "test" } as shared.Datapack;
  const changeFileMetadataKey = vi.spyOn(fileMetadataHandler, "changeFileMetadataKey");
  const writeFile = vi.spyOn(fsPromises, "writeFile");
  const rename = vi.spyOn(fsPromises, "rename");
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should throw an error if the old datapack does not exist", async () => {
    verifyFilepath.mockRejectedValueOnce(new Error("fetchUserDatapack error"));
    await expect(renameUserDatapack("test", "test", datapack)).rejects.toThrow("fetchUserDatapack error");
    expect(verifyFilepath).toHaveBeenCalledOnce();
  });
  it("should throw an error if the filepath is invalid", async () => {
    verifyFilepath.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    await expect(renameUserDatapack("test", "test", datapack)).rejects.toThrow("Invalid filepath");
    expect(verifyFilepath).toHaveBeenCalledTimes(2);
    expect(changeFileMetadataKey).not.toHaveBeenCalled();
  });
  it("should throw an error if the new datapack path is malicious", async () => {
    resolve.mockReturnValueOnce("BADFILE");
    await expect(renameUserDatapack("test", "test", datapack)).rejects.toThrow("Invalid filepath");
    expect(resolve).toHaveBeenCalledTimes(2);
    expect(changeFileMetadataKey).not.toHaveBeenCalled();
  });
  it("should throw an error if readFile fails", async () => {
    readFile.mockRejectedValueOnce(new Error("readFile error"));
    await expect(renameUserDatapack("test", "test", datapack)).rejects.toThrow("readFile error");
    expect(readFile).toHaveBeenCalledOnce();
    expect(changeFileMetadataKey).not.toHaveBeenCalled();
  });
  it("should throw an error if rename fails", async () => {
    rename.mockRejectedValueOnce(new Error("rename error"));
    await expect(renameUserDatapack("test", "test", datapack)).rejects.toThrow("rename error");
    expect(rename).toHaveBeenCalledOnce();
    expect(changeFileMetadataKey).not.toHaveBeenCalled();
  });
  it("should throw an error if writeUserDatapack fails and rename the renamed dir", async () => {
    writeFile.mockRejectedValueOnce(new Error("writeFile error"));
    await expect(
      renameUserDatapack("userDir", "oldDatapack", { title: "newDatapack" } as shared.Datapack)
    ).rejects.toThrow("writeFile error");
    expect(rename).toHaveBeenCalledTimes(2);
    expect(rename).toHaveBeenNthCalledWith(1, "userDir/oldDatapack", "userDir/newDatapack");
    expect(rename).toHaveBeenNthCalledWith(2, "userDir/newDatapack", "userDir/oldDatapack");
    expect(changeFileMetadataKey).not.toHaveBeenCalled();
  });
  it("should throw an error if changeFileMetadataKey fails and rename the renamed dir and rewrite the index json", async () => {
    changeFileMetadataKey.mockRejectedValueOnce(new Error("changeFileMetadataKey error"));
    await expect(
      renameUserDatapack("userDir", "oldDatapack", { title: "newDatapack" } as shared.Datapack)
    ).rejects.toThrow("changeFileMetadataKey error");
    expect(rename).toHaveBeenCalledTimes(2);
    expect(rename).toHaveBeenNthCalledWith(1, "userDir/oldDatapack", "userDir/newDatapack");
    expect(rename).toHaveBeenNthCalledWith(2, "userDir/newDatapack", "userDir/oldDatapack");
    expect(changeFileMetadataKey).toHaveBeenCalledOnce();
    expect(writeFile).toHaveBeenCalledTimes(2);
  });
  it("should rename/edit the datapack", async () => {
    await renameUserDatapack("userDir", "oldDatapack", { title: "newDatapack" } as shared.Datapack);
    expect(rename).toHaveBeenCalledTimes(1);
    expect(changeFileMetadataKey).toHaveBeenCalledOnce();
    expect(writeFile).toHaveBeenCalledTimes(1);
  });
});

describe("writeUserDatapack test", () => {
  const verifyFilepath = vi.spyOn(util, "verifyFilepath");
  const writeFile = vi.spyOn(fsPromises, "writeFile");
  const datapack = { title: "test" } as shared.Datapack;
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should throw an error if the filepath is invalid", async () => {
    verifyFilepath.mockResolvedValueOnce(false);
    await expect(writeUserDatapack("test", datapack)).rejects.toThrow("Invalid filepath");
    expect(verifyFilepath).toHaveBeenCalledOnce();
  });
  it("should throw an error if writeFile fails", async () => {
    writeFile.mockRejectedValueOnce(new Error("writeFile error"));
    await expect(writeUserDatapack("test", datapack)).rejects.toThrow("writeFile error");
    expect(writeFile).toHaveBeenCalledOnce();
  });
  it("should write a datapack", async () => {
    await writeUserDatapack("test", datapack);
    expect(writeFile).toHaveBeenCalledOnce();
  });
});
