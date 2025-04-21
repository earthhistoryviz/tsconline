import fastify, { FastifyInstance } from "fastify";
import { expect, beforeAll, vi, afterAll, describe, it, beforeEach } from "vitest";
import * as shared from "@tsconline/shared";
import * as crossplotHandler from "../src/crossplot/crossplot-handler";
import * as fsPromises from "fs/promises";
import * as util from "../src/util";
import * as extractMarkers from "../src/crossplot/extract-markers";
import * as types from "../src/types";
import * as errorLogger from "../src/error-logger";
import { crossPlotRoutes } from "../src/crossplot/crossplot-auth";
import * as uploadDatapack from "../src/upload-datapack";

vi.mock("../src/upload-datapack", async () => {
  return {
    uploadTemporaryDatapack: vi.fn().mockResolvedValue({
      uuid: "test-uuid",
      title: "test-title",
      description: "test-description",
      originalFileName: "test-file-name"
    })
  };
});

vi.mock("../src/error-logger", async () => {
  return {
    default: {
      error: vi.fn().mockResolvedValue(undefined)
    }
  };
});
vi.mock("../src/types", async () => {
  return {
    isOperationResult: vi.fn().mockReturnValue(false)
  };
});
vi.mock("../src/database", async () => {
  return {
    findUser: vi.fn().mockResolvedValue([
      {
        uuid: "test",
        isAdmin: false
      }
    ])
  };
});

vi.mock("fs/promises", async () => {
  return {
    readFile: vi.fn().mockResolvedValue("success")
  };
});
vi.mock("../src/util", async () => {
  return {
    verifyFilepath: vi.fn().mockResolvedValue(true)
  };
});

vi.mock("@tsconline/shared", async () => {
  return {
    assertConvertCrossPlotRequest: vi.fn().mockReturnValue(true),
    isAutoPlotMarkerArray: vi.fn().mockReturnValue(false),
    assertAutoPlotRequest: vi.fn().mockReturnValue(false),
    isOperationResult: vi.fn().mockReturnValue(false)
  };
});
vi.mock("../src/crossplot/crossplot-handler", async () => {
  return {
    setupConversionDirectory: vi.fn(() => ({
      outputTextFilepath: "output.txt",
      modelsTextFilepath: "models.txt",
      settingsTextFilepath: "settings.xml",
      hash: "test-hash"
    })),
    convertCrossPlotWithModelsInJar: vi.fn().mockResolvedValue(true),
    setupAutoPlotDirectory: vi.fn().mockResolvedValue({
      outputTextFilepath: "output.txt",
      settingsTextFilepath: "settings.xml"
    }),
    autoPlotPointsWithJar: vi.fn().mockResolvedValue(true)
  };
});
vi.mock("../src/crossplot/extract-markers", async () => {
  return {
    getMarkersFromTextFile: vi.fn().mockResolvedValueOnce([
      {
        x: 1,
        y: 2,
        type: "test"
      }
    ])
  };
});
let app: FastifyInstance;
beforeAll(async () => {
  app = fastify();
  await app.register(crossPlotRoutes, { prefix: "/crossplot" });
  await app.listen({ host: "localhost", port: 1210 });
  // vi.spyOn(console, "error").mockImplementation(() => {});
  // vi.spyOn(console, "log").mockImplementation(() => {});
});

afterAll(async () => {
  await app.close();
});
describe("convertCrossplot", async () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  const request: shared.ConvertCrossPlotRequest = {
    datapackUniqueIdentifiers: [
      {
        type: "official",
        title: "datapackTitle"
      }
    ],
    models: "models",
    settings: "settings",
    action: "file"
  };
  const url = "/crossplot/convert";
  const convertCrossPlotRequest = vi.spyOn(shared, "assertConvertCrossPlotRequest");
  const setupConversionDirectory = vi.spyOn(crossplotHandler, "setupConversionDirectory");
  const isOperationResult = vi.spyOn(types, "isOperationResult");
  const convertCrossplotWithModelsInJar = vi.spyOn(crossplotHandler, "convertCrossPlotWithModelsInJar");
  const verifyFilepath = vi.spyOn(util, "verifyFilepath");
  const readFile = vi.spyOn(fsPromises, "readFile");
  it("should return 400 if the request body is incorrect", async () => {
    convertCrossPlotRequest.mockImplementationOnce(() => {
      throw new Error("Invalid request body");
    });
    const response = await app.inject({
      method: "POST",
      url,
      payload: { invalid: "request" }
    });
    expect(response.statusCode).toEqual(400);
    expect(response.json()).toEqual({ error: "Incorrect request body for converting to crossplot" });
  });
  it("should return 200 if conversion exists", async () => {
    setupConversionDirectory.mockResolvedValueOnce("success");
    const response = await app.inject({
      method: "POST",
      url
    });
    expect(response.statusCode).toEqual(200);
    expect(response.rawPayload).toEqual(Buffer.from("success"));
  });
  it("should return conversion code if conversion fails", async () => {
    setupConversionDirectory.mockResolvedValueOnce({ code: 500, message: "Conversion failed" });
    isOperationResult.mockReturnValueOnce(true);
    const response = await app.inject({
      method: "POST",
      url
    });
    expect(response.statusCode).toEqual(500);
    expect(response.json()).toEqual({ error: "Conversion failed" });
  });
  it("should return 500 if conversion in jar fails", async () => {
    convertCrossplotWithModelsInJar.mockResolvedValueOnce(false);
    const response = await app.inject({
      method: "POST",
      url,
      payload: request
    });
    expect(response.statusCode).toEqual(500);
    expect(response.json()).toEqual({ error: "Error converting to crossplot" });
    expect(convertCrossplotWithModelsInJar).toHaveBeenCalledOnce();
  });
  it("should return 200 if conversion in jar succeeds and action is file", async () => {
    const response = await app.inject({
      method: "POST",
      url,
      payload: request
    });
    expect(convertCrossplotWithModelsInJar).toHaveBeenCalledOnce();
    expect(verifyFilepath).toHaveBeenCalledOnce();
    expect(readFile).toHaveBeenCalledOnce();
    expect(response.statusCode).toEqual(200);
    expect(response.rawPayload).toEqual(Buffer.from("success"));
  });
  describe("action = chart", () => {
    const conversionChartRequest = {
      ...request,
      action: "chart"
    };
    beforeEach(() => {
      vi.clearAllMocks();
    });
    const uploadTemporaryDatapack = vi.spyOn(uploadDatapack, "uploadTemporaryDatapack");
    it("should return upload fail code if operation result from upload", async () => {
      isOperationResult.mockReturnValueOnce(false).mockReturnValueOnce(true);
      uploadTemporaryDatapack.mockResolvedValueOnce({
        code: 500,
        message: "Upload failed"
      });
      const response = await app.inject({
        method: "POST",
        url,
        payload: conversionChartRequest
      });
      expect(response.statusCode).toEqual(500);
      expect(uploadTemporaryDatapack).toHaveBeenCalledOnce();
      expect(response.json()).toEqual({ error: "Upload failed" });
    });
    it("should return datapack if upload succeds", async () => {
      uploadTemporaryDatapack.mockResolvedValueOnce({
        uuid: "test-uuid",
        title: "test-title",
        description: "test-description",
        originalFileName: "test-file-name"
      } as shared.Datapack);
      const response = await app.inject({
        method: "POST",
        url,
        payload: conversionChartRequest
      });
      expect(response.statusCode).toEqual(200);
      expect(uploadTemporaryDatapack).toHaveBeenCalledOnce();
      expect(response.json()).toEqual({
        uuid: "test-uuid",
        title: "test-title",
        description: "test-description",
        originalFileName: "test-file-name"
      });
    });
    it("should return 500 if upload fails", async () => {
      uploadTemporaryDatapack.mockRejectedValueOnce(new Error("Upload failed"));
      const response = await app.inject({
        method: "POST",
        url,
        payload: conversionChartRequest
      });
      expect(response.statusCode).toEqual(500);
      expect(response.json()).toEqual({ error: "Error uploading temporary datapack" });
    });
  });
});

describe("autoPlotPoints", async () => {
  const request = {
    datapackUniqueIdentifiers: ["test"]
  };
  beforeEach(() => {
    vi.clearAllMocks();
  });
  const assertAutoPlotRequest = vi.spyOn(shared, "assertAutoPlotRequest");
  const autoPlotPointsWithJar = vi.spyOn(crossplotHandler, "autoPlotPointsWithJar");
  const setupAutoPlotDirectory = vi.spyOn(crossplotHandler, "setupAutoPlotDirectory");
  const isAutoPlotMarkerArray = vi.spyOn(shared, "isAutoPlotMarkerArray");
  const isOperationResult = vi.spyOn(types, "isOperationResult");
  const verifyFilepath = vi.spyOn(util, "verifyFilepath");
  const getMarkersFromTextFile = vi.spyOn(extractMarkers, "getMarkersFromTextFile");
  const loggerError = vi.spyOn(errorLogger.default, "error");
  const url = "/crossplot/autoplot";
  it("should return 400 if the request body is incorrect", async () => {
    assertAutoPlotRequest.mockImplementationOnce(() => {
      throw new Error("Invalid request body");
    });
    const response = await app.inject({
      method: "POST",
      url,
      payload: { invalid: "request" }
    });
    expect(response.statusCode).toEqual(400);
    expect(response.json()).toEqual({ error: "Incorrect request body for auto plotting points" });
    expect(assertAutoPlotRequest).toHaveBeenCalledOnce();
  });
  it("should return 500 if setupAutoPlotDirectory fails", async () => {
    setupAutoPlotDirectory.mockImplementationOnce(() => {
      throw new Error("Failed to setup directory");
    });
    const response = await app.inject({
      method: "POST",
      url,
      payload: request
    });
    expect(response.statusCode).toEqual(500);
    expect(response.json()).toEqual({ error: "Error auto plotting" });
    expect(loggerError).toHaveBeenCalledOnce();
    expect(setupAutoPlotDirectory).toHaveBeenCalledOnce();
  });
  it("should return operation result if setupAutoPlotDirectory returns one", async () => {
    setupAutoPlotDirectory.mockResolvedValueOnce({ code: 500, message: "Failed to setup directory" });
    isOperationResult.mockReturnValueOnce(true);
    const response = await app.inject({
      method: "POST",
      url,
      payload: request
    });
    expect(setupAutoPlotDirectory).toHaveBeenCalledOnce();
    expect(response.statusCode).toEqual(500);
    expect(response.json()).toEqual({ error: "Failed to setup directory" });
  });
  it("should return 200 if setupAutoPlotDirectory returns markers", async () => {
    isAutoPlotMarkerArray.mockReturnValueOnce(true);
    const autoPlotMarkerArray = [
      {
        age: 1,
        depth: 2
      }
    ] as shared.AutoPlotMarker[];
    setupAutoPlotDirectory.mockResolvedValueOnce(autoPlotMarkerArray);
    const response = await app.inject({
      method: "POST",
      url,
      payload: request
    });
    expect(autoPlotPointsWithJar).not.toHaveBeenCalled();
    expect(response.statusCode).toEqual(200);
    expect(response.json()).toEqual({ markers: autoPlotMarkerArray });
  });
  it("should return 500 if autoPlotPointsWithJar returns false", async () => {
    autoPlotPointsWithJar.mockResolvedValueOnce(false);
    const response = await app.inject({
      method: "POST",
      url,
      payload: request
    });
    expect(autoPlotPointsWithJar).toHaveBeenCalledOnce();
    expect(response.statusCode).toEqual(500);
    expect(response.json()).toEqual({ error: "Error auto plotting" });
    expect(loggerError).toHaveBeenCalledOnce();
  });
  it("should return 500 if file doesn't exist after calling autoPlotPointsWithJar", async () => {
    autoPlotPointsWithJar.mockResolvedValueOnce(true);
    verifyFilepath.mockResolvedValueOnce(false);
    const response = await app.inject({
      method: "POST",
      url,
      payload: request
    });
    expect(response.statusCode).toEqual(500);
    expect(response.json()).toEqual({ error: "Error auto plotting" });
    expect(loggerError).toHaveBeenCalledOnce();
    expect(setupAutoPlotDirectory).toHaveBeenCalledOnce();
    expect(verifyFilepath).toHaveBeenCalledOnce();
    expect(autoPlotPointsWithJar).toHaveBeenCalledOnce();
  });
  it("should return 200 if autoPlotPointsWithJar and getMarkersFromTextFile succeed", async () => {
    autoPlotPointsWithJar.mockResolvedValueOnce(true);
    verifyFilepath.mockResolvedValueOnce(true);
    const response = await app.inject({
      method: "POST",
      url,
      payload: request
    });
    expect(response.statusCode).toEqual(200);
    expect(response.json()).toEqual({ markers: [{ x: 1, y: 2, type: "test" }] });
    expect(autoPlotPointsWithJar).toHaveBeenCalledOnce();
    expect(verifyFilepath).toHaveBeenCalledOnce();
    expect(getMarkersFromTextFile).toHaveBeenCalledOnce();
  });
});
