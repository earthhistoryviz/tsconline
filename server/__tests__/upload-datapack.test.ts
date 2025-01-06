import { Multipart, MultipartFile } from "@fastify/multipart";
import { cloneDeep } from "lodash";
import { vi, it, describe, beforeEach, expect, afterEach } from "vitest";
import { getDatapackMetadataFromIterableAndTemporarilyDownloadDatapack, processAndUploadDatapack } from "../src/upload-datapack";
import * as types from "../src/types";
import * as uploadHandlers from "../src/upload-handlers";
import * as shared from "@tsconline/shared";
import * as workshopHandler from "../src/workshop/workshop-handler";
import * as database from "../src/database";
import { DatapackMetadata } from "@tsconline/shared";
vi.mock("../src/workshop/workshop-handler", () => {
  return {
    grabAndVerifyWorkshopUUID: vi.fn().mockResolvedValue({ code: 200, message: "Success" })
  };
});
vi.mock("@tsconline/shared", () => {
  return {
    isOfficialDatapack: vi.fn().mockReturnValue(false),
    isWorkshopDatapack: vi.fn().mockReturnValue(false)
  };
});
vi.mock("../src/upload-handlers", () => {
  return {
    processMultipartPartsForDatapackUpload: vi.fn().mockResolvedValue({}),
    uploadUserDatapackHandler: vi.fn().mockResolvedValue({})
  };
});
vi.mock("../src/database", () => {
  return {
    findUser: vi.fn().mockResolvedValue([() => Promise.resolve(user)])
  };
});
vi.mock("../src/types", async (importOriginal) => {
  const actual = await importOriginal<typeof types>();
  return {
    isOperationResult: actual.isOperationResult
  };
});
vi.mock("../src/error-logger", async () => {
  return {
    default: {
      error: vi.fn().mockReturnValue({})
    }
  };
});
const user = {
  isAdmin: true
};
describe("getDatapackMetadataFromIterableAndTemporarilyDownloadDatapack", () => {
  const uploadUserDatapackHandler = vi.spyOn(uploadHandlers, "uploadUserDatapackHandler");
  const processMultipartPartsForDatapackUpload = vi.spyOn(uploadHandlers, "processMultipartPartsForDatapackUpload");
  const isOperationResult = vi.spyOn(types, "isOperationResult");
  let currentJson: Record<
    string,
    string | { mimetype: string; filename: string; fieldname: string; bytesRead?: number }
  >;
  let formData: AsyncIterableIterator<Multipart>;
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
  beforeEach(() => {
    createFormData();
    vi.clearAllMocks();
  });
  it("should return 500 if processMultipartPartsForDatapackUpload throws an error", async () => {
    processMultipartPartsForDatapackUpload.mockRejectedValueOnce(new Error("error"));
    const val = await getDatapackMetadataFromIterableAndTemporarilyDownloadDatapack("uuid", formData);
    expect(processMultipartPartsForDatapackUpload).toHaveBeenCalledOnce();
    expect(val).toEqual({ code: 500, message: "Failed to process multipart parts" });
  });
  it("should return operation result if returned from processMultipartPartsForDatapackUpload", async () => {
    processMultipartPartsForDatapackUpload.mockResolvedValueOnce({ code: 999, message: "error" });
    const val = await getDatapackMetadataFromIterableAndTemporarilyDownloadDatapack("uuid", formData);
    expect(isOperationResult).toHaveBeenCalledTimes(1);
    expect(val).toEqual({ code: 999, message: "error" });
  });
  it("should return 400 if processMultipartPartsForDatapackUpload does not return file or fields", async () => {
    processMultipartPartsForDatapackUpload.mockResolvedValueOnce({
      file: {} as MultipartFile,
      fields: { filepath: "", originalFileName: "", storedFileName: "" }
    });
    const val = await getDatapackMetadataFromIterableAndTemporarilyDownloadDatapack("uuid", formData);
    expect(isOperationResult).toHaveBeenCalledTimes(1);
    expect(val).toEqual({ code: 400, message: "No file uploaded" });
  });
  it("should return 500 if uploadUserDatapackHandler throws an error", async () => {
    processMultipartPartsForDatapackUpload.mockResolvedValueOnce({
      file: {} as MultipartFile,
      fields: { filepath: "", originalFileName: "", storedFileName: "" }
    });
    const val = await getDatapackMetadataFromIterableAndTemporarilyDownloadDatapack("uuid", formData);
    expect(isOperationResult).toHaveBeenCalledTimes(1);
    expect(val).toEqual({ code: 400, message: "No file uploaded" });
  });
  it("should return operation code if uploadUserDatapackHandler returns operation result", async () => {
    processMultipartPartsForDatapackUpload.mockResolvedValueOnce({
      file: { file: { bytesRead: 1 } } as MultipartFile,
      fields: { filepath: "test", originalFileName: "test", storedFileName: "test" }
    });
    uploadUserDatapackHandler.mockResolvedValueOnce({ code: 999, message: "error" });
    const val = await getDatapackMetadataFromIterableAndTemporarilyDownloadDatapack("uuid", formData);
    expect(isOperationResult).toHaveBeenCalledTimes(2);
    expect(val).toEqual({ code: 999, message: "error" });
  });
  it("should return file, filepath, tempProfilePictureFilepath, and datapackMetadata if successful", async () => {
    processMultipartPartsForDatapackUpload.mockResolvedValueOnce({
      file: { file: { bytesRead: 1 } } as MultipartFile,
      fields: { filepath: "test", originalFileName: "test", storedFileName: "test" }
    });
    uploadUserDatapackHandler.mockResolvedValueOnce({} as DatapackMetadata);
    const val = await getDatapackMetadataFromIterableAndTemporarilyDownloadDatapack("uuid", formData);
    expect(val).toEqual({
      file: { file: { bytesRead: 1 } } as MultipartFile,
      filepath: "test",
      tempProfilePictureFilepath: undefined,
      datapackMetadata: {}
    });
  });
});
describe("processAndUploadDatapack", () => {
  const isOfficialDatapack = vi.spyOn(shared, "isOfficialDatapack");
  const findUser = vi.spyOn(database, "findUser");
  const isWorkshopDatapack = vi.spyOn(shared, "isWorkshopDatapack");
  const grabAndVerifyWorkshopUUID = vi.spyOn(workshopHandler, "grabAndVerifyWorkshopUUID");
  const processMultipartPartsForDatapackUpload = vi.spyOn(uploadHandlers, "processMultipartPartsForDatapackUpload");
  const uploadUserDatapackHandler = vi.spyOn(uploadHandlers, "uploadUserDatapackHandler");
  let currentJson: Record<
    string,
    string | { mimetype: string; filename: string; fieldname: string; bytesRead?: number }
  >;
  let formData: AsyncIterableIterator<Multipart>;
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
  beforeEach(() => {
    createFormData();
    vi.clearAllMocks();
    processMultipartPartsForDatapackUpload.mockResolvedValueOnce({
      file: { file: { bytesRead: 1 } } as MultipartFile,
      fields: {
        filepath: "test",
        originalFileName: "test",
        storedFileName: "test"
      }
    });
    uploadUserDatapackHandler.mockResolvedValueOnce({} as DatapackMetadata);
  });
  afterEach(() => {
    vi.clearAllMocks();
    processMultipartPartsForDatapackUpload.mockReset();
    uploadUserDatapackHandler.mockReset();
  });
  it("should return 404 if user is not found", async () => {
    findUser.mockResolvedValueOnce([]);
    const val = await processAndUploadDatapack("uuid", formData);
    expect(val).toEqual({ code: 404, message: "Error finding user" });
  });
  it("should return operation result if getDatapackMetadataFromIterableAndTemporarilyDownloadDatapack returns operation result", async () => {
    processMultipartPartsForDatapackUpload.mockResolvedValueOnce({ code: 999, message: "error" });
    const val = await processAndUploadDatapack("uuid", formData);
    expect(val).toEqual({ code: 999, message: "error" });
  });
  it("should return 401 if user is not admin and datapack is official", async () => {
    isOfficialDatapack.mockReturnValueOnce(true);
    const val = await processAndUploadDatapack("uuid", formData);
    expect(val).toEqual({ code: 401, message: "Only admins can upload official or workshop datapacks" });
  });
  it("should return 401 if user is not admin and datapack is workshop", async () => {
    isOfficialDatapack.mockReturnValueOnce(false);
    isWorkshopDatapack.mockReturnValueOnce(true);
    const val = await processAndUploadDatapack("uuid", formData);
    expect(val).toEqual({ code: 401, message: "Only admins can upload official or workshop datapacks" });
  });
  it("should return non-200 code if grabAndVerifyWorkshopUUID returns non-200 code", async () => {
    grabAndVerifyWorkshopUUID.mockResolvedValueOnce({ code: 999, message: "error" });
    const val = await processAndUploadDatapack("uuid", formData);
    expect(val).toEqual({ code: 999, message: "error" });
  });
  it("should return 500 if grabAndVerifyWorkshopUUID throws an error", async () => {
    grabAndVerifyWorkshopUUID.mockRejectedValueOnce(new Error("error"));
    const val = await processAndUploadDatapack("uuid", formData);
    expect(val).toEqual({ code: 500, message: "Failed to upload datapack with error error" });
  });
});
