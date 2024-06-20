import { vi, describe, expect, test, it } from "vitest";
import {
  ChartInfoTSC,
  ColumnInfo,
  FontsInfo,
  defaultChronSettings,
  defaultEventSettings,
  defaultPointSettings
} from "@tsconline/shared";
import * as parseSettings from "../src/state/parse-settings";
import { ChartSettings } from "../src/types";
import { readFileSync } from "fs";
const tests = JSON.parse(readFileSync("./app/__tests__/__data__/parse-settings-tests.json").toString());
const keys = JSON.parse(readFileSync("./app/__tests__/__data__/parse-settings-keys.json").toString());
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
    expect(parseSettings.escapeHtmlChars(input, "attribute")).toEqual(expected);
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
    expect(parseSettings.escapeHtmlChars(input, "text")).toEqual(expected);
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
    expect(parseSettings.extractColumnType(input)).toEqual(expected);
  });
});

describe("translate columnInfo to columnInfoTSC", () => {
  it("should translate basic column", async () => {
    expect(parseSettings.translateColumnInfoToColumnInfoTSC(tests["translate-basic-column-test"])).toEqual(
      keys["translate-basic-column-key"]
    );
  });
  it("should translate event column", async () => {
    expect(parseSettings.translateColumnInfoToColumnInfoTSC(tests["translate-event-column-test"])).toEqual(
      keys["translate-event-column-key"]
    );
  });
  it("should translate point column", async () => {
    expect(parseSettings.translateColumnInfoToColumnInfoTSC(tests["translate-point-column-test"])).toEqual(
      keys["translate-point-column-key"]
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
      { ...basicColumn, columnDisplayType: "Range" }
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
      { ...basicColumn, columnDisplayType: "Sequence" }
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
    [basicColumn.name, "Zone", "class datastore.ZoneColumn:Chart Root", { ...basicColumn, columnDisplayType: "Zone" }],
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
      expect(parseSettings.translateColumnInfoToColumnInfoTSC(input as ColumnInfo)._id).toEqual(expected);
    }
  );
});

describe("generate settings xml", () => {
  const defaultSettings = {
    timeSettings: {
      Ma: {
        selectedStage: "",
        topStageAge: 0,
        topStageKey: "",
        baseStageAge: 0,
        baseStageKey: "",
        unitsPerMY: 2,
        skipEmptyColumns: true
      }
    },
    noIndentPattern: false,
    enableColumnBackground: false,
    enableChartLegend: false,
    enablePriority: false,
    enableHideBlockLabel: false,
    mouseOverPopupsEnabled: false,
    datapackContainsSuggAge: false,
    useDatapackSuggestedAge: true
  };
  it("should generate default settings", async () => {
    const key =
      `<setting name="topAge" source="text" unit="Ma">\n` +
      `    <setting name="text">0</setting>\n` +
      `</setting>\n` +
      `<setting name="baseAge" source="text" unit="Ma">\n` +
      `    <setting name="text">0</setting>\n` +
      `</setting>\n` +
      `<setting name="unitsPerMY" unit="Ma">60</setting>\n` +
      `<setting name="skipEmptyColumns" unit="Ma">true</setting>\n` +
      `<setting name="variableColors">UNESCO</setting>\n` +
      `<setting name="noIndentPattern">false</setting>\n` +
      `<setting name="negativeChk">false</setting>\n` +
      `<setting name="doPopups">false</setting>\n` +
      `<setting name="enEventColBG">false</setting>\n` +
      `<setting name="enChartLegend">false</setting>\n` +
      `<setting name="enPriority">false</setting>\n` +
      `<setting name="enHideBlockLable">false</setting>\n`;
    expect(parseSettings.generateSettingsXml(defaultSettings, "")).toEqual(key);
  });
  const multiunitSettings = {
    ...defaultSettings,
    timeSettings: {
      ...defaultSettings.timeSettings,
      "ka (before AD2000)": {
        selectedStage: "",
        topStageAge: 0,
        topStageKey: "Holocene",
        baseStageAge: 15,
        baseStageKey: "",
        unitsPerMY: 2,
        skipEmptyColumns: true
      }
    }
  };
  it("should generate multiunit settings", async () => {
    const key =
      `<setting name="topAge" source="text" unit="Ma">\n` +
      `    <setting name="text">0</setting>\n` +
      `</setting>\n` +
      `<setting name="baseAge" source="text" unit="Ma">\n` +
      `    <setting name="text">0</setting>\n` +
      `</setting>\n` +
      `<setting name="unitsPerMY" unit="Ma">60</setting>\n` +
      `<setting name="skipEmptyColumns" unit="Ma">true</setting>\n` +
      `<setting name="topAge" source="text" unit="ka (before AD2000)">\n` +
      `    <setting name="text">0</setting>\n` +
      `</setting>\n` +
      `<setting name="baseAge" source="text" unit="ka (before AD2000)">\n` +
      `    <setting name="text">15</setting>\n` +
      `</setting>\n` +
      `<setting name="unitsPerMY" unit="ka (before AD2000)">60</setting>\n` +
      `<setting name="skipEmptyColumns" unit="ka (before AD2000)">true</setting>\n` +
      `<setting name="variableColors">UNESCO</setting>\n` +
      `<setting name="noIndentPattern">false</setting>\n` +
      `<setting name="negativeChk">false</setting>\n` +
      `<setting name="doPopups">false</setting>\n` +
      `<setting name="enEventColBG">false</setting>\n` +
      `<setting name="enChartLegend">false</setting>\n` +
      `<setting name="enPriority">false</setting>\n` +
      `<setting name="enHideBlockLable">false</setting>\n`;
    expect(parseSettings.generateSettingsXml(multiunitSettings, "")).toEqual(key);
  });
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
    expect(parseSettings.generateFontsXml("    ", defaultFonts as FontsInfo)).toEqual(key);
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
    expect(parseSettings.generateFontsXml("    ", changedFonts as FontsInfo)).toEqual(key);
  });
  it("should return undefined", async () => {
    expect(parseSettings.generateFontsXml("", undefined)).toEqual("");
  });
});

describe("columnInfoTSC to xml", () => {
  const mock = vi.spyOn(parseSettings, "generateFontsXml");
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
    expect(
      parseSettings.columnInfoTSCToXml(tests["generate-basic-column-xml-test"], "    ").replace(/\r\n/g, "\n")
    ).toEqual(key);
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
    expect(
      parseSettings.columnInfoTSCToXml(tests["generate-event-column-xml-test"], "    ").replace(/\r\n/g, "\n")
    ).toEqual(key);
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
    expect(
      parseSettings.columnInfoTSCToXml(tests["generate-point-column-xml-test"], "    ").replace(/\r\n/g, "\n")
    ).toEqual(key);
  });
  it("should generate basic column with point column child xml", async () => {
    mock.mockReturnValue("");
    expect(
      parseSettings
        .columnInfoTSCToXml(tests["generate-basic-column-with-point-child-xml-test"], "    ")
        .replace(/\r\n/g, "\n")
    ).toEqual(
      readFileSync("./app/__tests__/__data__/generate-basic-column-with-point-child-xml-key.tsc")
        .toString()
        .replace(/\r\n/g, "\n")
    );
  });
});

describe("json to xml", () => {
  const mock1 = vi.spyOn(parseSettings, "generateSettingsXml");
  const mock2 = vi.spyOn(parseSettings, "columnInfoTSCToXml");
  const mock3 = vi.spyOn(parseSettings, "columnInfoToSettingsTSC");
  it("should generate prolog and root of xml", async () => {
    mock1.mockReturnValue("");
    mock2.mockReturnValue("");
    mock3.mockReturnValue({} as ChartInfoTSC);
    const key =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<TSCreator version="PRO8.1">\n` +
      `    <settings version="1.0">\n` +
      `    </settings>\n` +
      `    <column id="class datastore.RootColumn:Chart Root">\n` +
      `    </column>\n` +
      `</TSCreator>`;
    expect(parseSettings.jsonToXml({} as ColumnInfo, {} as ChartSettings)).toEqual(key);
  });
});
