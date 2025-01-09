import { beforeEach, describe, expect, vi, it } from "vitest";
import * as editHandler from "../src/cloud/edit-handler";
import * as userHandler from "../src/user/user-handler";
import * as fs from "fs/promises";
import * as types from "../src/types";
import { editDatapackMetadataRequestHandler } from "../src/cloud/general-cloud-requests";
import { Multipart } from "@fastify/multipart";

vi.mock("../src/user/user-handler", () => {
  return {
    processEditDatapackRequest: vi.fn(async () => {}),
    convertNonStringFieldsToCorrectTypesInDatapackMetadataRequest: vi.fn(() => ({}))
  };
});

vi.mock("../src/cloud/edit-handler", () => {
  return {
    editDatapack: vi.fn(async () => [])
  };
});
vi.mock("fs/promises", () => {
  return {
    rm: vi.fn(async () => {})
  };
});
vi.mock("../src/types", async (importOriginal) => {
  const actual = await importOriginal<typeof types>();
  return {
    isOperationResult: vi.fn(actual.isOperationResult)
  };
});

describe("editDatapackMetadataRequestHandler tests", async () => {
  const processEditDatapackRequest = vi.spyOn(userHandler, "processEditDatapackRequest");
  const convertNonStringFieldsToCorrectTypesInDatapackMetadataRequest = vi.spyOn(
    userHandler,
    "convertNonStringFieldsToCorrectTypesInDatapackMetadataRequest"
  );
  const editDatapack = vi.spyOn(editHandler, "editDatapack");
  const rm = vi.spyOn(fs, "rm");
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should return 500 if processEditDatapackRequest throws", async () => {
    processEditDatapackRequest.mockImplementationOnce(async () => {
      throw new Error();
    });
    const result = await editDatapackMetadataRequestHandler({} as AsyncIterableIterator<Multipart>, "", "");
    expect(result).toEqual({ code: 500, message: "Failed to process request" });
    expect(processEditDatapackRequest).toHaveBeenCalledOnce();
  });
  it("should return response if processEditDatapackRequest returns response", async () => {
    processEditDatapackRequest.mockResolvedValueOnce({ code: 500, message: "Error" });
    const result = await editDatapackMetadataRequestHandler({} as AsyncIterableIterator<Multipart>, "", "");
    expect(result).toEqual({ code: 500, message: "Error" });
    expect(processEditDatapackRequest).toHaveBeenCalledOnce();
  });
  it("should return 500 if convertNonStringFieldsToCorrectTypesInDatapackMetadataRequest throws", async () => {
    processEditDatapackRequest.mockResolvedValueOnce({ fields: {}, tempFiles: [], code: 0 });
    convertNonStringFieldsToCorrectTypesInDatapackMetadataRequest.mockImplementationOnce(() => {
      throw new Error();
    });
    const result = await editDatapackMetadataRequestHandler({} as AsyncIterableIterator<Multipart>, "", "");
    expect(result).toEqual({ code: 500, message: "Failed to edit metadata" });
    expect(convertNonStringFieldsToCorrectTypesInDatapackMetadataRequest).toHaveBeenCalledOnce();
    expect(editDatapack).not.toHaveBeenCalled();
    expect(processEditDatapackRequest).toHaveBeenCalledOnce();
  });
  it("should return 422 if editDatapack returns errors", async () => {
    processEditDatapackRequest.mockResolvedValueOnce({ fields: {}, tempFiles: [], code: 0 });
    convertNonStringFieldsToCorrectTypesInDatapackMetadataRequest.mockReturnValueOnce({});
    editDatapack.mockResolvedValueOnce(["Error"]);
    const result = await editDatapackMetadataRequestHandler({} as AsyncIterableIterator<Multipart>, "", "");
    expect(editDatapack).toHaveBeenCalledOnce();
    expect(result).toEqual({ code: 422, message: "There were errors updating the datapack" });
  });
  it("should return 200 if editDatapack returns no errors", async () => {
    processEditDatapackRequest.mockResolvedValueOnce({ fields: {}, tempFiles: [], code: 0 });
    convertNonStringFieldsToCorrectTypesInDatapackMetadataRequest.mockReturnValueOnce({});
    editDatapack.mockResolvedValueOnce([]);
    const result = await editDatapackMetadataRequestHandler({} as AsyncIterableIterator<Multipart>, "", "");
    expect(editDatapack).toHaveBeenCalledOnce();
    expect(result).toEqual({ code: 200, message: "Successfully edited metadata for " });
  });
  it("should rm temp files", async () => {
    processEditDatapackRequest.mockResolvedValueOnce({ fields: {}, tempFiles: ["file1", "file2"], code: 0 });
    convertNonStringFieldsToCorrectTypesInDatapackMetadataRequest.mockReturnValueOnce({});
    editDatapack.mockResolvedValueOnce([]);
    await editDatapackMetadataRequestHandler({} as AsyncIterableIterator<Multipart>, "", "");
    expect(rm).toHaveBeenCalledTimes(2);
  });
  it("should continue to return 200 if rm fails", async () => {
    processEditDatapackRequest.mockResolvedValueOnce({ fields: {}, tempFiles: ["file1", "file2"], code: 0 });
    convertNonStringFieldsToCorrectTypesInDatapackMetadataRequest.mockReturnValueOnce({});
    editDatapack.mockResolvedValueOnce([]);
    rm.mockRejectedValueOnce(new Error());
    const result = await editDatapackMetadataRequestHandler({} as AsyncIterableIterator<Multipart>, "", "");
    expect(result).toEqual({ code: 200, message: "Successfully edited metadata for " });
    expect(rm).toHaveBeenCalledTimes(2);
  });
});
