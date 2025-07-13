import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import {
  parseJavaOutputLine,
  resolveDatapacks,
  checkForCacheHit,
  runJavaChartGeneration,
  waitForSVGReady
} from "../src/chart-generation/generate-chart-helpers";
import * as childProcess from "child_process";
import * as db from "../src/database";
import * as userFiles from "../src/user/fetch-user-files";
import * as containsKnownError from "../src/chart-error-handler";
import * as util from "../src/util";
import { ChartRequest } from "@tsconline/shared";
import { User } from "../src/types";
import { EventEmitter, Readable } from "stream";
import * as fs from "fs/promises";
import * as svgson from "svgson";

vi.mock("../src/index", () => ({
  queue: [],
  maxConcurrencySize: 1
}));
vi.mock("../src/database", () => ({
  isUserInWorkshopAndWorkshopIsActive: vi.fn().mockResolvedValue(true),
  findUser: vi.fn().mockResolvedValue([])
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
vi.mock("svgson", () => ({
  parse: vi.fn().mockResolvedValue({})
}));
vi.mock("fs/promises", () => ({
  readFile: vi.fn()
}));

beforeAll(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("parseJavaOutputLine tests", () => {
  const filenameMap = { "foo.dpk": "Foo Pack" };

  it("parses initial loading datapack line", () => {
    const result = parseJavaOutputLine("Convert Datapack to sqlite database", filenameMap);
    expect(result).toEqual({ stage: "Loading Datapacks", percent: 10 });
  });

  it("parses individual datapack and outputs percentage", () => {
    const result = parseJavaOutputLine("Loading datapack [1/2]: foo.dpk", filenameMap);
    expect(result).toEqual({ stage: "Loading Datapack: Foo Pack (1/2)", percent: 25 });
  });

  it("parses loading datapack with no known display name", () => {
    const result = parseJavaOutputLine("Loading datapack [1/2]: foo1.dpk ", filenameMap);
    expect(result).toEqual({ stage: "Loading Datapack: foo1.dpk (1/2)", percent: 25 });
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
      { title: "Pack 1", storedFileName: "test1.dpk", type: "user", isPublic: true, uuid: "uuid" },
      { title: "Pack 2", storedFileName: "test2.dpk", type: "official", isPublic: true },
      { title: "Pack 3", storedFileName: "test3.dpk", type: "temp", isPublic: false },
      { title: "Pack 4", storedFileName: "test4.dpk", type: "workshop", isPublic: false, uuid: "workshop-1" },
      { title: "Pack 5", storedFileName: "test5.dpk", type: "user", isPublic: false, uuid: "uuid2" }
    ],
    useCache: true,
    isCrossPlot: false
  };
  vi.spyOn(userFiles, "fetchUserDatapackDirectory").mockImplementation(async (uuid, title) => `/fake/${uuid}/${title}`);

  it("should throw if user is not in workshop and uses workshop datapack", async () => {
    vi.spyOn(db, "findUser").mockResolvedValueOnce([{ userId: 5 } as User]);
    vi.spyOn(db, "isUserInWorkshopAndWorkshopIsActive").mockResolvedValueOnce(false);
    await expect(resolveDatapacks(chartRequest, "uuid2")).rejects.toThrow("User lacks access to workshop datapack");
  });

  it("should throw if user does not have access to user datapack", async () => {
    vi.spyOn(db, "findUser").mockResolvedValueOnce([{ userId: 5 } as User]);
    await expect(resolveDatapacks(chartRequest, "uuid")).rejects.toThrow("Unauthorized user datapack access");
  });

  it("should throw if trying to access workshop datapack without uuid", async () => {
    await expect(resolveDatapacks(chartRequest, undefined)).rejects.toThrow("User lacks access to workshop datapack");
  });

  it("should resolve datapacks to paths and maps titles", async () => {
    vi.spyOn(db, "findUser").mockResolvedValueOnce([{ userId: 5 } as User]);
    const result = await resolveDatapacks(chartRequest, "uuid2");
    expect(result.datapacksToSendToCommandLine).toContain("/fake/uuid/Pack 1/test1.dpk");
    expect(result.datapacksToSendToCommandLine).toContain("/fake/official/Pack 2/test2.dpk");
    expect(result.datapacksToSendToCommandLine).toContain("/fake/temp/Pack 3/test3.dpk");
    expect(result.datapacksToSendToCommandLine).toContain("/fake/workshop-1/Pack 4/test4.dpk");
    expect(result.filenameMap).toEqual({
      "test1.dpk": "Pack 1",
      "test2.dpk": "Pack 2",
      "test3.dpk": "Pack 3",
      "test4.dpk": "Pack 4",
      "test5.dpk": "Pack 5"
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
  const CONVERT_DATAPACK_TO_SQLITE = "Convert Datapack to sqlite database\n";
  const LOADING_DATAPACK_1_OF_2 = "Loading datapack [1/2]: pack1.dpk\n";
  const GENERATING_IMAGE = "Generating Image\n";
  const NO_ERRORS = "ImageGenerator did not have any errors on generation\n";
  const spawnMock = vi.spyOn(childProcess, "spawn");
  let stdout: Readable;
  let stderr: Readable;

  beforeEach(() => {
    stdout = createMockReadable();
    stderr = createMockReadable();

    spawnMock.mockImplementation(
      () =>
        ({
          stdout,
          stderr,
          on: (event: string, cb: any) => {
            if (event === "close") setImmediate(() => cb(0, null));
          }
        }) as unknown as ReturnType<typeof childProcess.spawn>
    );
  });

  it("reports progress from Java stdout lines", async () => {
    const onProgress = vi.fn();
    const filenameMap = {
      "pack1.dpk": "Pack One"
    };

    const promise = runJavaChartGeneration(
      { settings: "", datapacks: [], isCrossPlot: true, useCache: false },
      [],
      "file.tsc",
      "chart.svg",
      filenameMap,
      onProgress
    );

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

    stdout.emit("data", Buffer.from(GENERATING_IMAGE));
    stdout.emit("data", Buffer.from("Fatal error: something broke\n")); // This will be matched
    stdout.emit("end");

    const result = await promise;

    expect(onProgress).toHaveBeenCalledWith(parseJavaOutputLine(GENERATING_IMAGE, filenameMap));
    expect(result.knownErrorCode).toBe(1234);
    expect(result.errorMessage).toBe("Fatal error: something broke");
  });

  it("handles leftover data in stdout", async () => {
    const onProgress = vi.fn();
    const filenameMap = {};

    const promise = runJavaChartGeneration(
      { settings: "", datapacks: [], isCrossPlot: false, useCache: false },
      [],
      "file.tsc",
      "chart.svg",
      filenameMap,
      onProgress
    );

    stdout.emit("data", Buffer.from("Generating Image")); // no newline to trigger parsing stdout
    stdout.emit("end");

    await promise;
    expect(onProgress).toHaveBeenCalledWith(parseJavaOutputLine(GENERATING_IMAGE, filenameMap));
  });

  it("should return generic error if error detected but not known", async () => {
    const onProgress = vi.fn();
    const filenameMap = {};
    const promise = runJavaChartGeneration(
      { settings: "", datapacks: [], isCrossPlot: false, useCache: false },
      [],
      "file.tsc",
      "chart.svg",
      filenameMap,
      onProgress
    );

    stdout.emit("data", Buffer.from(GENERATING_IMAGE));
    stdout.emit("end");

    const result = await promise;
    expect(result).toEqual({
      knownErrorCode: 1005,
      errorMessage: "Unknown error occurred during chart generation"
    });
  });

  it("should handle error in java process", async () => {
    const onProgress = vi.fn();
    const filenameMap = {};
    const mockProcess = new EventEmitter() as childProcess.ChildProcessWithoutNullStreams;
    mockProcess.stdout = stdout;
    mockProcess.stderr = stderr;
    spawnMock.mockImplementationOnce(() => mockProcess);

    const promise = runJavaChartGeneration(
      { settings: "", datapacks: [], isCrossPlot: false, useCache: false },
      [],
      "file.tsc",
      "chart.svg",
      filenameMap,
      onProgress
    );

    const error = new Error("Java process failed");
    mockProcess.emit("error", error);

    await expect(promise).rejects.toThrow("Failed to spawn Java process: Java process failed");
  });

  it("should reject with timeout error if Java process is killed", async () => {
    const onProgress = vi.fn();
    const filenameMap = {};
    const mockProcess = new EventEmitter() as childProcess.ChildProcessWithoutNullStreams;
    mockProcess.stdout = stdout;
    mockProcess.stderr = stderr;
    spawnMock.mockImplementationOnce(() => mockProcess);

    const promise = runJavaChartGeneration(
      { settings: "", datapacks: [], isCrossPlot: false, useCache: false },
      [],
      "file.tsc",
      "chart.svg",
      filenameMap,
      onProgress
    );

    mockProcess.emit("close", null, "SIGKILL");

    await expect(promise).rejects.toThrow("Java process timed out");
  });
});

describe("waitForSVGReady", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });
  const checkFileExistsSpy = vi.spyOn(util, "checkFileExists");
  const readFileSpy = vi.spyOn(fs, "readFile");

  it("resolves when file is found and valid SVG is parsed", async () => {
    checkFileExistsSpy.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    readFileSpy.mockResolvedValueOnce(Buffer.from("<svg></svg>"));

    const promise = waitForSVGReady("/charts/test.svg", 1000);
    await vi.advanceTimersByTimeAsync(600);

    await expect(promise).resolves.toBeUndefined();
    expect(checkFileExistsSpy).toHaveBeenCalledTimes(2);
    expect(readFileSpy).toHaveBeenCalledOnce();
  });

  it("rejects when timeout is reached", async () => {
    checkFileExistsSpy.mockResolvedValue(false);
    const promise = expect(waitForSVGReady("/charts/never-there.svg", 1000)).rejects.toThrow(
      "SVG file did not finalize in time"
    );

    await vi.advanceTimersByTimeAsync(1500);
    await promise.catch((e) => e.message);
  });

  it("keeps polling if SVG content is invalid", async () => {
    checkFileExistsSpy.mockResolvedValue(true);
    readFileSpy.mockResolvedValue(Buffer.from("not svg"));
    vi.spyOn(svgson, "parse").mockRejectedValue(new Error("Invalid SVG"));

    const promise = expect(waitForSVGReady("/charts/bad.svg", 900)).rejects.toThrow(
      "SVG file did not finalize in time"
    );
    await vi.advanceTimersByTimeAsync(900);

    await promise.catch((e) => e.message);
  });
});
