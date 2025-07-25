import { describe, it, vi, expect, beforeEach, test, beforeAll } from "vitest";
import {
  checkFileTypeIsDatapack,
  checkFileTypeIsDatapackImage,
  convertNonStringFieldsToCorrectTypesInDatapackMetadataRequest,
  deleteAllUserDatapacks,
  deleteUserDatapack,
  doesDatapackFolderExistInAllUUIDDirectories,
  fetchAllUsersDatapacks,
  fetchUserDatapack,
  getUploadedDatapackFilepath,
  processEditDatapackRequest,
  renameUserDatapack,
  writeUserDatapack
} from "../src/user/user-handler";
import * as database from "../src/database";
import * as fsPromises from "fs/promises";
import * as util from "../src/util";
import * as shared from "@tsconline/shared";
import * as logger from "../src/error-logger";
import * as fileMetadataHandler from "../src/file-metadata-handler";
import * as uploadHandler from "../src/upload-handlers";
import path from "path";
import * as fetchUserFiles from "../src/user/fetch-user-files";
import { Multipart, MultipartFile } from "@fastify/multipart";
import { cloneDeep } from "lodash";
import { DATAPACK_PROFILE_PICTURE_FILENAME } from "../src/constants";

vi.mock("../src/database", async () => {
  return {
    findUser: vi.fn(async () => [Promise.resolve(testUser)])
  };
});

vi.mock("../src/upload-handlers", async () => {
  return {
    uploadFileToFileSystem: vi.fn(async () => ({ code: 200, message: "success" })),
    getTemporaryFilepath: vi.fn(async () => "test")
  };
});

vi.mock("../src/file-metadata-handler", async () => {
  return {
    changeFileMetadataKey: vi.fn(async () => {}),
    deleteDatapackFoundInMetadata: vi.fn(async () => {})
  };
});

vi.mock("../src/constants", () => {
  return {
    CACHED_USER_DATAPACK_FILENAME: "test-cached-filename",
    DATAPACK_PROFILE_PICTURE_FILENAME: "test-datapack-pro-pic-filename"
  };
});

vi.mock("@tsconline/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof shared>();
  return {
    ...actual,
    isDateValid: vi.fn().mockReturnValue(true),
    assertPrivateUserDatapack: vi.fn(),
    assertDatapack: vi.fn(),
    isWorkshopUUID: vi.fn().mockReturnValue(false),
    isOfficialUUID: vi.fn().mockReturnValue(false),
    isTempUUID: vi.fn().mockReturnValue(false)
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
vi.mock("../src/error-logger", () => {
  return {
    default: {
      error: vi.fn().mockResolvedValue(undefined)
    }
  };
});

vi.mock("fs/promises", () => {
  return {
    rm: vi.fn(async () => {}),
    rename: vi.fn(async () => {}),
    writeFile: vi.fn(async () => {}),
    readFile: vi.fn(async () => Promise.resolve(JSON.stringify(readFileMockReturn)))
  };
});
vi.mock("../src/util", () => {
  return {
    verifyFilepath: vi.fn(async () => true),
    makeTempFilename: vi.fn(() => "tempFileName"),
    getBytes: vi.fn(() => "1 B"),
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
    fetchUserDatapackDirectory: vi.fn(async () => "test/test"),
    getPrivateUserUUIDDirectory: vi.fn(async () => "test"),
    getCachedDatapackFilePath: vi.fn(() => "test/test/test-cached-filename")
  };
});
const testUser = {
  uuid: "test-uuid",
  userId: 123,
  email: "test@example.com",
  emailVerified: 1,
  invalidateSession: 0,
  username: "testuser",
  hashedPassword: "password123",
  pictureUrl: "https://example.com/picture.jpg",
  isAdmin: 0
};
const readFileMockReturn = { title: "test" };

beforeAll(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

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
  const readFile = vi.spyOn(fsPromises, "readFile");
  const assertDatapack = vi.spyOn(shared, "assertDatapack");
  const getCachedDatapackFilePath = vi.spyOn(fetchUserFiles, "getCachedDatapackFilePath");
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should throw an error if fetchUserDatapackDirectory fails", async () => {
    fetchUserDatapackDirectory.mockRejectedValueOnce(new Error("fetchUserDatapackDirectory error"));
    await expect(fetchUserDatapack("test", "test")).rejects.toThrow("fetchUserDatapackDirectory error");
    expect(fetchUserDatapackDirectory).toHaveBeenCalledOnce();
  });
  it("should throw an error if getCachedDatapackFilePath fails", async () => {
    getCachedDatapackFilePath.mockRejectedValueOnce(new Error("getCachedDatapackFilePath error"));
    await expect(fetchUserDatapack("test", "test")).rejects.toThrow("getCachedDatapackFilePath error");
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
    expect(await fetchUserDatapack("test", "test")).toEqual(readFileMockReturn);
  });
});
describe("renameUserDatapack test", () => {
  const fetchUserDatapackDirectory = vi.spyOn(fetchUserFiles, "fetchUserDatapackDirectory");
  const resolve = vi.spyOn(path, "resolve");
  const rename = vi.spyOn(fsPromises, "rename");
  const changeFileMetadataKey = vi.spyOn(fileMetadataHandler, "changeFileMetadataKey");
  const title = "datapack";
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should throw an error if fetchUserDatapackDirectory fails", async () => {
    fetchUserDatapackDirectory.mockRejectedValueOnce(new Error("fetchUserDatapackDirectory error"));
    await expect(renameUserDatapack("test", "test", title)).rejects.toThrow("fetchUserDatapackDirectory error");
    expect(fetchUserDatapackDirectory).toHaveBeenCalledOnce();
  });
  it("should throw an error if resolve fails", async () => {
    resolve.mockImplementationOnce(() => {
      throw new Error("resolve error");
    });
    await expect(renameUserDatapack("test", "test", title)).rejects.toThrow("resolve error");
    expect(resolve).toHaveBeenCalledOnce();
  });
  it("should throw error if resolve check fails", async () => {
    resolve.mockReturnValueOnce("test");
    await expect(renameUserDatapack("test", "test", title)).rejects.toThrow("Invalid filepath");
    expect(resolve).toHaveBeenCalledTimes(2);
  });
  it("should clean up and throw error if changeFileMetadataKey fails", async () => {
    changeFileMetadataKey.mockRejectedValueOnce(new Error("changeFileMetadataKey error"));
    await expect(renameUserDatapack("test", "test", title, true)).rejects.toThrow("changeFileMetadataKey error");
    expect(rename).toHaveBeenCalledTimes(2);
  });
  it("should rename the datapack", async () => {
    await renameUserDatapack("test", "test", title);
    expect(rename).toHaveBeenCalledTimes(1);
    expect(changeFileMetadataKey).not.toHaveBeenCalled();
    // once in the method and twice when writing
    expect(fetchUserDatapackDirectory).toHaveBeenCalledTimes(1);
  });
  it("should rename the datapack and change file metadata if isTemporaryFile is true", async () => {
    await renameUserDatapack("test", "test", title, true);
    expect(rename).toHaveBeenCalledTimes(1);
    expect(changeFileMetadataKey).toHaveBeenCalledTimes(1);
    // once in the method and twice when writing
    expect(fetchUserDatapackDirectory).toHaveBeenCalledTimes(1);
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
    const expectedPath = path.join("test", "test", "test-cached-filename");
    expect(writeFile).toHaveBeenCalledWith(expectedPath, JSON.stringify(datapack, null, 2));
  });
});

describe("doesDatapackFolderExistInAllUUIDDirectories test", () => {
  const getDirectories = vi.spyOn(fetchUserFiles, "getDirectories");
  const getAllUserDatapackDirectories = vi.spyOn(fetchUserFiles, "getAllUserDatapackDirectories");
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should return true if the datapack exists in all UUID directories", async () => {
    getAllUserDatapackDirectories.mockResolvedValueOnce(["test", "test2"]);
    getDirectories.mockResolvedValueOnce(["test-datapack-one", "test-datapack-two"]);
    expect(await doesDatapackFolderExistInAllUUIDDirectories("test", "test-datapack-one")).toBe(true);
    expect(getAllUserDatapackDirectories).toHaveBeenCalledOnce();
    expect(getDirectories).toHaveBeenCalledOnce();
  });
  it("should return false if the datapack doesn't exist in all UUID directories", async () => {
    getDirectories.mockResolvedValueOnce(["test", "test2"]);
    getAllUserDatapackDirectories.mockResolvedValueOnce(["test"]);
    expect(await doesDatapackFolderExistInAllUUIDDirectories("test", "invalid-datapack")).toBe(false);
  });
  it("should throw error if getDirectories fails", async () => {
    getDirectories.mockRejectedValueOnce(new Error("getDirectories error"));
    await expect(doesDatapackFolderExistInAllUUIDDirectories("test", "test-datapack-one")).rejects.toThrow(
      "getDirectories error"
    );
  });
});

describe("fetchAllPrivateOfficialDatapacks test", () => {
  const getDirectories = vi.spyOn(fetchUserFiles, "getDirectories");
  const readFile = vi.spyOn(fsPromises, "readFile");
  const verifyFilepath = vi.spyOn(util, "verifyFilepath");
  const loggerError = vi.spyOn(logger.default, "error");
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should return no datapacks if no datapacks are found", async () => {
    getDirectories.mockResolvedValueOnce([]);
    expect(await fetchAllUsersDatapacks("test")).toEqual([]);
    expect(getDirectories).toHaveBeenCalledOnce();
    expect(loggerError).not.toHaveBeenCalled();
  });
  it("should return no datapacks if the datapack is invalid", async () => {
    getDirectories.mockResolvedValueOnce(["test"]);
    readFile.mockRejectedValueOnce(new Error("readFile error"));
    expect(await fetchAllUsersDatapacks("test")).toEqual([]);
    expect(loggerError).toHaveBeenCalledOnce();
  });
  it("should return no datapacks and log if a dupe datapack is found", async () => {
    getDirectories.mockResolvedValueOnce(["test", "test"]);
    readFile.mockResolvedValueOnce(JSON.stringify(readFileMockReturn));
    expect(await fetchAllUsersDatapacks("test")).toEqual([readFileMockReturn]);
    expect(loggerError).toHaveBeenCalledOnce();
  });
  it("should return no datapacks and log if verifyFilepath fails", async () => {
    getDirectories.mockResolvedValueOnce(["test"]);
    verifyFilepath.mockResolvedValueOnce(false);
    expect(await fetchAllUsersDatapacks("test")).toEqual([]);
    expect(loggerError).toHaveBeenCalledOnce();
  });
  it("should return one datapack successfully", async () => {
    getDirectories.mockResolvedValueOnce(["test"]);
    readFile.mockResolvedValueOnce(JSON.stringify(readFileMockReturn));
    expect(await fetchAllUsersDatapacks("test")).toEqual([readFileMockReturn]);
  });
  it("should return multiple datapacks successfully", async () => {
    const array = [{ title: "test1" }, { title: "test2" }, { title: "test3" }, { title: "test4" }];
    getDirectories.mockResolvedValueOnce(array.map((datapack) => datapack.title));
    for (const datapack of array) {
      readFile.mockResolvedValueOnce(JSON.stringify(datapack));
    }
    expect(await fetchAllUsersDatapacks("test")).toEqual(array);
  });
  it("should return one datapack if other datapacks fail", async () => {
    getDirectories.mockResolvedValueOnce(["test", "test2"]);
    readFile
      .mockResolvedValueOnce(JSON.stringify({ title: "test" }))
      .mockRejectedValueOnce(new Error("readFile error"));
    expect(await fetchAllUsersDatapacks("test")).toEqual([{ title: "test" }]);
    expect(loggerError).toHaveBeenCalledOnce();
  });
});

describe("getUploadedDatapackFilepath test", () => {
  const fetchUserDatapackDirectory = vi.spyOn(fetchUserFiles, "fetchUserDatapackDirectory");
  const verifyFilepath = vi.spyOn(util, "verifyFilepath");
  const getCachedDatapackFilePath = vi.spyOn(fetchUserFiles, "getCachedDatapackFilePath");
  const readFile = vi.spyOn(fsPromises, "readFile");
  const readFileMockReturn = { storedFileName: "test" };
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should throw an error if verifyFilepath returns false", async () => {
    verifyFilepath.mockResolvedValueOnce(false);
    readFile.mockResolvedValueOnce(JSON.stringify(readFileMockReturn));
    await expect(getUploadedDatapackFilepath("test", "test")).rejects.toThrow("Invalid filepath");
    expect(fetchUserDatapackDirectory).toHaveBeenCalledTimes(2);
    expect(verifyFilepath).toHaveBeenCalledTimes(1);
  });
  it("should throw an error if verifyFilepath throws an error", async () => {
    verifyFilepath.mockRejectedValueOnce(new Error("verifyFilepath error"));
    readFile.mockResolvedValueOnce(JSON.stringify(readFileMockReturn));
    await expect(getUploadedDatapackFilepath("test", "test")).rejects.toThrow("verifyFilepath error");
    expect(fetchUserDatapackDirectory).toHaveBeenCalledTimes(2);
    expect(verifyFilepath).toHaveBeenCalledOnce();
  });
  it("should throw an error if getCachedDatapackFilePath throws an error", async () => {
    getCachedDatapackFilePath.mockRejectedValueOnce(new Error("getCachedDatapackFilePath error"));
    await expect(getUploadedDatapackFilepath("test", "test")).rejects.toThrow("getCachedDatapackFilePath error");
    expect(fetchUserDatapackDirectory).toHaveBeenCalledTimes(2);
    expect(verifyFilepath).toHaveBeenCalledTimes(0);
    expect(getCachedDatapackFilePath).toHaveBeenCalledOnce();
  });
  it("should return the filepath", async () => {
    readFile.mockResolvedValueOnce(JSON.stringify(readFileMockReturn));
    const result = await getUploadedDatapackFilepath("test", "test");
    expect(path.normalize(result)).toBe(path.normalize("test/test/test"));
    expect(fetchUserDatapackDirectory).toHaveBeenCalledTimes(2);
  });
});

describe("deleteAllUserDatapacks test", async () => {
  const getAllUserDatapackDirectories = vi.spyOn(fetchUserFiles, "getAllUserDatapackDirectories");
  const rm = vi.spyOn(fsPromises, "rm");
  const deleteDatapackFoundInMetadata = vi.spyOn(fileMetadataHandler, "deleteDatapackFoundInMetadata");
  const loggerError = vi.spyOn(logger.default, "error");
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should do nothing if no uuid directories are found", async () => {
    getAllUserDatapackDirectories.mockResolvedValueOnce([]);
    await expect(deleteAllUserDatapacks("test")).resolves.toBeUndefined();
    expect(deleteDatapackFoundInMetadata).not.toHaveBeenCalled();
    expect(loggerError).not.toHaveBeenCalled();
    expect(rm).not.toHaveBeenCalled();
  });
  it("should log error if error occurs when removing", async () => {
    getAllUserDatapackDirectories.mockResolvedValueOnce(["test"]);
    rm.mockRejectedValueOnce(new Error("rm error"));
    await deleteAllUserDatapacks("test");
    expect(deleteDatapackFoundInMetadata).not.toHaveBeenCalled();
    expect(loggerError).toHaveBeenCalledOnce();
    expect(rm).toHaveBeenCalledOnce();
  });
  it("should remove directories and call deleteDatapackFoundInMetadata", async () => {
    getAllUserDatapackDirectories.mockResolvedValueOnce(["test"]);
    await deleteAllUserDatapacks("test");
    expect(deleteDatapackFoundInMetadata).toHaveBeenCalledOnce();
    expect(loggerError).not.toHaveBeenCalled();
    expect(rm).toHaveBeenCalledOnce();
  });
  it("should remove one directory and log an error if one fails", async () => {
    getAllUserDatapackDirectories.mockResolvedValueOnce(["test", "test2"]);
    rm.mockRejectedValueOnce(new Error("rm error"));
    await deleteAllUserDatapacks("test");
    expect(deleteDatapackFoundInMetadata).toHaveBeenCalledOnce();
    expect(loggerError).toHaveBeenCalledOnce();
    expect(rm).toHaveBeenCalledTimes(2);
  });
});

describe("deleteUserDatapack tests", () => {
  const fetchUserDatapackDirectory = vi.spyOn(fetchUserFiles, "fetchUserDatapackDirectory");
  const verifyFilepath = vi.spyOn(util, "verifyFilepath");
  const rm = vi.spyOn(fsPromises, "rm");
  const loggerError = vi.spyOn(logger.default, "error");
  const deleteDatapackFoundInMetadata = vi.spyOn(fileMetadataHandler, "deleteDatapackFoundInMetadata");
  const isOfficialUUID = vi.spyOn(shared, "isOfficialUUID");
  const isWorkshopUUID = vi.spyOn(shared, "isWorkshopUUID");
  const isTempUUID = vi.spyOn(shared, "isTempUUID");
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should throw error if verify filepath is false", async () => {
    verifyFilepath.mockResolvedValueOnce(false);
    await expect(deleteUserDatapack("uuid", "datapack")).rejects.toThrow("Invalid filepath");
  });
  it("should log error if rm fails", async () => {
    rm.mockRejectedValueOnce(new Error("rm error"));
    await expect(deleteUserDatapack("uuid", "datapack")).rejects.toThrow("rm error");
    expect(loggerError).toHaveBeenCalledOnce();
    expect(fetchUserDatapackDirectory).toHaveBeenCalledOnce();
    expect(deleteDatapackFoundInMetadata).not.toHaveBeenCalled();
  });
  it("should log error if deleteDatapackFoundInMetadata fails", async () => {
    deleteDatapackFoundInMetadata.mockRejectedValueOnce(new Error("deleteDatapackFoundInMetadata error"));
    await deleteUserDatapack("uuid", "datapack");
    expect(loggerError).toHaveBeenCalledOnce();
    expect(rm).toHaveBeenCalledOnce();
    expect(fetchUserDatapackDirectory).toHaveBeenCalledOnce();
  });
  test.each([isOfficialUUID, isWorkshopUUID, isTempUUID])(
    "should not delete metadata if true for %s",
    async (uuidCheck) => {
      vi.clearAllMocks();
      uuidCheck.mockReturnValueOnce(true);
      verifyFilepath.mockResolvedValueOnce(true);
      fetchUserDatapackDirectory.mockResolvedValueOnce("test");
      await deleteUserDatapack("uuid", "datapack");
      expect(rm).toHaveBeenCalledOnce();
      expect(deleteDatapackFoundInMetadata).not.toHaveBeenCalled();
      expect(loggerError).not.toHaveBeenCalled();
    }
  );

  it("should delete the datapack", async () => {
    verifyFilepath.mockResolvedValueOnce(true);
    fetchUserDatapackDirectory.mockResolvedValueOnce("test");
    await deleteUserDatapack("uuid", "datapack");
    expect(rm).toHaveBeenCalledOnce();
    expect(deleteDatapackFoundInMetadata).toHaveBeenCalledOnce();
  });
});

describe("checkFileTypeIsDatapack test", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  test.each([
    ["application/zip", "test.dpk"],
    ["application/octet-stream", "test.map"],
    ["text/plain", "test.mdpk"],
    ["text/plain", "test.dpk"],
    ["text/plain", "test.txt"]
  ])("should return true if the file is a datapack", async (mimetype, filename) => {
    expect(checkFileTypeIsDatapack({ mimetype, filename } as MultipartFile)).toBe(true);
  });
  test.each([
    ["application/json", "test.json"],
    ["application/zip", "test.zip"],
    ["text/plain", "test"],
    ["application/octet-stream", "test"]
  ])(`should return false if the file is not a datapack for %s and %s`, async (mimetype, filename) => {
    expect(checkFileTypeIsDatapack({ mimetype, filename } as MultipartFile)).toBe(false);
  });
});
describe("checkFileTypeIsDatapackImage test", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  test.each([
    ["image/png", "test.png"],
    ["image/jpeg", "test.jpg"],
    ["image/jpg", "test.jpeg"]
  ])("should return true if the file is a datapack image for %s and %s", async (mimetype, filename) => {
    expect(checkFileTypeIsDatapackImage({ mimetype, filename } as MultipartFile)).toBe(true);
  });
  test.each([
    ["application/json", "test.json"],
    ["application/zip", "test.zip"],
    ["text/plain", "test"],
    ["image/svg+xml", "test.svg"],
    ["image/gif", "test.gif"],
    ["application/octet-stream", "test"]
  ])(`should return false if the file is not a datapack image for %s and %s`, async (mimetype, filename) => {
    expect(checkFileTypeIsDatapackImage({ mimetype, filename } as MultipartFile)).toBe(false);
  });
});
describe("processEditDatapackRequest tests", () => {
  let formData: AsyncIterableIterator<Multipart>;
  let currentJson: Record<string, string | { mimetype: string; filename: string; fieldname: string }>;
  const findUser = vi.spyOn(database, "findUser");
  const rm = vi.spyOn(fsPromises, "rm");
  const uploadFileToFileSystem = vi.spyOn(uploadHandler, "uploadFileToFileSystem");

  function createFormData(
    json: Record<string, string | { mimetype: string; filename: string; fieldname: string; bytesRead?: number }> = {}
  ) {
    currentJson = cloneDeep(json);
    formData = {
      async *[Symbol.asyncIterator]() {
        yield* Object.entries(json).map(([name, value]) => {
          if (typeof value === "object") {
            return {
              name,
              type: "file",
              mimetype: value.mimetype,
              filename: value.filename,
              fieldname: value.fieldname,
              bytesRead: value.bytesRead,
              file: {
                truncated: false,
                bytesRead: value.bytesRead ?? 0,
                pipe: vi.fn(),
                on: vi.fn(),
                resume: vi.fn(),
                pause: vi.fn(),
                destroy: vi.fn(),
                destroySoon: vi.fn(),
                unpipe: vi.fn(),
                unshift: vi.fn(),
                wrap: vi.fn(),
                [Symbol.asyncIterator]: vi.fn()
              }
            };
          }
          return {
            name,
            type: "field",
            data: Buffer.from(value.toString())
          };
        });
      }
    } as AsyncIterableIterator<Multipart>;
  }
  const expectCleanUpTempFiles = () => {
    const isDatapackInRequest =
      typeof currentJson.datapack === "object" && currentJson.datapack.fieldname === "datapack";
    const isImageInRequest =
      typeof currentJson.datapackImage === "object" &&
      currentJson.datapackImage.fieldname === DATAPACK_PROFILE_PICTURE_FILENAME;
    if (isDatapackInRequest && isImageInRequest) {
      expect(rm).toHaveBeenCalledTimes(2);
    } else if (isDatapackInRequest || isImageInRequest) {
      expect(rm).toHaveBeenCalledTimes(1);
    } else {
      expect(rm).not.toHaveBeenCalled();
    }
  };
  const testDatapackFormData = {
    mimetype: "application/zip",
    filename: "test.dpk",
    fieldname: "datapack"
  };
  const testDatapackImageFormData = {
    mimetype: "image/png",
    filename: "test.png",
    fieldname: DATAPACK_PROFILE_PICTURE_FILENAME
  };
  beforeEach(() => {
    currentJson = {};
    createFormData();
    vi.clearAllMocks();
  });
  it("should return 401 operation result if find user returns empty", async () => {
    findUser.mockResolvedValueOnce([]);
    const result = await processEditDatapackRequest(formData, "test");
    expect(findUser).toHaveBeenCalledOnce();
    expect(result).toEqual({ code: 401, message: "User not found" });
  });
  test.each([
    ["application/encoded", "test.dpk"],
    ["application/octet-stream", "test.enc"],
    ["text/plain", "test.mk"],
    ["application/json", "test.k"],
    ["application/json", "test.txt"]
  ])("should return 415 operation result if the file is not a datapack for %s and %s", async (mimetype, filename) => {
    createFormData({ datapack: { mimetype, filename, fieldname: "datapack" } });
    const result = await processEditDatapackRequest(formData, "test");
    expect(result).toEqual({ code: 415, message: "Invalid file type for datapack" });
  });
  it("should return 413 if file is too large", async () => {
    createFormData({ datapack: { ...testDatapackFormData, bytesRead: 10000 } });
    const result = await processEditDatapackRequest(formData, "test");
    expect(result).toEqual({ code: 413, message: "File is too large" });
  });
  it("should return non 200 if uploadFileToFileSystem fails", async () => {
    createFormData({ datapack: { ...testDatapackFormData } });
    uploadFileToFileSystem.mockResolvedValueOnce({ code: 500, message: "uploadFileToFileSystem error" });
    const result = await processEditDatapackRequest(formData, "test");
    expect(result).toEqual({ code: 500, message: "uploadFileToFileSystem error" });
    expectCleanUpTempFiles();
  });
  test.each([
    ["image/url", "test.png"],
    ["image/png", "test"],
    ["image/png", "test.jp"],
    ["image/png", "test.jpeeg"],
    ["application/json", "test.png"],
    ["application/json", "test.jpg"],
    ["application/json", "test.jpeg"]
  ])(
    "should return 415 operation result if the file is not a datapack image for %s and %s",
    async (mimetype, filename) => {
      createFormData({ datapackImage: { ...testDatapackImageFormData, mimetype, filename } });
      const result = await processEditDatapackRequest(formData, "test");
      expect(result).toEqual({ code: 415, message: "Invalid file type for datapack image" });
    }
  );
  it("should return non 200 if uploadFileToFileSystem fails for datapack image", async () => {
    createFormData({ datapackImage: { ...testDatapackImageFormData } });
    uploadFileToFileSystem.mockResolvedValueOnce({ code: 500, message: "uploadFileToFileSystem error" });
    const result = await processEditDatapackRequest(formData, "test");
    expect(result).toEqual({ code: 500, message: "uploadFileToFileSystem error" });
    expectCleanUpTempFiles();
  });
  it("should return 400 if no fields are provided", async () => {
    const result = await processEditDatapackRequest(formData, "test");
    expect(result).toEqual({ code: 400, message: "No fields provided" });
  });
  it("should return 200 if all fields are provided", async () => {
    createFormData({ datapack: testDatapackFormData, datapackImage: testDatapackImageFormData });
    const result = await processEditDatapackRequest(formData, "test");
    expect(result).toEqual({
      code: 200,
      tempFiles: ["test", "test"],
      fields: {
        datapackImage: expect.stringContaining(DATAPACK_PROFILE_PICTURE_FILENAME),
        filepath: expect.stringContaining("test"),
        originalFileName: testDatapackFormData.filename,
        storedFileName: expect.stringContaining("temp"),
        size: "1 B"
      }
    });
  });
});

describe("convertNonStringFieldsToCorrectTypesInDatapackMetadataRequest tests", () => {
  const isDateValid = vi.spyOn(shared, "isDateValid");
  it("should convert fields to correct types", () => {
    const request: Record<string, string> = {
      title: "test",
      isPublic: "true",
      originalFileName: "test",
      description: "test",
      datapackImage: "test"
    };
    expect(convertNonStringFieldsToCorrectTypesInDatapackMetadataRequest(request)).toEqual({
      title: "test",
      isPublic: true,
      originalFileName: "test",
      description: "test",
      datapackImage: "test"
    });
  });
  it("should return the same object if no fields are provided", () => {
    const request: Record<string, string> = {};
    expect(convertNonStringFieldsToCorrectTypesInDatapackMetadataRequest(request)).toEqual({});
  });
  it("should throw error if date is invalid", () => {
    isDateValid.mockReturnValueOnce(false);
    expect(() => convertNonStringFieldsToCorrectTypesInDatapackMetadataRequest({ date: "invalid" })).toThrow();
    expect(isDateValid).toHaveBeenCalledOnce();
  });
  it("should throw error if title is not trimmed", () => {
    expect(() => convertNonStringFieldsToCorrectTypesInDatapackMetadataRequest({ title: " invalid " })).toThrow();
  });
  it("should throw error if tags are not an array", () => {
    expect(() => convertNonStringFieldsToCorrectTypesInDatapackMetadataRequest({ tags: "invalid" })).toThrow();
  });
  it("should throw an error if references are not an array", () => {
    expect(() => convertNonStringFieldsToCorrectTypesInDatapackMetadataRequest({ references: "invalid" })).toThrow();
  });
  it("should handle all fields", () => {
    const request: Record<string, string> = {
      title: "test",
      isPublic: "true",
      originalFileName: "test",
      description: "test",
      datapackImage: "test",
      date: "2021-01-01",
      tags: JSON.stringify(["tag1", "tag2"]),
      references: JSON.stringify(["ref1", "ref2"])
    };
    expect(convertNonStringFieldsToCorrectTypesInDatapackMetadataRequest(request)).toEqual({
      title: "test",
      isPublic: true,
      originalFileName: "test",
      description: "test",
      datapackImage: "test",
      date: "2021-01-01",
      tags: ["tag1", "tag2"],
      references: ["ref1", "ref2"]
    });
  });
});
