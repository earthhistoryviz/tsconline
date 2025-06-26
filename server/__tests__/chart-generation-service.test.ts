import { describe, it, expect, vi, beforeAll } from "vitest";
import {
  parseJavaOutputLine,
  resolveDatapacks,
  checkForCacheHit,
  runJavaChartGeneration
} from "../src/chart-generation-service";
import * as childProcess from "child_process";
import * as db from "../src/database";
import * as userFiles from "../src/user/fetch-user-files";
import * as containsKnownError from "../src/chart-error-handler";
import * as util from "../src/util";
import { ChartRequest } from "@tsconline/shared";
import { User } from "../src/types";
import { Readable } from "stream";

vi.mock("../src/index", () => ({
  queue: [],
  maxConcurrencySize: 1
}));
vi.mock("../src/database", () => ({
  isUserInWorkshopAndWorkshopIsActive: vi.fn().mockResolvedValue(true),
  findUser: vi.fn()
}));
vi.mock("../src/util", () => ({
  deleteDirectory: vi.fn(),
  checkFileExists: vi.fn(),
  assetconfigs: {
    activeJar: "test.jar"
  }
}));
vi.mock("child_process", () => ({
  spawn: vi.fn()
}));

beforeAll(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("parseJavaOutputLine tests", () => {
  const filenameMap = { "foo.sqlite": "Foo Pack" };

  it("parses initial loading datapack line", () => {
    const result = parseJavaOutputLine("Convert Datapack to sqlite database", filenameMap);
    expect(result).toEqual({ stage: "Loading Datapacks", percent: 10 });
  });

  it("parses individual datapack and outputs percentage", () => {
    const result = parseJavaOutputLine("Loading datapack [1/2]: foo.sqlite", filenameMap);
    expect(result).toEqual({ stage: "Loading Datapack: Foo Pack (1/2)", percent: 25 });
  });

  it("parses image generation line", () => {
    const result = parseJavaOutputLine("Generating Image", filenameMap);
    expect(result).toEqual({ stage: "Generating Chart", percent: 50 });
  });

  it("parses image generation success line", () => {
    const result = parseJavaOutputLine("ImageGenerator did not have any errors on generation", filenameMap);
    expect(result).toEqual({ stage: "Waiting for File", percent: 90 });
  });

  it("returns null for unrelated line", () => {
    expect(parseJavaOutputLine("no match", filenameMap)).toBeNull();
  });
});

describe("resolveDatapacks", () => {
  const chartRequest: ChartRequest = {
    settings: "<xml></xml>",
    datapacks: [
      { title: "Pack 1", storedFileName: "test1.dpk", type: "user", isPublic: false, uuid: "uuid" },
      { title: "Pack 2", storedFileName: "test2.dpk", type: "official", isPublic: true },
      { title: "Pack 3", storedFileName: "test3.dpk", type: "temp", isPublic: false },
      { title: "Pack 4", storedFileName: "test4.dpk", type: "workshop", isPublic: false, uuid: "workshop-1" }
    ],
    useCache: true,
    isCrossPlot: false
  };
  vi.spyOn(userFiles, "fetchUserDatapackDirectory").mockImplementation(async (uuid, title) => `/fake/${uuid}/${title}`);
  vi.spyOn(db, "findUser").mockResolvedValueOnce([{ userId: 5 } as User]);

  it("resolves datapacks to paths and maps titles", async () => {
    const result = await resolveDatapacks(chartRequest, "uuid");
    expect(result.datapacksToSendToCommandLine).toContain("/fake/uuid/Pack 1/test1.dpk");
    expect(result.datapacksToSendToCommandLine).toContain("/fake/official/Pack 2/test2.dpk");
    expect(result.datapacksToSendToCommandLine).toContain("/fake/temp/Pack 3/test3.dpk");
    expect(result.datapacksToSendToCommandLine).toContain("/fake/workshop-1/Pack 4/test4.dpk");
    expect(result.filenameMap).toEqual({
      "test1.dpk": "Pack 1",
      "test2.dpk": "Pack 2",
      "test3.dpk": "Pack 3",
      "test4.dpk": "Pack 4"
    });
  });
});

describe("checkForCacheHit", () => {
  const chartFilePath = "/path/to/chart.svg";
  const chartUrlPath = "/charts/abc123/chart.svg";
  const hash = "abc123";
  const checkFileExistsSpy = vi.spyOn(util, "checkFileExists");

  it("returns null if file does not exist", async () => {
    checkFileExistsSpy.mockResolvedValueOnce(false);
    const result = await checkForCacheHit(chartFilePath, true, chartUrlPath, hash);
    expect(result).toBeNull();
  });

  it("deletes and returns null if file exists and useCache is false", async () => {
    checkFileExistsSpy.mockResolvedValueOnce(true);
    const deleteSpy = vi.spyOn(util, "deleteDirectory").mockResolvedValueOnce("done");
    const result = await checkForCacheHit(chartFilePath, false, chartUrlPath, hash);
    expect(deleteSpy).toHaveBeenCalledWith(chartFilePath);
    expect(result).toBeNull();
  });

  it("returns cached result if file exists and useCache is true", async () => {
    checkFileExistsSpy.mockResolvedValueOnce(true);
    const result = await checkForCacheHit(chartFilePath, true, chartUrlPath, hash);
    expect(result).toEqual({ chartpath: chartUrlPath, hash });
  });
});

describe("runJavaChartGeneration", () => {
  function createMockReadable() {
    const stream = new Readable({
      read() {} // no-op
    });
    return stream;
  }
  const spawnMock = vi.spyOn(childProcess, "spawn");

  it("reports progress from Java stdout lines", async () => {
    const onProgress = vi.fn();
    const stdout = createMockReadable();
    const stderr = createMockReadable();

    spawnMock.mockImplementationOnce(() => {
      return {
        stdout,
        stderr,
        on: (event: string, cb: any) => {
          if (event === "close") {
            setImmediate(() => cb(0, null));
          }
        }
      } as unknown as ReturnType<typeof childProcess.spawn>;
    });

    const filenameMap = {
      "pack1.dpk": "Pack One"
    };

    const promise = runJavaChartGeneration(
      { settings: "", datapacks: [], isCrossPlot: false, useCache: false },
      [],
      "file.tsc",
      "chart.svg",
      filenameMap,
      onProgress
    );

    const CONVERT_DATAPACK_TO_SQLITE = "Convert Datapack to sqlite database\n";
    const LOADING_DATAPACK_1_OF_2 = "Loading datapack [1/2]: pack1.dpk\n";
    const GENERATING_IMAGE = "Generating Image\n";
    const NO_ERRORS = "ImageGenerator did not have any errors on generation\n";
    stdout.emit("data", Buffer.from(CONVERT_DATAPACK_TO_SQLITE));
    stdout.emit("data", Buffer.from(LOADING_DATAPACK_1_OF_2));
    stdout.emit("data", Buffer.from(GENERATING_IMAGE));
    stdout.emit("data", Buffer.from(NO_ERRORS));
    stdout.emit("end");

    const result = await promise;

    expect(result.knownErrorCode).toBe(0);
    expect(result.errorMessage).toBe("");
    expect(onProgress).toHaveBeenNthCalledWith(1, parseJavaOutputLine(CONVERT_DATAPACK_TO_SQLITE, filenameMap));
    expect(onProgress).toHaveBeenNthCalledWith(2, parseJavaOutputLine(LOADING_DATAPACK_1_OF_2, filenameMap));
    expect(onProgress).toHaveBeenNthCalledWith(3, parseJavaOutputLine(GENERATING_IMAGE, filenameMap));
    expect(onProgress).toHaveBeenNthCalledWith(4, parseJavaOutputLine(NO_ERRORS, filenameMap));
  });

  it("detects and reports known error from Java output", async () => {
    const onProgress = vi.fn();
    const stdout = new Readable({ read() {} });
    const stderr = new Readable({ read() {} });

    spawnMock.mockImplementationOnce(
      () =>
        ({
          stdout,
          stderr,
          on: (event: string, cb: any) => {
            if (event === "close") setImmediate(() => cb(0, null));
          }
        }) as unknown as ReturnType<typeof childProcess.spawn>
    );

    vi.spyOn(containsKnownError, "containsKnownError").mockImplementation((line: string) => {
      return line.includes("Fatal error") ? 1234 : 0;
    });

    const filenameMap = {};
    const promise = runJavaChartGeneration(
      { settings: "", datapacks: [], isCrossPlot: false, useCache: false },
      [],
      "file.tsc",
      "chart.svg",
      filenameMap,
      onProgress
    );

    stdout.emit("data", Buffer.from("Generating Image\n"));
    stdout.emit("data", Buffer.from("Fatal error: something broke\n")); // This will be matched
    stdout.emit("end");

    const result = await promise;

    expect(onProgress).toHaveBeenCalledWith(parseJavaOutputLine("Generating Image\n", filenameMap));
    expect(result.knownErrorCode).toBe(1234);
    expect(result.errorMessage).toBe("Fatal error: something broke");
  });
});
