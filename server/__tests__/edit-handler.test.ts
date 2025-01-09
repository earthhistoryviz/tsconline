import { describe, beforeEach, afterEach, expect, it, vi } from "vitest";
import { editDatapack } from "../src/cloud/edit-handler";
import * as util from "../src/util";
import * as uploadHandler from "../src/upload-handlers";
import * as userHandler from "../src/user/user-handler";
import * as publicDatapackHandler from "../src/public-datapack-handler";
import * as shared from "@tsconline/shared";
import * as logger from "../src/error-logger";
import { cloneDeep } from "lodash";
vi.mock("../src/public-datapack-handler", () => {
  return {
    switchPrivacySettingsOfDatapack: vi.fn(async () => {})
  };
});
vi.mock("../src/user/user-handler", () => {
  return {
    fetchUserDatapack: vi.fn(async () => {}),
    renameUserDatapack: vi.fn(async () => {}),
    writeUserDatapack: vi.fn(async () => {})
  };
});
vi.mock("../src/util", () => {
  return {
    verifyFilepath: vi.fn(async () => true),
    makeTempFilename: vi.fn(() => "tempFileName")
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
vi.mock("@tsconline/shared", () => {
  return {
    assertDatapack: vi.fn(() => {})
  };
});
describe("editDatapack tests", async () => {
  const verifyFilepath = vi.spyOn(util, "verifyFilepath");
  const getTemporaryFilepath = vi.spyOn(uploadHandler, "getTemporaryFilepath");
  const replaceDatapackFile = vi.spyOn(uploadHandler, "replaceDatapackFile");
  const changeProfilePicture = vi.spyOn(uploadHandler, "changeProfilePicture");
  const metadata = { title: "test", isPublic: false };
  const switchPrivacySettingsOfDatapack = vi.spyOn(publicDatapackHandler, "switchPrivacySettingsOfDatapack");
  const renameUserDatapack = vi.spyOn(userHandler, "renameUserDatapack");
  const fetchUserDatapack = vi.spyOn(userHandler, "fetchUserDatapack");
  const writeUserDatapack = vi.spyOn(userHandler, "writeUserDatapack");
  const loggerError = vi.spyOn(logger.default, "error");
  beforeEach(() => {
    vi.clearAllMocks();
    fetchUserDatapack.mockResolvedValueOnce(cloneDeep(metadata as shared.Datapack));
  });
  afterEach(() => {
    expect(fetchUserDatapack).toHaveBeenCalledOnce();
  });
  it("should call renameUserDatapack if the newDatapack has a title", async () => {
    const newDatapack: Partial<shared.DatapackMetadata> = { title: "new-title" };
    await editDatapack("test", metadata.title, newDatapack);
    expect(renameUserDatapack).toHaveBeenCalledOnce();
    expect(writeUserDatapack).toHaveBeenCalledOnce();
    expect(replaceDatapackFile).not.toHaveBeenCalled();
  });
  it("should call replaceDatapackFile if file change requested for datapack", async () => {
    const newDatapack: Partial<shared.DatapackMetadata> = { originalFileName: "new-file" };
    replaceDatapackFile.mockResolvedValueOnce(newDatapack as shared.Datapack);
    await editDatapack("test", metadata.title, newDatapack);
    expect(renameUserDatapack).not.toHaveBeenCalled();
    expect(writeUserDatapack).toHaveBeenCalledOnce();
    expect(replaceDatapackFile).toHaveBeenCalledOnce();
    expect(getTemporaryFilepath).toHaveBeenCalledOnce();
  });
  it("should push error if no file is uploaded for replaceDatapackFile", async () => {
    const newDatapack: Partial<shared.DatapackMetadata> = { originalFileName: "new-file" };
    getTemporaryFilepath.mockResolvedValueOnce("");
    verifyFilepath.mockResolvedValueOnce(false);
    const errors = await editDatapack("test", metadata.title, newDatapack);
    expect(verifyFilepath).toHaveBeenCalledTimes(1);
    expect(errors.length).toBe(1);
    expect(renameUserDatapack).not.toHaveBeenCalled();
    expect(writeUserDatapack).not.toHaveBeenCalled();
    expect(replaceDatapackFile).not.toHaveBeenCalled();
    expect(getTemporaryFilepath).toHaveBeenCalledOnce();
  });
  it("should not call changeProfilePicture if no temp file is uploaded", async () => {
    const newDatapack: Partial<shared.DatapackMetadata> = { datapackImage: "new-image" };
    getTemporaryFilepath.mockResolvedValueOnce("");
    verifyFilepath.mockResolvedValueOnce(false);
    const errors = await editDatapack("test", metadata.title, newDatapack);
    expect(errors.length).toBe(1);
    expect(renameUserDatapack).not.toHaveBeenCalled();
    expect(writeUserDatapack).not.toHaveBeenCalled();
    expect(replaceDatapackFile).not.toHaveBeenCalled();
    expect(changeProfilePicture).not.toHaveBeenCalled();
    expect(getTemporaryFilepath).toHaveBeenCalledOnce();
  });
  it("should call changeProfilePicture and write to datapack if image change requested", async () => {
    const newDatapack: Partial<shared.DatapackMetadata> = { datapackImage: "new-image" };
    await editDatapack("test", metadata.title, newDatapack);
    expect(renameUserDatapack).not.toHaveBeenCalled();
    expect(writeUserDatapack).toHaveBeenCalledOnce();
    expect(changeProfilePicture).toHaveBeenCalledOnce();
    expect(replaceDatapackFile).not.toHaveBeenCalled();
  });
  it("should call switchPrivacySettingsOfDatapack", async () => {
    const newDatapack: Partial<shared.DatapackMetadata> = { isPublic: true };
    await editDatapack("test", metadata.title, newDatapack);
    expect(renameUserDatapack).not.toHaveBeenCalled();
    expect(writeUserDatapack).toHaveBeenCalledOnce();
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
    renameUserDatapack.mockRejectedValueOnce(new Error("rename error"));
    replaceDatapackFile.mockRejectedValueOnce(new Error("replaceDatapackFile error"));
    changeProfilePicture.mockRejectedValueOnce(new Error("changeProfilePicture error"));
    switchPrivacySettingsOfDatapack.mockRejectedValueOnce(new Error("switchPrivacySettingsOfDatapack error"));
    const errors = await editDatapack("test", metadata.title, newDatapack);
    expect(errors.length).toBe(4);
    expect(renameUserDatapack).toHaveBeenCalledOnce();
    expect(loggerError).toHaveBeenCalledTimes(4);
    expect(replaceDatapackFile).toHaveBeenCalledOnce();
    expect(changeProfilePicture).toHaveBeenCalledOnce();
    expect(switchPrivacySettingsOfDatapack).toHaveBeenCalledOnce();
    expect(writeUserDatapack).toHaveBeenCalledOnce();
  });
  it("should not write if all properties fail and no non-file access properties are present", async () => {
    const newDatapack: Partial<shared.DatapackMetadata> = {
      title: "new-title",
      originalFileName: "new-file",
      isPublic: true,
      datapackImage: "new-image"
    };
    renameUserDatapack.mockRejectedValueOnce(new Error("rename error"));
    replaceDatapackFile.mockRejectedValueOnce(new Error("replaceDatapackFile error"));
    changeProfilePicture.mockRejectedValueOnce(new Error("changeProfilePicture error"));
    switchPrivacySettingsOfDatapack.mockRejectedValueOnce(new Error("switchPrivacySettingsOfDatapack error"));
    const errors = await editDatapack("test", metadata.title, newDatapack);
    expect(errors.length).toBe(4);
    expect(renameUserDatapack).toHaveBeenCalledOnce();
    expect(loggerError).toHaveBeenCalledTimes(4);
    expect(replaceDatapackFile).toHaveBeenCalledOnce();
    expect(changeProfilePicture).toHaveBeenCalledOnce();
    expect(switchPrivacySettingsOfDatapack).toHaveBeenCalledOnce();
    expect(writeUserDatapack).not.toHaveBeenCalled();
  });
});
