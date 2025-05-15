import { vi, describe, beforeEach, it, expect, afterEach } from "vitest";
import {
  saveChartHistory,
  getChartHistoryMetadata,
  getChartHistory,
  deleteChartHistory,
  isValidEpoch
} from "../src/user/chart-history";
import { join } from "path";
import * as fs from "fs/promises";
import * as utilsModule from "../src/util";
import * as chartHistoryHelperFunctions from "../src/user/chart-history-helper-functions";
import * as fetchUserFiles from "../src/user/fetch-user-files";
import { Dirent } from "fs";

vi.mock("../src/util", async () => {
  return {
    verifySymlink: vi.fn().mockResolvedValue(true)
  };
});

vi.mock("@tsconline/shared", async () => {
  return {
    extractDatapackMetadataFromDatapack: vi.fn().mockReturnValue({ title: "datapack" })
  };
});

vi.mock("../src/user/chart-history-helper-functions", async () => {
  return {
    getUserHistoryRootFilePath: vi.fn().mockResolvedValue("/testdir/uploadDirectory"),
    getSpecificUserHistoryRootFilePath: vi.fn().mockResolvedValue("/testdir/uploadDirectory"),
    getHistoryEntryDatapacksPath: vi.fn().mockResolvedValue("/testdir/uploadDirectory"),
    getChartContentFromChartHistoryTimeStamp: vi.fn().mockResolvedValue({ chartContent: "chart", chartHash: "hash" }),
    getSettingsFromChartHistoryTimeStamp: vi.fn().mockResolvedValue("settings")
  };
});

vi.mock("fs/promises", async () => {
  return {
    lstat: vi.fn().mockResolvedValue({ isSymbolicLink: () => true }),
    realpath: vi.fn().mockResolvedValue("/resolved"),
    mkdir: vi.fn().mockResolvedValue({}),
    readdir: vi.fn().mockResolvedValue(["1", "2"]),
    rm: vi.fn().mockResolvedValue({}),
    cp: vi.fn().mockResolvedValue({}),
    symlink: vi.fn().mockResolvedValue({}),
    access: vi.fn().mockResolvedValue({}),
    readFile: vi.fn().mockResolvedValue("file-content")
  };
});

vi.mock("../src/user/fetch-user-files", async () => {
  return {
    getCachedDatapackFromDirectory: vi.fn().mockResolvedValue({ title: "datapack" })
  };
});

vi.mock("../src/error-logger", async () => {
  return {
    default: {
      error: vi.fn().mockReturnValue({})
    }
  };
});

const mockUUID = "1234";
const mockUploadDir = "/testdir/uploadDirectory";
const baseHistoryPath = join(mockUploadDir, "private", mockUUID, "history");
const mockTimestamp = "1234567890123";
const historyEntryPath = join(baseHistoryPath, mockTimestamp);

describe("chartHistory tests", () => {
  const getUserHistoryRootFilePathSpy = vi.spyOn(chartHistoryHelperFunctions, "getUserHistoryRootFilePath");
  beforeEach(() => {
    vi.clearAllMocks();
    vi.setSystemTime(parseInt(mockTimestamp));
  });

  describe("isValidEpoch", () => {
    it("returns true for valid 13-digit timestamp", () => {
      expect(isValidEpoch(mockTimestamp)).toBe(true);
    });
    it("returns false for invalid timestamp", () => {
      expect(isValidEpoch("abc")).toBe(false);
      expect(isValidEpoch("123456")).toBe(false);
    });
  });

  describe("saveChartHistory", () => {
    beforeEach(() => {
      getUserHistoryRootFilePathSpy.mockResolvedValueOnce(baseHistoryPath);
    });
    afterEach(() => {
      expect(getUserHistoryRootFilePathSpy).toHaveBeenCalledWith(mockUUID);
    });
    it("removes oldest entry if more than 10 exist", async () => {
      vi.spyOn(fs, "readdir").mockResolvedValueOnce([
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10"
      ] as unknown as Dirent[]);

      await saveChartHistory(mockUUID, "settings.tsc", ["/path/to/dp"], "chart.svg", "hash");
      expect(fs.rm).toHaveBeenCalledWith(join(baseHistoryPath, "1"), { recursive: true });
    });

    it("creates history entry", async () => {
      await saveChartHistory(mockUUID, "settings.tsc", ["/path/to/dp"], "chart.svg", "hash");

      expect(fs.mkdir).toHaveBeenCalledWith(baseHistoryPath, { recursive: true });
      expect(fs.cp).toHaveBeenCalledWith("settings.tsc", join(historyEntryPath, "settings.tsc"));
      expect(fs.cp).toHaveBeenCalledWith("chart.svg", join(historyEntryPath, "hash.svg"));
      expect(fs.symlink).toHaveBeenCalled();
      expect(fs.realpath).toHaveBeenCalledWith("/path/to/dp");
    });

    it("cleans up if something fails", async () => {
      vi.spyOn(fs, "readdir").mockRejectedValueOnce(new Error("fail"));
      await saveChartHistory(mockUUID, "settings.tsc", [], "chart.svg", "hash");
      expect(fs.rm).toHaveBeenCalledWith(join(baseHistoryPath, Date.now().toString()), {
        recursive: true,
        force: true
      });
    });
  });

  describe("getChartHistoryMetadata", () => {
    beforeEach(() => {
      getUserHistoryRootFilePathSpy.mockResolvedValueOnce(baseHistoryPath);
      vi.clearAllMocks();
    });
    const verifySymlinkSpy = vi.spyOn(utilsModule, "verifySymlink");
    const readdir = vi.spyOn(fs, "readdir");
    const rm = vi.spyOn(fs, "rm");

    it("shouldn't return entry if symlink is invalid", async () => {
      readdir.mockResolvedValueOnce([mockTimestamp] as unknown as Dirent[]);
      verifySymlinkSpy.mockResolvedValueOnce(false);

      expect(await getChartHistoryMetadata(mockUUID)).toEqual([]);
      expect(rm).toHaveBeenCalledWith(join(baseHistoryPath, mockTimestamp), { recursive: true });
    });

    it("removes invalid entries and returns valid ones", async () => {
      readdir
        .mockResolvedValueOnce(["badentry", mockTimestamp] as unknown as Dirent[])
        .mockResolvedValueOnce(["datapack1", "datapack2"] as unknown as Dirent[]);

      const result = await getChartHistoryMetadata(mockUUID);
      expect(verifySymlinkSpy).toHaveBeenCalledWith(join("/testdir/uploadDirectory", "datapack1"));
      expect(verifySymlinkSpy).toHaveBeenCalledWith(join("/testdir/uploadDirectory", "datapack2"));
      expect(rm).toHaveBeenNthCalledWith(1, join(baseHistoryPath, "badentry"), { recursive: true });
      expect(readdir).toHaveBeenCalledTimes(2);
      expect(result).toEqual([
        {
          chartContent: "chart",
          datapacks: [
            {
              title: "datapack"
            },
            {
              title: "datapack"
            }
          ],
          timestamp: mockTimestamp
        }
      ]);
    });
  });

  describe("getChartHistory", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });
    const getCachedDatapackFromDirectory = vi.spyOn(fetchUserFiles, "getCachedDatapackFromDirectory");
    const getSettingsFromChartHistoryTimeStamp = vi.spyOn(
      chartHistoryHelperFunctions,
      "getSettingsFromChartHistoryTimeStamp"
    );
    const verifySymlink = vi.spyOn(utilsModule, "verifySymlink");
    const readdir = vi.spyOn(fs, "readdir");
    const realpath = vi.spyOn(fs, "realpath");
    const getChartContentFromChartHistoryTimeStamp = vi.spyOn(
      chartHistoryHelperFunctions,
      "getChartContentFromChartHistoryTimeStamp"
    );
    it("throws if timestamp is invalid", async () => {
      await expect(getChartHistory(mockUUID, "abc")).rejects.toThrow("Invalid timestamp");
    });

    it("throws if chart is not found", async () => {
      getSettingsFromChartHistoryTimeStamp.mockImplementationOnce(() => {
        throw new Error("Chart not found");
      });
      await expect(getChartHistory(mockUUID, mockTimestamp)).rejects.toThrow("Chart not found");
    });

    it("throws if symlink is invalid", async () => {
      readdir.mockResolvedValueOnce(["dp"] as unknown as Dirent[]);
      verifySymlink.mockResolvedValueOnce(false);
      await expect(getChartHistory(mockUUID, mockTimestamp)).rejects.toThrow("Invalid datapack symlink");
      expect(readdir).toHaveBeenCalledOnce();
      expect(verifySymlink).toHaveBeenCalledWith(join("/testdir/uploadDirectory", "dp"));
      expect(realpath).not.toHaveBeenCalled();
    });

    it("returns full chart history entry", async () => {
      const settings = "settings-content";
      const chartSvg = "<svg>...</svg>";
      const chartHash = "hash";
      getChartContentFromChartHistoryTimeStamp.mockResolvedValueOnce({
        chartContent: chartSvg,
        chartHash
      });

      getSettingsFromChartHistoryTimeStamp.mockResolvedValueOnce(settings);
      readdir.mockResolvedValueOnce(["dp"] as unknown as Dirent[]);
      const result = await getChartHistory(mockUUID, mockTimestamp);
      expect(realpath).toHaveBeenCalledOnce();
      expect(result).toEqual({
        settings,
        datapacks: [{ title: "datapack" }],
        chartContent: chartSvg,
        chartHash
      });
      expect(getSettingsFromChartHistoryTimeStamp).toHaveBeenCalledWith(mockUUID, mockTimestamp);
      expect(getCachedDatapackFromDirectory).toHaveBeenCalledTimes(1);
      expect(verifySymlink).toHaveBeenCalledWith(join("/testdir/uploadDirectory", "dp"));
    });
  });

  describe("deleteChartHistory", () => {
    it("throws on invalid timestamp", async () => {
      await expect(deleteChartHistory(mockUUID, "abc")).rejects.toThrow("Invalid timestamp");
    });

    it("deletes all entries", async () => {
      await deleteChartHistory(mockUUID, "-1");
      expect(fs.rm).toHaveBeenCalledWith(join("/testdir/uploadDirectory", "1"), { recursive: true });
      expect(fs.rm).toHaveBeenCalledWith(join("/testdir/uploadDirectory", "2"), { recursive: true });
    });

    it("deletes specific entry", async () => {
      await deleteChartHistory(mockUUID, mockTimestamp);
      expect(fs.rm).toHaveBeenCalledWith(join("/testdir/uploadDirectory", mockTimestamp), {
        recursive: true
      });
    });
  });
});
