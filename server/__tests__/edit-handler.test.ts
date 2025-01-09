import { describe, beforeEach, afterEach, expect, it, vi } from "vitest";
import { editDatapack } from "../src/cloud/edit-handler";
import * as fetchUserFiles from "../src/user/fetch-user-files";
import * as util from "../src/util";
import * as fsPromises from "fs/promises";
import * as uploadHandler from "../src/upload-handlers";
import * as publicDatapackHandler from "../src/public-datapack-handler";
import * as shared from "@tsconline/shared";
import * as logger from "../src/error-logger";
vi.mock("../src/public-datapack-handler", () => {
  return {
    switchPrivacySettingsOfDatapack: vi.fn(async () => {})
  };
});
vi.mock("../src/user/fetch-user-files", () => {
  return {
    fetchUserDatapackDirectory: vi.fn(async () => "test/test")
  };
});
vi.mock("../src/util", () => {
  return {
    verifyFilepath: vi.fn(async () => true)
  };
});
vi.mock("fs/promises", () => {
  return {
    rename: vi.fn(async () => {}),
    writeFile: vi.fn(async () => {}),
    readFile: vi.fn(async () => {})
  };
});
vi.mock("../src/upload-handlers", () => {
  return {
    changeProfilePicture: vi.fn(async () => {}),
    getTemporaryFilepath: vi.fn().mockResolvedValue("test"),
    replaceDatapackFile: vi.fn(async () => {})
  };
});
vi.mock("../src/error-logger", () => {
  return {
    default: {
      error: vi.fn().mockResolvedValue(undefined)
    }
  };
});
describe("editDatapack tests", async () => {
  const fetchUserDatapackDirectory = vi.spyOn(fetchUserFiles, "fetchUserDatapackDirectory");
  const verifyFilepath = vi.spyOn(util, "verifyFilepath");
  const readFile = vi.spyOn(fsPromises, "readFile");
  const rename = vi.spyOn(fsPromises, "rename");
  const writeFile = vi.spyOn(fsPromises, "writeFile");
  const getTemporaryFilepath = vi.spyOn(uploadHandler, "getTemporaryFilepath");
  const replaceDatapackFile = vi.spyOn(uploadHandler, "replaceDatapackFile");
  const changeProfilePicture = vi.spyOn(uploadHandler, "changeProfilePicture");
  const switchPrivacySettingsOfDatapack = vi.spyOn(publicDatapackHandler, "switchPrivacySettingsOfDatapack");
  const readFileMockReturn = { title: "test", isPublic: false };
  const loggerError = vi.spyOn(logger.default, "error");
  // TODO: make these into method mocks where it mocks and expects for other methods that use fetchUserDatapackFilepath or fetchUserDatapack
  beforeEach(() => {
    fetchUserDatapackDirectory.mockResolvedValueOnce("test");
    verifyFilepath.mockResolvedValueOnce(true);
    readFile.mockResolvedValueOnce(JSON.stringify(readFileMockReturn));
    vi.clearAllMocks();
  });
  afterEach(() => {
    expect(fetchUserDatapackDirectory).toHaveNthReturnedWith(1, "test");
    expect(verifyFilepath).toHaveNthReturnedWith(1, true);
    expect(readFile).toHaveNthReturnedWith(1, JSON.stringify(readFileMockReturn));
  });
  it("should call renameUserDatapack if the newDatapack has a title", async () => {
    const newDatapack: Partial<shared.DatapackMetadata> = { title: "new-title" };
    await editDatapack("test", readFileMockReturn.title, newDatapack);
    expect(rename).toHaveBeenCalledOnce();
    expect(writeFile).toHaveBeenCalledOnce();
    expect(replaceDatapackFile).not.toHaveBeenCalled();
  });
  it("should call replaceDatapackFile if file change requested for datapack", async () => {
    const newDatapack: Partial<shared.DatapackMetadata> = { originalFileName: "new-file" };
    replaceDatapackFile.mockResolvedValueOnce(newDatapack as shared.Datapack);
    await editDatapack("test", readFileMockReturn.title, newDatapack);
    expect(rename).not.toHaveBeenCalled();
    expect(writeFile).toHaveBeenCalledOnce();
    expect(replaceDatapackFile).toHaveBeenCalledOnce();
    expect(getTemporaryFilepath).toHaveBeenCalledOnce();
  });
  it("should push error if no file is uploaded for replaceDatapackFile", async () => {
    const newDatapack: Partial<shared.DatapackMetadata> = { originalFileName: "new-file" };
    getTemporaryFilepath.mockResolvedValueOnce("");
    verifyFilepath.mockResolvedValueOnce(false);
    const errors = await editDatapack("test", readFileMockReturn.title, newDatapack);
    expect(verifyFilepath).toHaveBeenCalledTimes(2);
    expect(errors.length).toBe(1);
    expect(rename).not.toHaveBeenCalled();
    expect(writeFile).not.toHaveBeenCalled();
    expect(replaceDatapackFile).not.toHaveBeenCalled();
    expect(getTemporaryFilepath).toHaveBeenCalledOnce();
  });
  it("should not call changeProfilePicture if no temp file is uploaded", async () => {
    const newDatapack: Partial<shared.DatapackMetadata> = { datapackImage: "new-image" };
    getTemporaryFilepath.mockResolvedValueOnce("");
    verifyFilepath.mockResolvedValueOnce(false);
    const errors = await editDatapack("test", readFileMockReturn.title, newDatapack);
    expect(errors.length).toBe(1);
    expect(rename).not.toHaveBeenCalled();
    expect(writeFile).not.toHaveBeenCalled();
    expect(replaceDatapackFile).not.toHaveBeenCalled();
    expect(changeProfilePicture).not.toHaveBeenCalled();
    expect(getTemporaryFilepath).toHaveBeenCalledOnce();
  });
  it("should call changeProfilePicture and write to datapack if image change requested", async () => {
    const newDatapack: Partial<shared.DatapackMetadata> = { datapackImage: "new-image" };
    await editDatapack("test", readFileMockReturn.title, newDatapack);
    expect(rename).not.toHaveBeenCalled();
    expect(writeFile).toHaveBeenCalledOnce();
    expect(changeProfilePicture).toHaveBeenCalledOnce();
    expect(replaceDatapackFile).not.toHaveBeenCalled();
  });
  it("should call switchPrivacySettingsOfDatapack", async () => {
    const newDatapack: Partial<shared.DatapackMetadata> = { isPublic: true };
    await editDatapack("test", readFileMockReturn.title, newDatapack);
    expect(rename).not.toHaveBeenCalled();
    expect(writeFile).toHaveBeenCalledOnce();
    expect(switchPrivacySettingsOfDatapack).toHaveBeenCalledOnce();
    expect(replaceDatapackFile).not.toHaveBeenCalled();
  });
  it("should write all non-file access properties even if all properties fail", async () => {
    const newDatapack: Partial<shared.DatapackMetadata> = {
      title: "new-title",
      originalFileName: "new-file",
      datapackImage: "new-image",
      isPublic: true,
      description: "new-description"
    };
    rename.mockRejectedValueOnce(new Error("rename error"));
    replaceDatapackFile.mockRejectedValueOnce(new Error("replaceDatapackFile error"));
    changeProfilePicture.mockRejectedValueOnce(new Error("changeProfilePicture error"));
    switchPrivacySettingsOfDatapack.mockRejectedValueOnce(new Error("switchPrivacySettingsOfDatapack error"));
    const errors = await editDatapack("test", readFileMockReturn.title, newDatapack);
    expect(errors.length).toBe(4);
    expect(rename).toHaveBeenCalledOnce();
    expect(loggerError).toHaveBeenCalledTimes(4);
    expect(replaceDatapackFile).toHaveBeenCalledOnce();
    expect(changeProfilePicture).toHaveBeenCalledOnce();
    expect(switchPrivacySettingsOfDatapack).toHaveBeenCalledOnce();
    expect(writeFile).toHaveBeenCalledOnce();
    expect(writeFile).toHaveBeenCalledWith(
      "test/test/test-cached-filename",
      JSON.stringify({ ...readFileMockReturn, description: newDatapack.description }, null, 2)
    );
  });
  it("should not write if all properties fail and no non-file access properties are present", async () => {
    const newDatapack: Partial<shared.DatapackMetadata> = {
      title: "new-title",
      originalFileName: "new-file",
      isPublic: true,
      datapackImage: "new-image"
    };
    rename.mockRejectedValueOnce(new Error("rename error"));
    replaceDatapackFile.mockRejectedValueOnce(new Error("replaceDatapackFile error"));
    changeProfilePicture.mockRejectedValueOnce(new Error("changeProfilePicture error"));
    switchPrivacySettingsOfDatapack.mockRejectedValueOnce(new Error("switchPrivacySettingsOfDatapack error"));
    const errors = await editDatapack("test", readFileMockReturn.title, newDatapack);
    expect(errors.length).toBe(4);
    expect(rename).toHaveBeenCalledOnce();
    expect(loggerError).toHaveBeenCalledTimes(4);
    expect(replaceDatapackFile).toHaveBeenCalledOnce();
    expect(changeProfilePicture).toHaveBeenCalledOnce();
    expect(switchPrivacySettingsOfDatapack).toHaveBeenCalledOnce();
    expect(writeFile).not.toHaveBeenCalled();
  });
});
