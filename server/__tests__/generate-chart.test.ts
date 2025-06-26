import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import * as chartGenerationHelpers from "../src/chart-generation/generate-chart-helpers";
import { generateChart } from "../src/chart-generation/generate-chart";
import * as metadata from "../src/file-metadata-handler";
import * as chartHistory from "../src/user/chart-history";

vi.mock("../src/file-metadata-handler", () => ({
  updateFileMetadata: vi.fn().mockResolvedValue({}),
}));
vi.mock("../src/database", () => ({
  findUser: vi.fn().mockResolvedValue([{ userId: 1 }]),
  getActiveWorkshopsUserIsIn: vi.fn().mockResolvedValue([]),
}));
vi.mock("../src/user/chart-history", () => ({
  saveChartHistory: vi.fn().mockResolvedValue({}),
}));
vi.mock("../src/util", async () => ({
  assetconfigs: {
    chartsDirectory: "charts",
    fileMetadata: "/meta.json"
  }
}));
const mockQueue = vi.hoisted(() => ({
  size: 0,
  add: vi.fn(async (fn: () => any) => await fn())
}));
vi.mock("../src/index", () => ({
  queue: mockQueue,
  maxQueueSize: 10
}))
vi.mock("md5", () => ({
  default: () => "6b97f03fc4c88d703d251030dd15b9ce"
}));

beforeAll(() => {
  // vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("generateChart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueue.size = 0;
  });
  const chartRequest = {
    settings: "<settings></settings>",
    datapacks: [],
    useCache: true,
    isCrossPlot: false
  };
  const writeChartSettingsSpy = vi.spyOn(chartGenerationHelpers, "writeChartSettings");
  const updateFileMetadataSpy = vi.spyOn(metadata, "updateFileMetadata");

  it("should return cached result if cache hit is found", async () => {
    vi.spyOn(chartGenerationHelpers, "resolveDatapacks").mockResolvedValueOnce({
      datapacksToSendToCommandLine: [],
      usedUserDatapackFilepaths: [],
      usedTempDatapacks: [],
      filenameMap: {}
    });
    vi.spyOn(chartGenerationHelpers, "checkForCacheHit").mockResolvedValueOnce({
      chartpath: "/charts/hash/chart.svg",
      hash: "hash"
    });

    const result = await generateChart(chartRequest, () => {}, "uuid");
    expect(result).toEqual({ chartpath: "/charts/hash/chart.svg", hash: "hash" });
    expect(writeChartSettingsSpy).not.toHaveBeenCalled();
    expect(updateFileMetadataSpy).not.toHaveBeenCalled();
  });

  it("should throws error if queue is full", async () => {
    vi.spyOn(chartGenerationHelpers, "resolveDatapacks").mockResolvedValueOnce({
      datapacksToSendToCommandLine: [],
      usedUserDatapackFilepaths: [],
      usedTempDatapacks: [],
      filenameMap: {}
    });
    vi.spyOn(chartGenerationHelpers, "checkForCacheHit").mockResolvedValueOnce(null);
    mockQueue.size = 11;
    await expect(generateChart(chartRequest, () => {}, "uuid")).rejects.toThrow("Queue is too busy");
    expect(writeChartSettingsSpy).not.toHaveBeenCalled();
    expect(updateFileMetadataSpy).not.toHaveBeenCalled();
    expect(mockQueue.add).not.toHaveBeenCalled();
  });

  it("should throws error if java command fails", async () => {
    vi.spyOn(chartGenerationHelpers, "resolveDatapacks").mockResolvedValueOnce({
      datapacksToSendToCommandLine: [],
      usedUserDatapackFilepaths: [],
      usedTempDatapacks: [],
      filenameMap: {}
    });
    vi.spyOn(metadata, "updateFileMetadata").mockResolvedValueOnce();
    vi.spyOn(chartGenerationHelpers, "checkForCacheHit").mockResolvedValueOnce(null);
    vi.spyOn(chartGenerationHelpers, "runJavaChartGeneration").mockRejectedValue(new Error("failure"));

    await expect(generateChart(chartRequest, () => {}, "uuid")).rejects.toThrow("Failed to execute Java command");
    expect(writeChartSettingsSpy).toHaveBeenCalledOnce();
    expect(updateFileMetadataSpy).toHaveBeenCalledOnce();
    expect(mockQueue.add).toHaveBeenCalledOnce();
  });

  it("should return chart result if no error and saves history", async () => {
    vi.spyOn(chartGenerationHelpers, "resolveDatapacks").mockResolvedValueOnce({
      datapacksToSendToCommandLine: ["/some/path"],
      usedUserDatapackFilepaths: ["/some/path"],
      usedTempDatapacks: [],
      filenameMap: {}
    });
    vi.spyOn(metadata, "updateFileMetadata").mockResolvedValueOnce();
    vi.spyOn(chartGenerationHelpers, "checkForCacheHit").mockResolvedValueOnce(null);
    vi.spyOn(chartGenerationHelpers, "runJavaChartGeneration").mockResolvedValueOnce({
      knownErrorCode: 0,
      errorMessage: ""
    });
    const saveSpy = vi.spyOn(chartHistory, "saveChartHistory").mockResolvedValueOnce();

    const result = await generateChart(chartRequest, () => {}, "uuid");
    expect(result).toEqual({
      chartpath: "/charts/6b97f03fc4c88d703d251030dd15b9ce/chart.svg",
      hash: "6b97f03fc4c88d703d251030dd15b9ce"
    });
    expect(saveSpy).toHaveBeenCalled();
    expect(writeChartSettingsSpy).toHaveBeenCalled();
    expect(updateFileMetadataSpy).toHaveBeenCalled();
    expect(mockQueue.add).toHaveBeenCalled();
  });

  it("should throws if java generation reports known error", async () => {
    vi.spyOn(chartGenerationHelpers, "resolveDatapacks").mockResolvedValueOnce({
      datapacksToSendToCommandLine: [],
      usedUserDatapackFilepaths: [],
      usedTempDatapacks: [],
      filenameMap: {}
    });
    vi.spyOn(metadata, "updateFileMetadata").mockResolvedValueOnce();
    vi.spyOn(chartGenerationHelpers, "checkForCacheHit").mockResolvedValueOnce(null);
    writeChartSettingsSpy.mockResolvedValueOnce();
    vi.spyOn(chartGenerationHelpers, "runJavaChartGeneration").mockResolvedValueOnce({
      knownErrorCode: 500,
      errorMessage: "bad data"
    });

    await expect(generateChart(chartRequest, () => {}, "uuid")).rejects.toThrow("bad data");
  });
});
