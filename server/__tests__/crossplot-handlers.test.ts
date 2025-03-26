import { beforeEach, vi, describe, it, expect } from "vitest";
import * as util from "../src/util";
import * as fsPromises from "fs/promises";
import * as extractMarkers from "../src/crossplot/extract-markers";
import * as shared from "@tsconline/shared";
import md5 from "md5";
import { setupAutoPlotDirectory, setupConversionDirectory } from "../src/crossplot/crossplot-handler";
import { ConvertCrossPlotRequest } from "@tsconline/shared";

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
vi.mock("../src/util", async () => {
  return {
    getActiveJar: vi.fn(() => "test.jar"),
    verifyFilepath: vi.fn(),
    assetconfigs: {
      modelConversionCacheDirectory: "test-cache-dir",
      autoPlotCacheDirectory: "test-cache-dir"
    }
  };
});
vi.mock("fs/promises", async () => {
  return {
    readFile: vi.fn(),
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    rm: vi.fn()
  };
});

vi.spyOn(console, "error").mockImplementation(() => undefined);
vi.spyOn(console, "log").mockImplementation(() => undefined);

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
