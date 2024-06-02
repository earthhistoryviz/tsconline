import { ColumnInfo } from "@tsconline/shared";
import { columnInfoTSCToXml, jsonToXml, translateColumnInfoToColumnInfoTSC } from "../src/state/parse-settings";
import { readFileSync } from "fs";
import { ChartSettings } from "../src/types";
const inputs = JSON.parse(readFileSync("app/__tests__/__data__/column-inputs.json", "utf-8").toString());

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

describe("parseSettings tests", () => {
  it("should parse root column only", async () => {
    const settings = jsonToXml(inputs["basic-column-test"] as ColumnInfo, inputs["default-settings"] as ChartSettings);
    expect(settings).toEqual(readFileSync("app/__tests__/__data__/root-column-key.tsc").toString());
  });
  /**
   * basic columns are columns with no extra settings.
   * (Meta, Facies, BlockSeriesMeta, Chron, Freehand, Transect, Root, Blank)
   * could change later if jar file is changed so that these columns accept more parameters
   */
  it("should parse basic column", async () => {
    const settings = columnInfoTSCToXml(translateColumnInfoToColumnInfoTSC(inputs["basic-column-test"]), "    ");
    expect(settings).toEqual(readFileSync("app/__tests__/__data__/basic-column-key.tsc").toString());
  });

  it("should parse event column", async () => {
    const settings = columnInfoTSCToXml(translateColumnInfoToColumnInfoTSC(inputs["event-column-test"]), "    ");
    expect(settings).toEqual(readFileSync("app/__tests__/__data__/event-column-key.tsc").toString());
  });

  it("should parse point column", async () => {
    const settings = columnInfoTSCToXml(translateColumnInfoToColumnInfoTSC(inputs["point-column-test"]), "    ");
    expect(settings).toEqual(readFileSync("app/__tests__/__data__/point-column-key.tsc").toString());
  });
  it("should parse font change", async () => {
    const settings = columnInfoTSCToXml(translateColumnInfoToColumnInfoTSC(inputs["font-change-test"]), "    ");
    expect(settings).toEqual(readFileSync("app/__tests__/__data__/font-change-key.tsc").toString());
  });
  it("should parse all columns and settings", async () => {
    const settings = jsonToXml(inputs["all-column-test"], inputs["default-settings"]);
    expect(settings).toEqual(readFileSync("app/__tests__/__data__/all-column-key.tsc").toString());
  });
});
