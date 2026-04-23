import { describe, test, expect, it, vi } from "vitest";
import * as utils from "../src/util";

import {
  DatapackMetadata,
  SharedUser,
  FontsInfo,
  ColumnInfo,
  defaultEventSettings,
  defaultChronSettings,
  defaultPointSettings,
  defaultZoneSettings,
  defaultSequenceSettings,
  defaultRangeSettings
} from "../src";

import { readFileSync } from "fs";

const tests = JSON.parse(readFileSync("./shared/__tests__/__data__/utils-settings-tests.json").toString());
const keys = JSON.parse(readFileSync("./shared/__tests__/__data__/utils-settings-keys.json").toString());

describe("roundToDecimalPlace tests", () => {
  test.each([
    [1.234567, 2, 1.23],
    [1.234567, 3, 1.235],
    [1.234567, 4, 1.2346],
    [1.234567, 5, 1.23457]
  ])("roundToDecimalPlace(%p, %p) should return %p", (value, decimalPlace, expected) => {
    const result = utils.roundToDecimalPlace(value, decimalPlace);
    expect(result).toBe(expected);
  });
});

describe("calculateAutoScale tests", () => {
  test.each([
    [0, 10, { lowerRange: -0.5, upperRange: 10.5, scaleStep: 2.2, scaleStart: 0 }],
    [0, 100, { lowerRange: -5, upperRange: 105, scaleStep: 22, scaleStart: 0 }],
    [0, 1000, { lowerRange: -50, upperRange: 1050, scaleStep: 220, scaleStart: 0 }],
    [0, 9, { lowerRange: -0.45, upperRange: 9.45, scaleStep: 1.98, scaleStart: 0 }],
    [-8, 8, { lowerRange: -8.8, upperRange: 8.8, scaleStep: 3.52, scaleStart: 0 }]
  ])("calculateAutoScale(%p, %p) should return %p", (min, max, expected) => {
    const result = utils.calculateAutoScale(min, max);
    expect(result).toEqual(expected);
  });
});

describe("checkUserAllowedDownloadDatapack tests", () => {
  const uuid = "123e4567-e89b-12d3-a456-426614174000";
  const testUser: SharedUser = {
    uuid,
    email: "test@example.com",
    username: "testuser",
    pictureUrl: "https://example.com/picture.jpg",
    isAdmin: false,
    isGoogleUser: false,
    accountType: "",
    historyEntries: []
  };
  const testOfficialDatapack: DatapackMetadata = {
    description: "description",
    title: "Title",
    originalFileName: "file.dpk",
    storedFileName: "tempFileName",
    size: "size",
    tags: [],
    authoredBy: "authoredBy",
    references: [],
    datapackImage: "image",
    isPublic: true,
    type: "official",
    priority: 0,
    hasFiles: false
  };

  const testPrivateDatapack: DatapackMetadata = {
    ...testOfficialDatapack,
    isPublic: false,
    type: "user",
    uuid
  };

  it("should allow admin users to download any datapack", () => {
    const adminUser = { ...testUser, isAdmin: true };
    expect(utils.checkUserAllowedDownloadDatapack(adminUser, testOfficialDatapack)).toBe(true);
  });

  it("should allow download if the datapack is public", () => {
    expect(utils.checkUserAllowedDownloadDatapack(testUser, testOfficialDatapack)).toBe(true);
  });

  it("should allow user to download their own datapack", () => {
    expect(utils.checkUserAllowedDownloadDatapack(testUser, testPrivateDatapack)).toBe(true);
  });

  it("should not allow user to download another user's private datapack", () => {
    const privateDatapack: DatapackMetadata = { ...testPrivateDatapack, type: "user", uuid: "another-uuid" };
    expect(utils.checkUserAllowedDownloadDatapack(testUser, privateDatapack)).toBe(false);
  });

  it("should not allow user to download a private official datapack", () => {
    const privateOfficialDatapack: DatapackMetadata = { ...testOfficialDatapack, isPublic: false, type: "official" };
    expect(utils.checkUserAllowedDownloadDatapack(testUser, privateOfficialDatapack)).toBe(false);
  });
});
describe("getWorkshopUUIDFromWorkshopId", () => {
  it("should return the correct workshop UUID for a given workshop ID", () => {
    const workshopId = 12345;
    const result = utils.getWorkshopUUIDFromWorkshopId(workshopId);
    expect(result).toBe("workshop-12345");
  });
});

describe("escape html chars", () => {
  test.each([
    ["", ""],
    ["&", "&amp;"],
    ["<", "&lt;"],
    ['"', "&quot;"],
    ["'", "&apos;"],
    [">", "&gt;"],
    [`&<"'>`, `&amp;&lt;&quot;&apos;&gt;`]
  ])("escaping attribute %s should return %s", (input, expected) => {
    expect(utils.escapeHtmlChars(input, "attribute")).toEqual(expected);
  });
  test.each([
    ["", ""],
    ["&", "&amp;"],
    ["<", "&lt;"],
    ['"', '"'],
    ["'", "'"],
    [">", ">"],
    [`&<"'>`, `&amp;&lt;"'>`]
  ])("escaping text %s should return %s", (input, expected) => {
    expect(utils.escapeHtmlChars(input, "text")).toEqual(expected);
  });
});

describe("extract column type", () => {
  test.each([
    ["", undefined],
    ["RootColumn", undefined],
    ["class datastoreRootColumn:Chart Root", undefined],
    ["class datastore.RootColumn Chart Root", undefined],
    ["class datastore.RootColumn:Chart Root", "RootColumn"]
  ])("should process %s to %s", (input, expected) => {
    expect(utils.extractColumnType(input)).toEqual(expected);
  });
});

describe("translate columnInfo to columnInfoTSC", () => {
  it("should translate basic column", async () => {
    expect(utils.translateColumnInfoToColumnInfoTSC(tests["translate-basic-column-test"])).toEqual(
      keys["translate-basic-column-key"]
    );
  });
  it("should translate event column", async () => {
    expect(utils.translateColumnInfoToColumnInfoTSC(tests["translate-event-column-test"])).toEqual(
      keys["translate-event-column-key"]
    );
  });
  it("should translate point column", async () => {
    expect(utils.translateColumnInfoToColumnInfoTSC(tests["translate-point-column-test"])).toEqual(
      keys["translate-point-column-key"]
    );
  });
  it("should translate range column", async () => {
    expect(utils.translateColumnInfoToColumnInfoTSC(tests["translate-range-column-test"])).toEqual(
      keys["translate-range-column-key"]
    );
  });
  it("should translate chron column", async () => {
    expect(utils.translateColumnInfoToColumnInfoTSC(tests["translate-chron-column-test"])).toEqual(
      keys["translate-chron-column-key"]
    );
  });
  it("should translate sequence column", async () => {
    expect(utils.translateColumnInfoToColumnInfoTSC(tests["translate-sequence-column-test"])).toEqual(
      keys["translate-sequence-column-key"]
    );
  });
  const basicColumn = tests["translate-basic-column-test"];
  test.each([
    [basicColumn.name, "Root", "class datastore.RootColumn:Chart Root", basicColumn],
    [
      basicColumn.name,
      "Block",
      "class datastore.BlockColumn:Chart Root",
      { ...basicColumn, columnDisplayType: "Block" }
    ],
    [
      basicColumn.name,
      "Facies",
      "class datastore.FaciesColumn:Chart Root",
      { ...basicColumn, columnDisplayType: "Facies" }
    ],
    [
      basicColumn.name,
      "Event",
      "class datastore.EventColumn:Chart Root",
      { ...basicColumn, columnDisplayType: "Event", columnSpecificSettings: { ...defaultEventSettings } }
    ],
    [
      basicColumn.name,
      "Range",
      "class datastore.RangeColumn:Chart Root",
      { ...basicColumn, columnDisplayType: "Range", columnSpecificSettings: { ...defaultRangeSettings } }
    ],
    [
      basicColumn.name,
      "Chron",
      "class datastore.ChronColumn:Chart Root",
      { ...basicColumn, columnDisplayType: "Chron", columnSpecificSettings: { ...defaultChronSettings } }
    ],
    [
      basicColumn.name,
      "Freehand",
      "class datastore.FreehandColumn:Chart Root",
      { ...basicColumn, columnDisplayType: "Freehand" }
    ],
    [
      basicColumn.name,
      "Point",
      "class datastore.PointColumn:Chart Root",
      { ...basicColumn, columnDisplayType: "Point", columnSpecificSettings: { ...defaultPointSettings } }
    ],
    [
      basicColumn.name,
      "Sequence",
      "class datastore.SequenceColumn:Chart Root",
      { ...basicColumn, columnDisplayType: "Sequence", columnSpecificSettings: { ...defaultSequenceSettings } }
    ],
    [
      basicColumn.name,
      "Transect",
      "class datastore.TransectColumn:Chart Root",
      { ...basicColumn, columnDisplayType: "Transect" }
    ],
    [
      basicColumn.name,
      "Blank",
      "class datastore.BlankColumn:Chart Root",
      { ...basicColumn, columnDisplayType: "Blank" }
    ],
    [
      basicColumn.name,
      "Zone",
      "class datastore.ZoneColumn:Chart Root",
      { ...basicColumn, columnDisplayType: "Zone", columnSpecificSettings: { ...defaultZoneSettings } }
    ],
    [
      basicColumn.name,
      "Ruler",
      "class datastore.RulerColumn:Chart Root",
      { ...basicColumn, columnDisplayType: "Ruler" }
    ],
    [
      basicColumn.name,
      "AgeAge",
      "class datastore.AgeAgeColumn:Chart Root",
      { ...basicColumn, columnDisplayType: "AgeAge" }
    ],
    [
      basicColumn.name,
      "MetaColumn",
      "class datastore.MetaColumn:Chart Root",
      { ...basicColumn, columnDisplayType: "MetaColumn" }
    ],
    [
      basicColumn.name,
      "BlockSeriesMetaColumn",
      "class datastore.BlockSeriesMetaColumn:Chart Root",
      { ...basicColumn, columnDisplayType: "BlockSeriesMetaColumn" }
    ]
  ])(
    "ColumnInfo with name %s and display type %s should have id %s after translating to ColumnInfoTSC",
    (name, displayType, expected, input) => {
      expect(utils.translateColumnInfoToColumnInfoTSC(input as ColumnInfo)._id).toEqual(expected);
    }
  );
});

describe("generate fonts xml", () => {
  const defaultFonts = {
    "Column Header": {
      on: false,
      bold: false,
      color: "rgb(0, 0, 0)",
      fontFace: "Arial",
      inheritable: false,
      italic: false,
      size: 14
    },
    "Age Label": {
      on: false,
      bold: false,
      color: "rgb(0, 0, 0)",
      fontFace: "Arial",
      inheritable: false,
      italic: false,
      size: 6
    },
    "Uncertainty Label": {
      on: false,
      bold: false,
      color: "rgb(0, 0, 0)",
      fontFace: "Arial",
      inheritable: false,
      italic: true,
      size: 5
    },
    "Zone Column Label": {
      on: false,
      bold: false,
      color: "rgb(0, 0, 0)",
      fontFace: "Arial",
      inheritable: false,
      italic: false,
      size: 12
    },
    "Sequence Column Label": {
      on: false,
      bold: false,
      color: "rgb(0, 0, 0)",
      fontFace: "Arial",
      inheritable: false,
      italic: false,
      size: 12
    },
    "Event Column Label": {
      on: false,
      bold: false,
      color: "rgb(0, 0, 0)",
      fontFace: "Arial",
      inheritable: false,
      italic: false,
      size: 11
    },
    "Popup Body": {
      on: false,
      bold: false,
      color: "rgb(0, 0, 0)",
      fontFace: "Arial",
      inheritable: false,
      italic: false,
      size: 12
    },
    "Ruler Label": {
      on: false,
      bold: false,
      color: "rgb(0, 0, 0)",
      fontFace: "Arial",
      inheritable: false,
      italic: false,
      size: 12
    },
    "Point Column Scale Label": {
      on: false,
      bold: false,
      color: "rgb(0, 0, 0)",
      fontFace: "Arial",
      inheritable: false,
      italic: false,
      size: 6
    },
    "Range Label": {
      on: false,
      bold: false,
      color: "rgb(0, 0, 0)",
      fontFace: "Arial",
      inheritable: false,
      italic: false,
      size: 12
    },
    "Ruler Tick Mark Label": {
      on: false,
      bold: false,
      color: "rgb(0, 0, 0)",
      fontFace: "Arial",
      inheritable: false,
      italic: false,
      size: 7
    },
    "Legend Title": {
      on: false,
      bold: true,
      color: "rgb(0, 0, 0)",
      fontFace: "Verdana",
      inheritable: false,
      italic: false,
      size: 14
    },
    "Legend Column Name": {
      on: false,
      bold: true,
      color: "rgb(0, 0, 0)",
      fontFace: "Verdana",
      inheritable: false,
      italic: false,
      size: 12
    },
    "Legend Column Source": {
      on: false,
      bold: false,
      color: "rgb(0, 0, 0)",
      fontFace: "Verdana",
      inheritable: false,
      italic: true,
      size: 12
    },
    "Range Box Label": {
      on: false,
      bold: false,
      color: "rgb(0, 0, 0)",
      fontFace: "Arial",
      inheritable: false,
      italic: true,
      size: 14
    }
  };
  it("should generate default fonts", async () => {
    const key =
      `    <font function="Column Header" inheritable="false"/>\n` +
      `    <font function="Age Label" inheritable="false"/>\n` +
      `    <font function="Uncertainty Label" inheritable="false"/>\n` +
      `    <font function="Zone Column Label" inheritable="false"/>\n` +
      `    <font function="Sequence Column Label" inheritable="false"/>\n` +
      `    <font function="Event Column Label" inheritable="false"/>\n` +
      `    <font function="Popup Body" inheritable="false"/>\n` +
      `    <font function="Ruler Label" inheritable="false"/>\n` +
      `    <font function="Point Column Scale Label" inheritable="false"/>\n` +
      `    <font function="Range Label" inheritable="false"/>\n` +
      `    <font function="Ruler Tick Mark Label" inheritable="false"/>\n` +
      `    <font function="Legend Title" inheritable="false"/>\n` +
      `    <font function="Legend Column Name" inheritable="false"/>\n` +
      `    <font function="Legend Column Source" inheritable="false"/>\n` +
      `    <font function="Range Box Label" inheritable="false"/>\n`;
    expect(utils.generateFontsXml("    ", defaultFonts as FontsInfo)).toEqual(key);
  });
  const changedFonts = {
    ...defaultFonts,
    "Column Header": {
      on: true,
      bold: false,
      color: "rgb(127,61,61)",
      fontFace: "Courier",
      inheritable: false,
      italic: false,
      size: 14
    },
    "Age Label": {
      on: true,
      bold: false,
      color: "rgb(107,125,171)",
      fontFace: "Arial",
      inheritable: false,
      italic: false,
      size: 6
    },
    "Uncertainty Label": {
      on: true,
      bold: false,
      color: "rgb(0,0,0)",
      fontFace: "Arial",
      inheritable: false,
      italic: true,
      size: 5
    }
  };
  it("should generate changed fonts", async () => {
    const key =
      `    <font function="Column Header" inheritable="false">font-family: Courier; font-size: 14;fill: rgb(127,61,61);</font>\n` +
      `    <font function="Age Label" inheritable="false">font-family: Arial; font-size: 6;fill: rgb(107,125,171);</font>\n` +
      `    <font function="Uncertainty Label" inheritable="false">font-family: Arial; font-size: 5; font-style: italic;fill: rgb(0,0,0);</font>\n` +
      `    <font function="Zone Column Label" inheritable="false"/>\n` +
      `    <font function="Sequence Column Label" inheritable="false"/>\n` +
      `    <font function="Event Column Label" inheritable="false"/>\n` +
      `    <font function="Popup Body" inheritable="false"/>\n` +
      `    <font function="Ruler Label" inheritable="false"/>\n` +
      `    <font function="Point Column Scale Label" inheritable="false"/>\n` +
      `    <font function="Range Label" inheritable="false"/>\n` +
      `    <font function="Ruler Tick Mark Label" inheritable="false"/>\n` +
      `    <font function="Legend Title" inheritable="false"/>\n` +
      `    <font function="Legend Column Name" inheritable="false"/>\n` +
      `    <font function="Legend Column Source" inheritable="false"/>\n` +
      `    <font function="Range Box Label" inheritable="false"/>\n`;
    expect(utils.generateFontsXml("    ", changedFonts as FontsInfo)).toEqual(key);
  });
  it("should return undefined", async () => {
    expect(utils.generateFontsXml("", undefined)).toEqual("");
  });
});

describe("columnInfoTSC to xml", () => {
  const mock = vi.spyOn(utils, "generateFontsXml");
  it("should generate basic column xml", async () => {
    mock.mockReturnValue("");
    const key =
      `    <setting name="title">Chart Root</setting>\n` +
      `    <setting name="useNamedColor">false</setting>\n` +
      `    <setting name="placeHolder">false</setting>\n` +
      `    <setting name="drawTitle">true</setting>\n` +
      `    <setting name="drawAgeLabel">false</setting>\n` +
      `    <setting name="drawUncertaintyLabel">false</setting>\n` +
      `    <setting name="isSelected">true</setting>\n` +
      `    <setting name="pad">0.2</setting>\n` +
      `    <setting name="age pad">2</setting>\n` +
      `    <setting name="backgroundColor"/>\n` +
      `    <setting name="customColor" useNamed="false">rgb(255,255,255)</setting>\n` +
      `    <fonts>\n` +
      `    </fonts>\n` +
      `    <setting name="width">100</setting>\n`;
    expect(utils.columnInfoTSCToXml(tests["generate-basic-column-xml-test"], "    ").replace(/\r\n/g, "\n")).toEqual(
      key
    );
  });
  it("should generate event column xml", async () => {
    mock.mockReturnValue("");
    const key =
      `    <setting name="title">Events (Venusian)</setting>\n` +
      `    <setting name="useNamedColor">false</setting>\n` +
      `    <setting name="placeHolder">false</setting>\n` +
      `    <setting name="drawTitle">true</setting>\n` +
      `    <setting name="drawAgeLabel">false</setting>\n` +
      `    <setting name="drawUncertaintyLabel">false</setting>\n` +
      `    <setting name="isSelected">true</setting>\n` +
      `    <setting name="width">100</setting>\n` +
      `    <setting name="pad">0.2</setting>\n` +
      `    <setting name="age pad">2</setting>\n` +
      `    <setting name="backgroundColor" useNamed="false">rgb(239,232,224)</setting>\n` +
      `    <setting name="customColor" useNamed="false">rgb(239,232,224)</setting>\n` +
      `    <fonts>\n` +
      `    </fonts>\n` +
      `    <setting name="type">events</setting>\n` +
      `    <setting name="rangeSort">first occurrence</setting>\n` +
      `    <setting name="windowSize">2</setting>\n` +
      `    <setting name="stepSize">1</setting>\n`;
    expect(utils.columnInfoTSCToXml(tests["generate-event-column-xml-test"], "    ").replace(/\r\n/g, "\n")).toEqual(
      key
    );
  });
  it("should generate point column xml", async () => {
    mock.mockReturnValue("");
    const key =
      `    <setting name="title">Long-Term Phanerozoic</setting>\n` +
      `    <setting name="useNamedColor">false</setting>\n` +
      `    <setting name="placeHolder">false</setting>\n` +
      `    <setting name="drawTitle">true</setting>\n` +
      `    <setting name="drawAgeLabel">false</setting>\n` +
      `    <setting name="drawUncertaintyLabel">false</setting>\n` +
      `    <setting name="isSelected">false</setting>\n` +
      `    <setting name="width">100</setting>\n` +
      `    <setting name="pad">0.2</setting>\n` +
      `    <setting name="age pad">2</setting>\n` +
      `    <setting name="backgroundColor"/>\n` +
      `    <setting name="customColor" useNamed="false">rgb(255,255,255)</setting>\n` +
      `    <fonts>\n` +
      `    </fonts>\n` +
      `    <setting name="drawPoints">false</setting>\n` +
      `    <setting name="drawLine">true</setting>\n` +
      `    <setting name="lineColor">rgb(0,0,0)</setting>\n` +
      `    <setting name="drawSmooth">true</setting>\n` +
      `    <setting name="drawFill">true</setting>\n` +
      `    <setting name="fillColor">rgb(64,233,191)</setting>\n` +
      `    <setting name="doNotSetWindowAuto">false</setting>\n` +
      `    <setting name="minWindow">-150</setting>\n` +
      `    <setting name="maxWindow">280</setting>\n` +
      `    <setting name="drawScale">true</setting>\n` +
      `    <setting name="drawBgrndGradient">false</setting>\n` +
      `    <setting name="backGradStart">rgb(0,0,0)</setting>\n` +
      `    <setting name="backGradEnd">rgb(255,255,255)</setting>\n` +
      `    <setting name="drawCurveGradient">false</setting>\n` +
      `    <setting name="curveGradStart">rgb(0,0,0)</setting>\n` +
      `    <setting name="curveGradEnd">rgb(255,255,255)</setting>\n` +
      `    <setting name="flipScale">false</setting>\n` +
      `    <setting name="scaleStart">0</setting>\n` +
      `    <setting name="scaleStep">1</setting>\n` +
      `    <setting name="pointType" pointType="rect"/>\n` +
      `    <setting name="windowSize">2</setting>\n` +
      `    <setting name="stepSize">1</setting>\n`;
    expect(utils.columnInfoTSCToXml(tests["generate-point-column-xml-test"], "    ").replace(/\r\n/g, "\n")).toEqual(
      key
    );
  });
  it("should generate basic column with point column child xml", async () => {
    mock.mockReturnValue("");
    expect(
      utils.columnInfoTSCToXml(tests["generate-basic-column-with-point-child-xml-test"], "    ").replace(/\r\n/g, "\n")
    ).toEqual(
      readFileSync("./shared/__tests__/__data__/generate-basic-column-with-point-child-xml-key.tsc")
        .toString()
        .replace(/\r\n/g, "\n")
    );
  });
});

describe("buildTscXmlDocument", () => {
  it("should generate prolog and root of xml", () => {
    const settingsXml = "";
    const key =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<TSCreator version="PRO8.1">\n` +
      `    <settings version="1.0">\n` +
      `    </settings>\n` +
      `    <column id="class datastore.RootColumn:Chart Root">\n` +
      `        <setting name="title">Chart Root</setting>\n` +
      `        <setting name="useNamedColor">false</setting>\n` +
      `        <setting name="placeHolder">false</setting>\n` +
      `        <setting name="drawTitle">true</setting>\n` +
      `        <setting name="drawAgeLabel">false</setting>\n` +
      `        <setting name="drawUncertaintyLabel">false</setting>\n` +
      `        <setting name="isSelected">true</setting>\n` +
      `        <setting name="width">100</setting>\n` +
      `        <setting name="pad">0.2</setting>\n` +
      `        <setting name="age pad">2</setting>\n` +
      `        <setting name="backgroundColor"/>\n` +
      `        <setting name="customColor" useNamed="false">rgb(255,255,255)</setting>\n` +
      `        <fonts>\n` +
      `        </fonts>\n` +
      `    </column>\n` +
      `</TSCreator>`;

    expect(utils.buildTscXmlDocument(tests["translate-basic-column-test"], settingsXml, "PRO8.1")).toEqual(key);
  });
});

describe("columnInfoTSCToXml edge cases", () => {
  it("rewrites Age title", () => {
    const column = {
      ...tests["generate-basic-column-xml-test"],
      title: "Age 12 for Something"
    };

    expect(utils.columnInfoTSCToXml(column, "    ")).toContain(`<setting name="title">Age</setting>`);
  });

  it("rewrites Blank title with serial number", () => {
    const column = {
      ...tests["generate-basic-column-xml-test"],
      title: "Blank 2 for Something"
    };

    expect(utils.columnInfoTSCToXml(column, "    ")).toContain(`<setting name="title">Blank 2</setting>`);
  });

  it("writes empty backgroundColor when text is missing", () => {
    const column = {
      ...tests["generate-basic-column-xml-test"],
      backgroundColor: {}
    };

    expect(utils.columnInfoTSCToXml(column, "    ")).toContain(`<setting name="backgroundColor"/>`);
  });

  it("writes empty customColor when text is missing", () => {
    const column = {
      ...tests["generate-basic-column-xml-test"],
      customColor: {}
    };

    expect(utils.columnInfoTSCToXml(column, "    ")).toContain(`<setting name="customColor"/>`);
  });

  it("writes child data mining flag", () => {
    const column = JSON.parse(JSON.stringify(tests["generate-basic-column-with-point-child-xml-test"]));
    column.children[0].isDataMiningColumn = true;

    expect(utils.columnInfoTSCToXml(column, "    ")).toContain(`isDataMiningColumn="true"`);
  });

  it("writes child dual column comparison flag", () => {
    const column = JSON.parse(JSON.stringify(tests["generate-basic-column-with-point-child-xml-test"]));
    column.children[0].isDualColCompColumn = true;

    expect(utils.columnInfoTSCToXml(column, "    ")).toContain(`isDualColCompColumn="true"`);
  });
  it("writes justification attribute", () => {
    const input = {
      ...tests["translate-basic-column-test"],
      name: "NotMa",
      editName: "NotMa",
      columnDisplayType: "Ruler",
      units: "Ma units",
      columnSpecificSettings: { justification: "left" }
    } as ColumnInfo;

    const column = utils.translateColumnInfoToColumnInfoTSC(input);
    const xml = utils.columnInfoTSCToXml(column, "    ");

    expect(xml).toContain(`<setting justification="left" name="justification"/>`);
  });

  it("writes orientation attribute", () => {
    const input = {
      ...tests["translate-basic-column-test"],
      name: "Zone",
      editName: "Zone",
      columnDisplayType: "Zone",
      columnSpecificSettings: { ...defaultZoneSettings }
    } as ColumnInfo;

    const column = utils.translateColumnInfoToColumnInfoTSC(input);
    const xml = utils.columnInfoTSCToXml(column, "    ");

    expect(xml).toContain(`<setting name="orientation" orientation="${defaultZoneSettings.orientation}"/>`);
  });
});
