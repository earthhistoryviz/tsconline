import { vi, describe, beforeEach, it, expect } from "vitest";
import {
  saveChartHistory,
  getChartHistoryMetadata,
  getChartHistory,
  deleteChartHistory,
  isValidEpoch,
  verifySymlink
} from "../src/user/chart-history";
import { join } from "path";
import * as fs from "fs/promises";
import * as utilsModule from "../src/util";
import { Dirent, Stats } from "fs";

vi.mock("fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof fs>();
  return {
    ...actual,
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

vi.mock("../src/util", async (importOriginal) => {
  const actual = await importOriginal<typeof utilsModule>();
  return {
    ...actual,
    assetconfigs: {
      uploadDirectory: "/testdir/uploadDirectory"
    }
  };
});

vi.mock("../src/user/fetch-user-files", async () => {
  return {
    getCachedDatapackFromDirectory: vi.fn().mockResolvedValue({ title: "datapack" })
  };
});

const mockUUID = "1234";
const mockUploadDir = "/testdir/uploadDirectory";
const baseHistoryPath = join(mockUploadDir, "private", mockUUID, "history");
const mockTimestamp = "1234567890123";
const historyEntryPath = join(baseHistoryPath, mockTimestamp);

describe("chartHistory tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.setSystemTime(parseInt(mockTimestamp));
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
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

  describe("verifySymlink", () => {
    it("returns true for valid symlink", async () => {
      vi.spyOn(fs, "lstat").mockResolvedValueOnce({ isSymbolicLink: () => true } as Stats);
      expect(await verifySymlink("/some/symlink")).toBe(true);
    });

    it("returns false for non-symlink", async () => {
      vi.spyOn(fs, "lstat").mockResolvedValueOnce({ isSymbolicLink: () => false } as Stats);
      expect(await verifySymlink("/some/file")).toBe(false);
    });

    it("returns false if realpath fails", async () => {
      vi.spyOn(fs, "lstat").mockResolvedValueOnce({ isSymbolicLink: () => true } as Stats);
      vi.spyOn(fs, "realpath").mockRejectedValueOnce(new Error("not found"));
      expect(await verifySymlink("/bad/symlink")).toBe(false);
    });
  });

  describe("saveChartHistory", () => {
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
    it("returns empty if folder doesn't exist", async () => {
      vi.spyOn(fs, "access").mockRejectedValueOnce(Object.assign(new Error(), { code: "ENOENT" }));
      expect(await getChartHistoryMetadata(mockUUID)).toEqual([]);
    });

    it("shouldn't return entry if symlink is invalid", async () => {
      vi.spyOn(fs, "readdir").mockResolvedValueOnce([mockTimestamp] as unknown as Dirent[]);
      vi.spyOn(fs, "lstat").mockResolvedValueOnce({ isSymbolicLink: () => true } as Stats);
      vi.spyOn(fs, "realpath").mockRejectedValueOnce(new Error("not found"));

      expect(await getChartHistoryMetadata(mockUUID)).toEqual([]);
    });

    it("removes invalid entries and returns valid ones", async () => {
      vi.spyOn(fs, "readdir")
        .mockResolvedValueOnce(["badentry", mockTimestamp] as unknown as Dirent[])
        .mockResolvedValueOnce(["datapack1", "badsymlink2"] as unknown as Dirent[]);

      const result = await getChartHistoryMetadata(mockUUID);
      expect(result).toEqual([{ timestamp: mockTimestamp }]);
      expect(fs.rm).toHaveBeenCalledWith(join(baseHistoryPath, "badentry"), { recursive: true });
    });
  });

  describe("getChartHistory", () => {
    it("throws if timestamp is invalid", async () => {
      await expect(getChartHistory(mockUUID, "abc")).rejects.toThrow("Invalid timestamp");
    });

    it("throws if chart is not found", async () => {
      vi.spyOn(fs, "readdir").mockResolvedValueOnce([]);
      await expect(getChartHistory(mockUUID, mockTimestamp)).rejects.toThrow("Chart not found");
    });

    it("throws if symlink is invalid", async () => {
      vi.spyOn(fs, "readdir")
        .mockResolvedValueOnce(["chart-hash.svg"] as unknown as Dirent[])
        .mockResolvedValueOnce(["dp"] as unknown as Dirent[]);
      vi.spyOn(fs, "lstat").mockResolvedValueOnce({ isSymbolicLink: () => true } as Stats);
      vi.spyOn(fs, "realpath").mockRejectedValueOnce(new Error("not found"));

      await expect(getChartHistory(mockUUID, mockTimestamp)).rejects.toThrow("Invalid datapack symlink");
    });

    it("returns full chart history entry", async () => {
      const settings = "settings-content";
      const chartSvg = "<svg>...</svg>";

      vi.spyOn(fs, "readFile").mockResolvedValueOnce(settings).mockResolvedValueOnce(chartSvg);
      vi.spyOn(fs, "readdir")
        .mockResolvedValueOnce(["chart-hash.svg"] as unknown as Dirent[])
        .mockResolvedValueOnce(["dp"] as unknown as Dirent[]);

      const result = await getChartHistory(mockUUID, mockTimestamp);
      expect(result).toEqual({
        settings,
        datapacks: [{ title: "datapack" }],
        chartContent: chartSvg,
        chartHash: "chart-hash"
      });
    });
  });

  describe("deleteChartHistory", () => {
    it("throws on invalid timestamp", async () => {
      await expect(deleteChartHistory(mockUUID, "abc")).rejects.toThrow("Invalid timestamp");
    });

    it("deletes all entries", async () => {
      await deleteChartHistory(mockUUID, "-1");
      expect(fs.rm).toHaveBeenCalledWith(join(baseHistoryPath, "1"), { recursive: true });
      expect(fs.rm).toHaveBeenCalledWith(join(baseHistoryPath, "2"), { recursive: true });
    });

    it("deletes specific entry", async () => {
      await deleteChartHistory(mockUUID, mockTimestamp);
      expect(fs.rm).toHaveBeenCalledWith(join(baseHistoryPath, mockTimestamp), { recursive: true });
    });
  });
});
