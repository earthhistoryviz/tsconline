import { vi, describe, beforeEach, it, expect, test } from "vitest";
import * as utilModule from "../src/util";
import * as sharedModule from "@tsconline/shared";
vi.mock("../src/util", async (importOriginal) => {
  const actual = await importOriginal<typeof utilModule>();
  return {
    ...actual,
    grabFilepaths: vi.fn().mockImplementation((_files, decrypt_filepath) => {
      return Promise.resolve([`server/__tests__/__data__/${decrypt_filepath}`]);
    })
  };
});
vi.mock("@tsconline/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof sharedModule>();
  return {
    ...actual,
    assertSubSequenceInfo: vi.fn().mockReturnValue(true),
    assertDatapackParsingPack: vi.fn().mockReturnValue(true),
    assertColumnSpecificSettings: vi.fn().mockReturnValue(true),
    calculateAutoScale: vi.fn().mockImplementation((min: number, max: number) => {
      return { lowerRange: min, upperRange: max, scaleStep: 0.18 };
    }),
    allFontOptions: ["Column Header", "Popup Body"],
    defaultFontsInfo: { font: "Arial" }
  };
});
import {
  ParsedColumnEntry,
  getAllEntries,
  parseDatapacks,
  processEvent,
  processFacies,
  processBlock,
  spliceArrayAtFirstSpecialMatch,
  processRange,
  processChron,
  processPoint,
  processSequence,
  getColumnTypes,
  configureOptionalPointSettings
} from "../src/parse-datapacks";
import { readFileSync } from "fs";
import { ColumnInfo, DatapackWarning, Point } from "@tsconline/shared";
import { DatapackMetadata } from "../src/types";
const key = JSON.parse(readFileSync("server/__tests__/__data__/column-keys.json").toString());
vi.spyOn(console, "log").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});
describe("general parse-datapacks tests", () => {
  /**
   * Parses the general Africa Bight map pack
   */
  const datapack: DatapackMetadata = {
    description: "description",
    title: "Title",
    file: "file.dpk",
    size: "size"
  };
  it("should parse africa general datapack", async () => {
    const datapacks = await parseDatapacks(
      { title: "Africa Bight", description: "Africa Bight Map", file: "AfricaBight.map", size: "200.98 KB" },
      "parse-datapacks-test-1.txt"
    );
    expect(datapacks).toEqual(key["general-parse-datapacks-test-1-key"]);
  });

  /**
   * Parses a custom simple pack of all column types
   * Checks both datapack ages and columnInfo values
   */
  it("should parse general datapack with all column types", async () => {
    const datapacks = await parseDatapacks(datapack, "parse-datapacks-test-2.txt");
    expect(datapacks).toEqual(key["general-parse-datapacks-test-2-key"]);
  });

  /**
   * Given a bad file, return empty array and default datapackAgeInfo
   */
  it("should not parse bad file return empty array", async () => {
    const datapacks = await parseDatapacks(datapack, "bad-data.txt");
    expect(datapacks).toEqual(key["bad-data-key"]);
  });
});

describe("splice column entry tests", () => {
  it("should splice line and store 3 children. On should be false, info should be 'popup', enableTitle should be false", () => {
    const array = ["child1", "child2", "child3", "_METACOLUMN_OFF", "_TITLE_OFF", "", "popup"];
    expect(spliceArrayAtFirstSpecialMatch(array)).toEqual({
      children: ["child1", "child2", "child3"],
      on: false,
      info: "popup",
      enableTitle: false
    });
  });
  it("should splice line and store 3 children. Other fields should be set to default value.", () => {
    const array = ["child1", "child2", "child3"];
    expect(spliceArrayAtFirstSpecialMatch(array)).toEqual({
      children: ["child1", "child2", "child3"],
      on: true,
      info: "",
      enableTitle: true
    });
  });
  it("should splice line and store 3 children. On should be true, info should be empty, enableTitle should be true", () => {
    const array = ["child1", "child2", "child3", "_METACOLUMN_ON", "_TITLE_ON"];
    expect(spliceArrayAtFirstSpecialMatch(array)).toEqual({
      children: ["child1", "child2", "child3"],
      on: true,
      info: "",
      enableTitle: true
    });
  });
});

describe("process facies line tests", () => {
  let warnings: DatapackWarning[];
  beforeEach(() => {
    warnings = [];
  });
  test.each([
    ["\ttop\t\t100", { rockType: "top", age: 100, info: "" }],
    ["\trockType\tlabel\t100\tinfo", { rockType: "rockType", label: "label", age: 100, info: "info" }],
    ["invalid\trockType\tlabel\t100\tinfo", null],
    [" \trockType\tlabel\t100\tinfo", { rockType: "rockType", label: "label", age: 100, info: "info" }],
    ["\tsome bad line\t", null],
    ["\tsome bad line\t\t\t\t", null],
    ["\trockType\tlabel\tbadNumber\tinfo", null],
    ["", null]
  ])("should process '%s'", (line, expected) => {
    if (expected === null) {
      expect(processFacies(line, 0, warnings)).toBeNull();
      expect(warnings).toEqual([
        {
          lineNumber: 0,
          warning: expect.stringContaining("Facies column formatted incorrectly"),
          message: "This line will be skipped in processing"
        }
      ]);
    } else {
      expect(processFacies(line, 0, warnings)).toEqual(expected);
      expect(warnings).toEqual([]);
    }
  });
  it("should skip primary", () => {
    const line = "\tprimary\tlabel\t100\tinfo";
    expect(processFacies(line, 0, warnings)).toBeNull();
  });
});

describe("process blocks line tests", () => {
  let warnings: DatapackWarning[];
  beforeEach(() => {
    warnings = [];
  });
  const defaultColor = { r: 255, g: 255, b: 255 };
  test.each([
    [" \tTOP\t100\t\t", { label: "TOP", age: 100, popup: "", lineStyle: "solid", rgb: defaultColor }],
    [
      " \tlabel\t100\tdotted\tpopup\t23/45/67",
      { label: "label", age: 100, popup: "popup", lineStyle: "dotted", rgb: { r: 23, g: 45, b: 67 } }
    ],
    [
      " \tlabel\t100\t10/10/10\tpopup\t23/45/67",
      { label: "label", age: 100, popup: "popup", lineStyle: "solid", rgb: { r: 23, g: 45, b: 67 } }
    ],
    [
      " \tlabel\t100\tbadlinestyle\tpopup\t23/45/67",
      { label: "label", age: 100, popup: "popup", lineStyle: "solid", rgb: { r: 23, g: 45, b: 67 } }
    ],
    [
      "\tlabel\t100\tdotted\tpopup\t0",
      { label: "label", age: 100, popup: "popup", lineStyle: "dotted", rgb: defaultColor }
    ],
    [" \tlabel\t100\t\t\t\t", { label: "label", age: 100, popup: "", lineStyle: "solid", rgb: defaultColor }],
    ["invalid\tlabel\t100\tdotted\tpopup\t23/45/67", null],
    [" \tlabel\tbadNumber\tdotted\tpopup\t23/45/67", null],
    [" \t\t\t\t\t\t\t", null],
    ["", null]
  ])("should process '%s'", (line, expected) => {
    if (expected === null) {
      expect(processBlock(line, defaultColor, 0, warnings)).toBeNull();
      expect(warnings).toEqual([
        {
          lineNumber: 0,
          warning: expect.stringContaining("Block column formatted incorrectly"),
          message: "This line will be skipped in processing"
        }
      ]);
    } else {
      expect(processBlock(line, defaultColor, 0, warnings)).toEqual(expected);
      expect(warnings).toEqual([]);
    }
  });
  it("should reset to default on bad color", () => {
    expect(processBlock(" \tlabel\t100\tdotted\tpopup\tbadcolor", defaultColor, 0, warnings)).toEqual({
      label: "label",
      age: 100,
      popup: "popup",
      lineStyle: "dotted",
      rgb: defaultColor
    });
    expect(warnings).toEqual([{ lineNumber: 0, warning: expect.stringContaining("Invalid rgb") }]);
  });
});

describe("process event line tests", () => {
  let warnings: DatapackWarning[];
  beforeEach(() => {
    warnings = [];
  });
  test.each([
    ["\tlabel\t120", { label: "label", age: 120, lineStyle: "solid", popup: "", subEventType: "FAD" }],
    ["\tlabel\t120\t\tpopup", { label: "label", age: 120, lineStyle: "solid", popup: "popup", subEventType: "FAD" }],
    [
      "\tlabel\t140\tdashed\tpopup",
      { label: "label", age: 140, lineStyle: "dashed", popup: "popup", subEventType: "FAD" }
    ],
    [
      "\tlabel\t160\tdotted\tpopup",
      { label: "label", age: 160, lineStyle: "dotted", popup: "popup", subEventType: "FAD" }
    ],
    [
      "\tlabel\t180\tbadLineStyle\tpopup",
      { label: "label", age: 180, lineStyle: "solid", popup: "popup", subEventType: "FAD" }
    ],
    [
      "\tlabel\t200\tsolid\tpopup\t\t\t\t\t",
      { label: "label", age: 200, lineStyle: "solid", popup: "popup", subEventType: "FAD" }
    ],
    [" \tlabel\t120\t\tpopup", { label: "label", age: 120, lineStyle: "solid", popup: "popup", subEventType: "FAD" }],
    ["invalid\tlabel\t120", null],
    ["\tlabel", null],
    ["\tlabel\t\t\t\t", null],
    ["\tlabel\tbadNumber", null],
    ["", null]
  ])("should process '%s'", (line, expected) => {
    if (expected === null) {
      expect(processEvent(line, "FAD", 0, warnings)).toBeNull();
      expect(warnings).toEqual([
        {
          lineNumber: 0,
          warning: expect.stringContaining("Event column formatted incorrectly"),
          message: "This line will be skipped in processing"
        }
      ]);
    } else {
      expect(processEvent(line, "FAD", 0, warnings)).toEqual(expected);
      expect(warnings).toEqual([]);
    }
  });
});

describe("process range line tests", () => {
  let warnings: DatapackWarning[];
  beforeEach(() => {
    warnings = [];
  });
  test.each([
    ["\tlabel\t100\tTOP\tpopup", { label: "label", age: 100, abundance: "TOP", popup: "popup" }],
    ["\tlabel\t100", { label: "label", age: 100, abundance: "TOP", popup: "" }],
    [" \tlabel\t100", { label: "label", age: 100, abundance: "TOP", popup: "" }],
    ["\tlabel", null],
    ["\tlabel\t\t\t\t", null],
    ["", null],
    ["invalid\tlabel\t100\tTOP\tpopup", null],
    ["\tlabel\tbadNumber", null],
    ["\tlabel\t100\tbadAbundance\tpopup", { label: "label", age: 100, abundance: "TOP", popup: "popup" }],
    ["\tlabel\t100\t\t\t\t\t", { label: "label", age: 100, abundance: "TOP", popup: "" }],
    // Below are range lines with various abundances
    ["\tlabel\t100\tflood\tpopup", { label: "label", age: 100, abundance: "flood", popup: "popup" }],
    ["\tlabel\t100\tmissing\tpopup", { label: "label", age: 100, abundance: "missing", popup: "popup" }],
    ["\tlabel\t100\trare\tpopup", { label: "label", age: 100, abundance: "rare", popup: "popup" }],
    ["\tlabel\t100\tcommon\tpopup", { label: "label", age: 100, abundance: "common", popup: "popup" }]
  ])("should process '%s'", (line, expected) => {
    if (expected === null) {
      expect(processRange(line, 0, warnings)).toBeNull();
      expect(warnings).toEqual([
        {
          lineNumber: 0,
          warning: expect.stringContaining("Range column formatted incorrectly"),
          message: "This line will be skipped in processing"
        }
      ]);
    } else {
      expect(processRange(line, 0, warnings)).toEqual(expected);
      expect(warnings).toEqual([]);
    }
  });
});

describe("process chron line tests", () => {
  let warnings: DatapackWarning[];
  beforeEach(() => {
    warnings = [];
  });
  test.each([
    ["\tTOP\t\t0", { polarity: "TOP", age: 0, popup: "" }],
    ["\tR\tlabel\t100\tpopup", { polarity: "R", label: "label", age: 100, popup: "popup" }],
    ["\tR\tlabel\t100", { polarity: "R", label: "label", age: 100, popup: "" }],
    ["\tR\tlabel\t200\tpopup\t\t\t\t", { polarity: "R", label: "label", age: 200, popup: "popup" }],
    [" \tR\tlabel\t100\tpopup", { polarity: "R", label: "label", age: 100, popup: "popup" }],
    ["\tR\tlabel", null],
    ["invalid\tR\tlabel\t200\tpopup", null],
    ["\tR\tlabel\tage\tpopup\t", null],
    ["\tR\tlabel\tbadNumber\tpopup", null],
    ["", null]
  ])("should process '%s'", (line, expected) => {
    if (expected === null) {
      expect(processChron(line, 0, warnings)).toBeNull();
      expect(warnings).toEqual([
        {
          lineNumber: 0,
          warning: expect.stringContaining("Chron column formatted incorrectly"),
          message: "This line will be skipped in processing"
        }
      ]);
    } else {
      expect(processChron(line, 0, warnings)).toEqual(expected);
      expect(warnings).toEqual([]);
    }
  });
  it("should skip primary", () => {
    const line = "\tprimary\tlabel\t100\tpopup";
    expect(processChron(line, 0, warnings)).toBeNull();
  });
});

describe("process point line tests", () => {
  let warnings: DatapackWarning[];
  beforeEach(() => {
    warnings = [];
  });
  test.each([
    ["\t10\t10\tpopup", { age: 10, xVal: 10, popup: "popup" }],
    ["\t10\t10\t", { age: 10, xVal: 10, popup: "" }],
    ["\t10\t10", { age: 10, xVal: 10, popup: "" }],
    ["\t10\tbadNumber\tpopup", { age: 10, xVal: 0, popup: "popup" }],
    ["\t10\tbadNumer", { age: 10, xVal: 0, popup: "" }],
    [" \t10\t10\tpopup", { age: 10, xVal: 10, popup: "popup" }],
    ["\tbadNumber", null],
    ["invalid\t10\tpopup", null],
    ["", null]
  ])("should process '%s'", (line, expected) => {
    if (expected === null) {
      expect(processPoint(line, 0, warnings)).toBeNull();
      expect(warnings).toEqual([
        {
          lineNumber: 0,
          warning: expect.stringContaining("Point column formatted incorrectly"),
          message: "This line will be skipped in processing"
        }
      ]);
    } else {
      expect(processPoint(line, 0, warnings)).toEqual(expected);
      expect(warnings).toEqual([]);
    }
  });
  test.each(["nopoints\t10\t10\tpopup", "nopoints", "rect", "cross", "circle\t10\t10\tpopup"])(
    "should process '%s'",
    (line) => {
      expect(processPoint(line, 0, warnings)).toBeNull();
      expect(warnings).toEqual([]);
    }
  );
});

describe("process sequence line tests", () => {
  let warnings: DatapackWarning[];
  beforeEach(() => {
    warnings = [];
  });
  test.each([
    [
      "\tlabel\tN\t60\tseverity\tpopup",
      { label: "label", direction: "N", age: 60, severity: "Severity", popup: "popup" }
    ],
    ["\tlabel\tN\t60\tseverity", { label: "label", direction: "N", age: 60, severity: "Severity", popup: "" }],
    ["invalid\tlabel\tN\t60\tseverity\tpopup", null],
    [
      " \tlabel\tN\t60\tseverity\tpopup",
      { label: "label", direction: "N", age: 60, severity: "Severity", popup: "popup" }
    ],
    ["\tlabel\tN\t60", null],
    ["\tlabel\tN\tage\tseverity\tpopup\t", null],
    ["\tlabel\tN\tbadNumber\tseverity\tpopup", null],
    ["", null]
  ])("should process '%s'", (line, expected) => {
    if (expected === null) {
      expect(processSequence(line, 0, warnings)).toBeNull();
      expect(warnings).toEqual([
        {
          lineNumber: 0,
          warning: expect.stringContaining("Sequence column formatted incorrectly"),
          message: "This line will be skipped in processing"
        }
      ]);
    } else {
      expect(processSequence(line, 0, warnings)).toEqual(expected);
      expect(warnings).toEqual([]);
    }
  });
});

describe("getAllEntries tests", () => {
  let entriesMap: Map<string, ParsedColumnEntry>, isChild: Set<string>;
  beforeEach(() => {
    entriesMap = new Map<string, ParsedColumnEntry>();
    isChild = new Set<string>();
  });

  /**
   * Most basic test with only parents and children
   */
  it("should create correct basic entries map", async () => {
    const file = "server/__tests__/__data__/get-all-entries-test-1.txt";
    await getAllEntries(file, entriesMap, isChild);
    const expectedEntriesMap = new Map<string, ParsedColumnEntry>();
    expectedEntriesMap.set("Parent 1", {
      children: ["Child 11", "Child 12"],
      on: true,
      info: "",
      enableTitle: true
    });
    expectedEntriesMap.set("Parent 2", {
      children: ["Child 21", "Child 22"],
      on: true,
      info: "",
      enableTitle: true
    });
    expect(entriesMap).toEqual(expectedEntriesMap);
  });

  /**
   * Just checks for the correct creation of the entries map with _METACOLUMN_OFF and _TITLE_OFF
   */
  it("should create correct entries map with meta and title", async () => {
    const file = "server/__tests__/__data__/get-all-entries-test-2.txt";
    await getAllEntries(file, entriesMap, isChild);
    const expectedEntriesMap = new Map<string, ParsedColumnEntry>();
    expectedEntriesMap.set("Parent 1", {
      children: ["Child 11", "Child 12"],
      on: false,
      info: "",
      enableTitle: false
    });
    expectedEntriesMap.set("Parent 2", {
      children: ["Child 21", "Child 22"],
      on: true,
      info: "",
      enableTitle: true
    });
    expect(entriesMap).toEqual(expectedEntriesMap);
  });

  /**
   * This test checks for the correct creation of the entries map with _METACOLUMN_OFF, _TITLE_OFF, and info
   * alone and all togther
   */
  it("should create correct entries map with meta and title and info", async () => {
    const file = "server/__tests__/__data__/get-all-entries-test-3.txt";
    await getAllEntries(file, entriesMap, isChild);
    const expectedEntriesMap = new Map<string, ParsedColumnEntry>();
    expectedEntriesMap.set("Parent 1", {
      children: ["Child 11", "Child 12"],
      on: false,
      info: "info",
      enableTitle: false
    });
    expectedEntriesMap.set("Parent 2", {
      children: ["Child 21", "Child 22"],
      on: false,
      info: "info2",
      enableTitle: true
    });
    expectedEntriesMap.set("Parent 3", {
      children: ["Child 31", "Child 32"],
      on: true,
      info: "info3",
      enableTitle: true
    });
    expect(entriesMap).toEqual(expectedEntriesMap);
  });

  /**
   * Bad file should not initialize maps
   */
  it("should not initialize maps on bad file", async () => {
    const file = "server/__tests__/__data__/bad-data.txt";
    await getAllEntries(file, entriesMap, isChild);
    expect(entriesMap.size).toBe(0);
  });
});

describe("getColumnTypes tests", () => {
  let loneColumns: Map<string, ColumnInfo>, expectedLoneColumns: Map<string, ColumnInfo>, warnings: DatapackWarning[];
  beforeEach(() => {
    loneColumns = new Map<string, ColumnInfo>();
    expectedLoneColumns = new Map<string, ColumnInfo>();
    warnings = [];
  });
  it("should return correct block columns", async () => {
    const file = "server/__tests__/__data__/parse-datapacks-block.txt";
    await getColumnTypes(file, loneColumns, "Ma", 0, warnings);
    for (const index in key["column-types-block-key"]) {
      expectedLoneColumns.set(index, key["column-types-block-key"][index]);
    }
    expect(loneColumns).toEqual(expectedLoneColumns);
    expect(warnings).toEqual([]);
  });

  it("should return correct facies columns", async () => {
    const file = "server/__tests__/__data__/parse-datapacks-facies.txt";
    await getColumnTypes(file, loneColumns, "Ma", 0, warnings);
    for (const index in key["column-types-facies-key"]) {
      expectedLoneColumns.set(index, key["column-types-facies-key"][index]);
    }
    expect(loneColumns).toEqual(expectedLoneColumns);
    expect(warnings).toEqual([]);
  });

  it("should return correct event columns", async () => {
    const file = "server/__tests__/__data__/parse-datapacks-event.txt";
    await getColumnTypes(file, loneColumns, "Ma", 0, warnings);
    for (const index in key["column-types-event-key"]) {
      expectedLoneColumns.set(index, key["column-types-event-key"][index]);
    }
    expect(loneColumns).toEqual(expectedLoneColumns);
    expect(warnings).toEqual([]);
  });
  it("should return correct range columns", async () => {
    const file = "server/__tests__/__data__/parse-datapacks-range.txt";
    await getColumnTypes(file, loneColumns, "Ma", 0, warnings);
    for (const index in key["column-types-range-key"]) {
      expectedLoneColumns.set(index, key["column-types-range-key"][index]);
    }
    expect(loneColumns).toEqual(expectedLoneColumns);
    expect(warnings).toEqual([]);
  });
  it("should return correct chron columns", async () => {
    const file = "server/__tests__/__data__/parse-datapacks-chron.txt";
    await getColumnTypes(file, loneColumns, "Ma", 0, warnings);
    for (const index in key["column-types-chron-key"]) {
      expectedLoneColumns.set(index, key["column-types-chron-key"][index]);
    }
    expect(loneColumns).toEqual(expectedLoneColumns);
    expect(warnings).toEqual([]);
  });
  it("should return correct point columns", async () => {
    const file = "server/__tests__/__data__/parse-datapacks-point.txt";
    await getColumnTypes(file, loneColumns, "Ma", 0, warnings);
    for (const index in key["column-types-point-key"]) {
      expectedLoneColumns.set(index, key["column-types-point-key"][index]);
    }
    expect(loneColumns).toEqual(expectedLoneColumns);
    expect(warnings).toEqual([]);
  });
  it("should return correct sequence columns", async () => {
    const file = "server/__tests__/__data__/parse-datapacks-sequence.txt";
    await getColumnTypes(file, loneColumns, "Ma", 0, warnings);
    for (const index in key["column-types-sequence-key"]) {
      expectedLoneColumns.set(index, key["column-types-sequence-key"][index]);
    }
    expect(loneColumns).toEqual(expectedLoneColumns);
    expect(warnings).toEqual([]);
  });
  it("should return correct transect columns", async () => {
    const file = "server/__tests__/__data__/parse-datapacks-transect.txt";
    await getColumnTypes(file, loneColumns, "Ma", 0, warnings);
    for (const index in key["column-types-transect-key"]) {
      expectedLoneColumns.set(index, key["column-types-transect-key"][index]);
    }
    expect(loneColumns).toEqual(expectedLoneColumns);
    expect(warnings).toEqual([]);
  });
  it("should return correct freehand columns", async () => {
    const file = "server/__tests__/__data__/parse-datapacks-freehand.txt";
    await getColumnTypes(file, loneColumns, "Ma", 0, warnings);
    for (const index in key["column-types-freehand-key"]) {
      expectedLoneColumns.set(index, key["column-types-freehand-key"][index]);
    }
    expect(loneColumns).toEqual(expectedLoneColumns);
    expect(warnings).toEqual([]);
  });
  it("should instantiate warnings on bad formats", async () => {
    const file = "server/__tests__/__data__/parse-datapacks-japan-test-warnings.txt";
    await getColumnTypes(file, loneColumns, "Ma", 4, warnings);
    expect(warnings).toEqual([
      {
        lineNumber: 8,
        warning: expect.stringContaining("doesn't match any existing column types"),
        message: expect.stringContaining("Try using one of the following column types")
      },
      {
        lineNumber: 34,
        warning: expect.stringContaining("not a valid number"),
        message: "This line will be skipped in processing"
      },
      {
        lineNumber: 48,
        warning: expect.stringContaining("closest match to existing column types found"),
        message: expect.stringContaining("Try using one of the following column types")
      }
    ]);
  });
});
describe("configureOptionalPointSettings tests", () => {
  const point: Point = {
    name: "test",
    minAge: 0,
    maxAge: 0,
    enableTitle: true,
    on: true,
    width: 0,
    popup: "",
    rgb: { r: 0, g: 0, b: 0 },
    subPointInfo: [],
    lowerRange: 0,
    upperRange: 0,
    smoothed: true,
    drawLine: false,
    pointShape: "rect",
    drawFill: true,
    fill: {
      r: 64,
      g: 233,
      b: 191
    },
    minX: Number.MAX_SAFE_INTEGER,
    maxX: Number.MIN_SAFE_INTEGER,
    scaleStep: 0
  };

  test.each([
    [[], (point: Point) => point],
    [
      ["nopoints", "line", "22/22/22", "2", "22", "smoothed"],
      (point: Point) => ({
        ...point,
        pointShape: "nopoints",
        drawLine: true,
        fill: { r: 22, g: 22, b: 22 },
        lowerRange: 2,
        upperRange: 22,
        smoothed: true
      })
    ],
    [
      ["rect", "line", "22/22/22", "2", "22", "smoothed"],
      (point: Point) => ({
        ...point,
        pointShape: "rect",
        drawLine: true,
        fill: { r: 22, g: 22, b: 22 },
        lowerRange: 2,
        upperRange: 22,
        smoothed: true
      })
    ],
    [
      ["circle", "noline", "1/1/1", "1", "1", "smoothed"],
      (point: Point) => ({
        ...point,
        pointShape: "circle",
        drawLine: false,
        fill: { r: 1, g: 1, b: 1 },
        lowerRange: 1,
        upperRange: 1,
        smoothed: true
      })
    ],
    [
      ["cross", "line", "255/255/255", "0", "0", "smoothed"],
      (point: Point) => ({
        ...point,
        pointShape: "cross",
        drawLine: true,
        fill: { r: 255, g: 255, b: 255 },
        lowerRange: 0,
        upperRange: 0,
        smoothed: true
      })
    ],
    [
      ["rect", "noline", "255/255/255", "-100", "200", "unsmoothed"],
      (point: Point) => ({
        ...point,
        pointShape: "rect",
        drawLine: false,
        fill: { r: 255, g: 255, b: 255 },
        lowerRange: -100,
        upperRange: 200,
        smoothed: false
      })
    ],
    [["rect", "", "", "", "", "unsmooth"], (point: Point) => ({ ...point, pointShape: "rect", smoothed: false })],
    [["", "", "", "", "", "", ""], (point: Point) => point]
  ])("should return point with correct settings for line: '%s'", (line, expected) => {
    const testPoint = JSON.parse(JSON.stringify(point));
    configureOptionalPointSettings(line, testPoint);
    expect(testPoint).toEqual(expected(point));
  });
});
