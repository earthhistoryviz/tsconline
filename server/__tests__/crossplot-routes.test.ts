import fastify, { FastifyInstance } from "fastify";
import { convertCrossPlot } from "../src/routes/crossplot-routes";
import { expect, beforeAll, vi, afterAll, describe, it, beforeEach } from "vitest";
import * as shared from "@tsconline/shared";
import * as crossplotHandler from "../src/crossplot/crossplot-handler";
import * as fsPromises from "fs/promises";
import * as util from "../src/util";

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
    assertConvertCrossPlotRequest: vi.fn().mockReturnValue(true)
  };
});
vi.mock("../src/crossplot/crossplot-handler", async () => {
  return {
    setupConversionDirectory: vi.fn(() => ({
      outputTextFilepath: "output.txt",
      modelsTextFilepath: "models.txt",
      settingsTextFilepath: "settings.xml"
    })),
    convertCrossPlotWithModelsInJar: vi.fn().mockResolvedValueOnce(true)
  };
});
const request = {
  datapackTitle: "test",
  uuid: "test"
};
let app: FastifyInstance;
beforeAll(async () => {
  app = fastify();
  app.post("/crossplot/convert", convertCrossPlot);
  await app.listen({ host: "localhost", port: 1210 });
  vi.spyOn(console, "error").mockImplementation(() => {});
  //   vi.spyOn(console, "log").mockImplementation(() => {});
});

afterAll(async () => {
  await app.close();
});
describe("convertCrossplot", async () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  const url = "/crossplot/convert";
  const convertCrossPlotRequest = vi.spyOn(shared, "assertConvertCrossPlotRequest");
  const setupConversionDirectory = vi.spyOn(crossplotHandler, "setupConversionDirectory");
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
  it("should return 200 if conversion in jar succeeds", async () => {
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
});
