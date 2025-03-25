import path from "path";
import { afterAll, beforeEach, vi, describe, beforeAll, it, expect } from "vitest";
import * as util from "../src/util";
import * as fetchUserFiles from "../src/user/fetch-user-files";
import * as child_process from "child_process";
import * as fsPromises from "fs/promises";
import * as extractMarkers from "../src/crossplot/extract-markers";
import * as shared from "@tsconline/shared";
import md5 from "md5";
import {
  convertCrossPlotWithModelsInJar,
  setupAutoPlotDirectory,
  setupConversionDirectory,
  autoPlotPointsWithJar
} from "../src/crossplot/crossplot-handler";
import { assertAssetConfig } from "../src/types";
import { ConvertCrossPlotRequest } from "@tsconline/shared";

async function checkFileExists(filePath: string): Promise<boolean> {
  try {
    await fsPromises.access(filePath);
    return true;
  } catch (error) {
    return false;
  }
}
vi.mock("@tsconline/shared", async () => {
  return {
    getUUIDOfDatapackType: vi.fn().mockReturnValue("test-uuid")
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
vi.mock("md5", async () => {
  return {
    default: vi.fn().mockReturnValue("test-hash")
  };
});
vi.mock("../src/util", async (importOriginal) => {
  const actual = await importOriginal<typeof util>();
  return {
    getActiveJar: vi.fn(() => "test.jar"),
    verifyFilepath: vi.fn(actual.verifyFilepath),
    assetconfigs: {
      modelConversionCacheDirectory: "test-cache-dir",
      autoPlotCacheDirectory: "test-cache-dir"
    }
  };
});
vi.mock("fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof fsPromises>();
  return {
    ...actual,
    readFile: vi.fn(actual.readFile),
    mkdir: vi.fn(actual.mkdir),
    writeFile: vi.fn(() => {}),
    rm: vi.fn(actual.rm)
  };
});
vi.mock("../src/user/fetch-user-files", async () => {
  return {
    getDecryptedDatapackFilePath: vi.fn().mockResolvedValue("datapack/filepath")
  };
});

vi.mock("child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof child_process>();
  return {
    spawn: vi.fn(actual.spawn)
  };
});
const returnFilepaths = async (testCaseDir: string) => {
  const modelTextFilepath = path.join(testCaseDir, "models.txt");
  const settingsTextFilepath = path.join(testCaseDir, "settings.xml");
  const outputTextFilepath = path.join(testCaseDir, "output.txt");
  const datapackFilepath = path.join(testCaseDir, "datapack.txt");
  return { modelTextFilepath, settingsTextFilepath, outputTextFilepath, datapackFilepath };
};
const isCI = process.env.CI === "true" || !!process.env.GITHUB_ACTIONS;
const conversionTestKeys = path.join("server", "__tests__", "__data__", "conversion-test-keys");
describe("convertCrossPlotWithModelsInJar", async () => {
  const getActiveJar = vi.spyOn(util, "getActiveJar");
  const spawn = vi.spyOn(child_process, "spawn");
  const getDecryptedDatapackFilePath = vi.spyOn(fetchUserFiles, "getDecryptedDatapackFilePath");
  const verifyFilepath = vi.spyOn(util, "verifyFilepath");
  const generatedOutputFileDirectory = path.join(conversionTestKeys, "generated-file");
  beforeEach(() => {
    vi.clearAllMocks();
  });
  beforeAll(async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    if (await checkFileExists(generatedOutputFileDirectory)) {
      await fsPromises.rm(generatedOutputFileDirectory, { recursive: true, force: true });
    }
    await fsPromises.mkdir(generatedOutputFileDirectory, { recursive: true });
    const assetconfigs = JSON.parse(await fsPromises.readFile(path.join("server", "assets", "config.json"), "utf-8"));
    assertAssetConfig(assetconfigs);
    getActiveJar.mockImplementation(() => {
      return isCI
        ? "/home/runner/work/tsconline/tsconline/server/assets/jars/testUsageJar.jar"
        : path.join("server", assetconfigs.activeJar);
    });
  });
  it("should return 500 if spawn fails", async () => {
    spawn.mockImplementationOnce(() => {
      throw new Error("Failed to spawn");
    });
    await expect(
      convertCrossPlotWithModelsInJar(
        [
          {
            title: "datapackTitle",
            type: "official"
          }
        ],
        "output",
        "models",
        "settings"
      )
    ).rejects.toThrow("Failed to spawn");
    expect(spawn).toHaveBeenCalledOnce();
  });
  it("should return 500 if bad datapack file", { timeout: 20000 }, async () => {
    const testCase = "test-case-2";
    const testCaseFilepath = path.join(conversionTestKeys, testCase);
    const { modelTextFilepath, settingsTextFilepath, datapackFilepath } = await returnFilepaths(testCaseFilepath);
    getDecryptedDatapackFilePath.mockResolvedValueOnce(datapackFilepath);
    const outputFileLocation = path.join(generatedOutputFileDirectory, `${testCase}-output.txt`);
    await convertCrossPlotWithModelsInJar(
      [
        {
          title: "datapackTitle",
          type: "official"
        }
      ],
      outputFileLocation,
      modelTextFilepath,
      settingsTextFilepath
    );
    expect(getDecryptedDatapackFilePath).toHaveBeenCalledOnce();
    expect(verifyFilepath).toHaveBeenCalledOnce();
    expect(verifyFilepath).toHaveReturnedWith(false);
  });
  it("should return 200 and file if successful", { timeout: 20000 }, async () => {
    const testCase = "test-case-1";
    const testCaseFilepath = path.join(conversionTestKeys, testCase);
    const { datapackFilepath, modelTextFilepath, settingsTextFilepath, outputTextFilepath } =
      await returnFilepaths(testCaseFilepath);
    getDecryptedDatapackFilePath.mockResolvedValueOnce(datapackFilepath);
    const correctOutput = await fsPromises.readFile(outputTextFilepath);
    const outputFileLocation = path.join(generatedOutputFileDirectory, `${testCase}-output.txt`);
    await convertCrossPlotWithModelsInJar(
      [
        {
          title: "datapackTitle",
          type: "official"
        }
      ],
      outputFileLocation,
      modelTextFilepath,
      settingsTextFilepath
    );
    const generatedOutput = await fsPromises.readFile(outputFileLocation);
    expect(getDecryptedDatapackFilePath).toHaveBeenCalledOnce();
    expect(spawn).toHaveBeenCalledOnce();
    expect(correctOutput).toEqual(generatedOutput);
    expect(verifyFilepath).toHaveBeenCalledOnce();
    await fsPromises.rm(outputFileLocation, { force: true }).catch(() => {
      // eslint-disable-next-line no-console
    });
  });
});

describe("setupConversionDirectory", async () => {
  const request: ConvertCrossPlotRequest = {
    datapackUniqueIdentifiers: [
      {
        type: "official",
        title: "datapackTitle"
      }
    ],
    models: "models",
    settings: "settings"
  };
  const verifyFilepath = vi.spyOn(util, "verifyFilepath");
  const readFile = vi.spyOn(fsPromises, "readFile");
  const mkdir = vi.spyOn(fsPromises, "mkdir");
  const writeFile = vi.spyOn(fsPromises, "writeFile");
  beforeEach(() => {
    vi.clearAllMocks();
  });
  beforeAll(() => {
    mkdir.mockImplementation(async () => "string");
  });
  afterAll(() => {
    mkdir.mockReset();
  });
  it("should return file if conversion already exists", async () => {
    readFile.mockResolvedValueOnce("file");
    verifyFilepath.mockResolvedValueOnce(true);
    const output = await setupConversionDirectory(request);
    expect(readFile).toHaveBeenCalledOnce();
    expect(verifyFilepath).toHaveBeenCalledOnce();
    expect(md5).toHaveBeenCalledOnce();
    expect(output).toEqual("file");
  });
  it("should return 500 if error creating directory", async () => {
    mkdir.mockRejectedValueOnce(new Error("Failed to create directory"));
    const output = await setupConversionDirectory(request);
    expect(output).toEqual({ message: "Error creating directory for this conversion", code: 500 });
    expect(verifyFilepath).not.toHaveBeenCalled();
  });
  it("should return 500 if writeFile fails", async () => {
    writeFile.mockRejectedValueOnce(new Error("Failed to write file"));
    const output = await setupConversionDirectory(request);
    expect(output).toEqual({ message: "Error writing files for conversion", code: 500 });
    expect(verifyFilepath).toHaveBeenCalledOnce();
  });
  it("should return filepaths if successful", async () => {
    const output = await setupConversionDirectory(request);
    expect(output).toEqual({
      outputTextFilepath: "test-cache-dir/test-hash/output.txt",
      modelsTextFilepath: "test-cache-dir/test-hash/models.txt",
      settingsTextFilepath: "test-cache-dir/test-hash/settings.xml"
    });
    expect(verifyFilepath).toHaveBeenCalledOnce();
    expect(writeFile).toHaveBeenCalledTimes(2);
  });
});

describe("setupAutoPlotDirectory", async () => {
  const mkdir = vi.spyOn(fsPromises, "mkdir");
  const verifyFilepath = vi.spyOn(util, "verifyFilepath");
  const writeFile = vi.spyOn(fsPromises, "writeFile");
  const getMarkersFromTextFile = vi.spyOn(extractMarkers, "getMarkersFromTextFile");
  const rm = vi.spyOn(fsPromises, "rm");
  beforeEach(() => {
    vi.clearAllMocks();
  });
  beforeAll(() => {
    mkdir.mockImplementation(async () => "string");
    rm.mockImplementation(async () => {});
  });
  afterAll(() => {
    mkdir.mockReset();
    rm.mockReset();
  });
  it("should return 500 if error creating directory", async () => {
    mkdir.mockRejectedValueOnce(new Error("Failed to create directory"));
    const output = await setupAutoPlotDirectory({
      datapackUniqueIdentifiers: [
        {
          type: "official",
          title: "datapackTitle"
        }
      ],
      settings: "settings"
    });
    expect(output).toEqual({ message: "Error creating directory for this conversion", code: 500 });
    expect(verifyFilepath).not.toHaveBeenCalled();
  });
  it("should return 500 if file exists in cache but can't read the file", async () => {
    verifyFilepath.mockResolvedValueOnce(true);
    getMarkersFromTextFile.mockRejectedValueOnce(new Error("Failed to read file"));
    const output = await setupAutoPlotDirectory({
      datapackUniqueIdentifiers: [
        {
          type: "official",
          title: "datapackTitle"
        }
      ],
      settings: "settings"
    });
    expect(output).toEqual({ message: "Error reading file for this conversion", code: 500 });
    expect(rm).toHaveBeenCalledOnce();
    expect(mkdir).toHaveBeenCalledOnce();
  });
  it("should return markers if file exists in cache and successfully reads the file", async () => {
    const autoPlotMarker = {
      x: 1,
      y: 2
    } as shared.AutoPlotMarker;
    verifyFilepath.mockResolvedValueOnce(true);
    getMarkersFromTextFile.mockResolvedValueOnce([autoPlotMarker]);
    const output = await setupAutoPlotDirectory({
      datapackUniqueIdentifiers: [
        {
          type: "official",
          title: "datapackTitle"
        }
      ],
      settings: "settings"
    });
    expect(output).toEqual([autoPlotMarker]);
    expect(rm).not.toHaveBeenCalled();
    expect(getMarkersFromTextFile).toHaveBeenCalledOnce();
    expect(verifyFilepath).toHaveBeenCalledOnce();
  });
  it("should return 500 if error writing files", async () => {
    verifyFilepath.mockResolvedValueOnce(false);
    writeFile.mockRejectedValueOnce(new Error("Failed to write file"));
    const output = await setupAutoPlotDirectory({
      datapackUniqueIdentifiers: [
        {
          type: "official",
          title: "datapackTitle"
        }
      ],
      settings: "settings"
    });
    expect(output).toEqual({ message: "Error writing files for conversion", code: 500 });
    expect(verifyFilepath).toHaveBeenCalledOnce();
  });
  it("should return filepaths if successful", async () => {
    const output = await setupAutoPlotDirectory({
      datapackUniqueIdentifiers: [
        {
          type: "official",
          title: "datapackTitle"
        }
      ],
      settings: "settings"
    });
    expect(output).toEqual({
      outputTextFilepath: "test-cache-dir/test-hash/output.txt",
      settingsTextFilepath: "test-cache-dir/test-hash/settings.xml"
    });
    expect(mkdir).toHaveBeenCalledOnce();
    expect(verifyFilepath).toHaveBeenCalledOnce();
    expect(getMarkersFromTextFile).not.toHaveBeenCalled();
    expect(verifyFilepath).toHaveBeenCalledOnce();
    expect(writeFile).toHaveBeenCalledTimes(1);
  });
});

describe("autoPlotPointsWithJar", async () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  const conversionTestKeys = path.join("server", "__tests__", "__data__", "auto-plot-test-keys");
  const generatedOutputFileDirectory = path.join(conversionTestKeys, "generated-file");
  beforeAll( async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    if (await checkFileExists(generatedOutputFileDirectory)) {
      await fsPromises.rm(generatedOutputFileDirectory, { recursive: true, force: true });
    }
    await fsPromises.mkdir(generatedOutputFileDirectory, { recursive: true });
    const assetconfigs = JSON.parse(await fsPromises.readFile(path.join("server", "assets", "config.json"), "utf-8"));
    assertAssetConfig(assetconfigs);
    getActiveJar.mockImplementation(() => {
      return isCI
        ? "/home/runner/work/tsconline/tsconline/server/assets/jars/testUsageJar.jar"
        : path.join("server", assetconfigs.activeJar);
    });
  })
  const getDecryptedDatapackFilePath = vi.spyOn(fetchUserFiles, "getDecryptedDatapackFilePath");
  const getUUIDOfDatapackType = vi.spyOn(shared, "getUUIDOfDatapackType");
  const getActiveJar = vi.spyOn(util, "getActiveJar");
  const spawn = vi.spyOn(child_process, "spawn");
  const verifyFilepath = vi.spyOn(util, "verifyFilepath");
  it("should throw an error if spawn fails", async () => {
    spawn.mockImplementationOnce(() => {
      throw new Error("Failed to spawn");
    });
    await expect(
      autoPlotPointsWithJar(
        [
          {
            title: "datapackTitle",
            type: "official"
          }
        ],
        "output",
        "settings"
      )
    ).rejects.toThrow("Failed to spawn");
    expect(spawn).toHaveBeenCalledOnce();
    expect(getDecryptedDatapackFilePath).toHaveBeenCalledOnce();
    expect(getUUIDOfDatapackType).toHaveBeenCalledOnce();
  });
  it("should return ");
});
