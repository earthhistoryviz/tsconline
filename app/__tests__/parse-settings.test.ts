import * as parseSettings from "../src/state/parse-settings";
import { readFileSync } from "fs";
const tests = JSON.parse(readFileSync("app/__tests__/__data__/parse-settings-tests.json", "utf-8").toString());
const keys = JSON.parse(readFileSync("app/__tests__/__data__/parse-settings-keys.json", "utf-8").toString());
jest.mock("@tsconline/shared", () => ({
  defaultColumnBasicInfoTSC: {
    _id: "",
    title: "",
    useNamedColor: false,
    placeHolder: false,
    drawTitle: true,
    drawAgeLabel: false,
    drawUncertaintyLabel: false,
    isSelected: true,
    width: undefined,
    pad: 0.2,
    "age pad": 2,
    backgroundColor: {
      text: {
        r: 255,
        g: 255,
        b: 255
      }
    },
    customColor: {
      text: {
        r: 255,
        g: 255,
        b: 255
      }
    },
    fonts: {
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
    },
    children: []
  },
  defaultEventColumnInfoTSC: {
    _id: "",
    title: "",
    useNamedColor: false,
    placeHolder: false,
    drawTitle: true,
    drawAgeLabel: false,
    drawUncertaintyLabel: false,
    isSelected: false,
    width: 150,
    pad: 0.2,
    "age pad": 2,
    backgroundColor: {
      text: {
        r: 255,
        g: 255,
        b: 255
      }
    },
    customColor: {
      text: {
        r: 255,
        g: 255,
        b: 255
      }
    },
    fonts: {
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
    },
    children: [],
    type: "events",
    rangeSort: "first occurrence",
    drawExtraColumn: null,
    windowSize: 2,
    stepSize: 1,
    isDataMiningColumn: false
  },
  defaultPointColumnInfoTSC: {
    _id: "",
    title: "",
    useNamedColor: false,
    placeHolder: false,
    drawTitle: true,
    drawAgeLabel: false,
    drawUncertaintyLabel: false,
    isSelected: true,
    width: undefined,
    pad: 0.2,
    "age pad": 2,
    backgroundColor: {
      text: {
        r: 255,
        g: 255,
        b: 255
      }
    },
    customColor: {
      text: {
        r: 255,
        g: 255,
        b: 255
      }
    },
    fonts: {
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
    },
    children: [],
    isDataMiningColumn: false,
    drawPoints: false,
    drawLine: false,
    lineColor: {
      r: 0,
      g: 0,
      b: 0
    },
    drawSmooth: false,
    drawFill: false,
    fillColor: {
      r: 64,
      g: 233,
      b: 191
    },
    doNotSetWindowAuto: true,
    minWindow: 0,
    maxWindow: 0,
    drawScale: false,
    drawBgrndGradient: false,
    backGradStart: {
      r: 0,
      g: 0,
      b: 0
    },
    backGradEnd: {
      r: 255,
      g: 255,
      b: 255
    },
    drawCurveGradient: false,
    curveGradStart: {
      r: 0,
      g: 0,
      b: 0
    },
    curveGradEnd: {
      r: 255,
      g: 255,
      b: 255
    },
    flipScale: false,
    scaleStart: 0,
    scaleStep: 0,
    pointType: "rect",
    drawExtraColumn: null,
    windowSize: 2,
    stepSize: 1
  },
  defaultChartSettingsInfoTSC: {
    topAge: [],
    baseAge: [],
    unitsPerMY: [],
    skipEmptyColumns: [],
    variableColors: "",
    noIndentPattern: false,
    negativeChk: false,
    doPopups: false,
    enEventColBG: false,
    enChartLegend: false,
    enPriority: false,
    enHideBlockLable: false
  },
  assertChartInfoTSC: jest.fn().mockReturnValue(true),
  assertPointColumnInfoTSC: jest.fn().mockReturnValue(true),
  assertEventSettings: jest.fn().mockReturnValue(true),
  assertPointSettings: jest.fn().mockReturnValue(true),
  isRGB: jest.fn().mockImplementation((o) => {
    if (!o || typeof o !== "object") return false;
    if (typeof o.r !== "number") return false;
    if (o.r < 0 || o.r > 255) return false;
    if (typeof o.g !== "number") return false;
    if (o.g < 0 || o.g > 255) return false;
    if (typeof o.b !== "number") return false;
    if (o.b < 0 || o.b > 255) return false;
    return true;
  }),
  convertPointShapeToPointType: jest.fn().mockImplementation((o) => {
    switch (o) {
      case "circle":
        return "round";
      case "cross":
        return "tick";
      default:
        return "rect";
    }
  }),
  defaultFontsInfo: { font: "Arial" }
}));

describe("escape html chars", () => {
  test.each([
    ["&", "&amp;"],
    ["<", "&lt;"],
    ['"', "&quot;"],
    ["'", "&apos;"],
    [">", "&gt;"]
  ])("escape attribute", (input, expected) => {
    expect(parseSettings.escapeHtmlChars(input, "attribute")).toEqual(expected);
  });
  test.each([
    ["&", "&amp;"],
    ["<", "&lt;"],
    ['"', '"'],
    ["'", "'"],
    [">", ">"]
  ])("escape attribute", (input, expected) => {
    expect(parseSettings.escapeHtmlChars(input, "text")).toEqual(expected);
  });
});

describe("extract column type", () => {
  it("should extract column type for correctly formatted id", async () => {
    expect(parseSettings.extractColumnType("class datastore.RootColumn:Chart Root")).toEqual("RootColumn");
  });
  test.each([
    ["", undefined],
    ["RootColumn", undefined],
    ["class datastoreRootColumn:Chart Root", undefined],
    ["class datastore.RootColumn Chart Root", undefined]
  ])("should return undefined for incorrectly formatted id", (input, expected) => {
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
});

describe("generate settings xml", () => {
  it("should generate default settings", async () => {
    expect(parseSettings.generateSettingsXml(tests["default-settings-test"], "    ")).toEqual(
      readFileSync("app/__tests__/__data__/generate-settings-xml-key-1.tsc").toString()
    );
  });
  it("should generate multiunit settings", async () => {
    expect(parseSettings.generateSettingsXml(tests["multiunit-settings-test"], "    ")).toEqual(
      readFileSync("app/__tests__/__data__/generate-settings-xml-key-2.tsc").toString()
    );
  });
});

describe("generate fonts xml", () => {
  it("should generate default fonts", async () => {
    expect(parseSettings.generateFontsXml("    ", tests["default-fonts-test"])).toEqual(
      readFileSync("app/__tests__/__data__/generate-fonts-xml-key-1.tsc").toString()
    );
  });
  it("should generate changed fonts", async () => {
    expect(parseSettings.generateFontsXml("    ", tests["changed-fonts-test"])).toEqual(
      readFileSync("app/__tests__/__data__/generate-fonts-xml-key-2.tsc").toString()
    );
  });
  it("should return undefined", async () => {
    expect(parseSettings.generateFontsXml("", undefined)).toEqual("");
  });
});

describe("columnInfoTSC to xml", () => {
    const mock = jest.spyOn(parseSettings, 'generateFontsXml');
  it("should generate basic column xml", async () => {
    mock.mockReturnValue("");
    expect(parseSettings.columnInfoTSCToXml(tests["generate-basic-column-xml-test"], "    ")).toEqual(
      readFileSync("app/__tests__/__data__/generate-basic-column-xml-key.tsc").toString()
    );
  });
  it("should generate event column xml", async () => {
    mock.mockReturnValue("");
    expect(parseSettings.columnInfoTSCToXml(tests["generate-event-column-xml-test"], "    ")).toEqual(
      readFileSync("app/__tests__/__data__/generate-event-column-xml-key.tsc").toString()
    );
  });
  it("should generate point column xml", async () => {
    mock.mockReturnValue("");
    expect(parseSettings.columnInfoTSCToXml(tests["generate-point-column-xml-test"], "    ")).toEqual(
      readFileSync("app/__tests__/__data__/generate-point-column-xml-key.tsc").toString()
    );
  });
});

describe("json to xml", () => {
    const mock1 = jest.spyOn(parseSettings, 'generateSettingsXml');
    const mock2 = jest.spyOn(parseSettings, 'columnInfoTSCToXml');
    it("should generate prolog and root of xml", async () => {
        mock1.mockReturnValue("");
        mock2.mockReturnValue("");
        expect(parseSettings.jsonToXml(tests["generate-prolog-and-root-xml-test"], tests["default-settings-test"])).toEqual(
          readFileSync("app/__tests__/__data__/generate-prolog-and-root-xml-key.tsc").toString()
        );
      });
  })