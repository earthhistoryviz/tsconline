import { ChartInfoTSC, ColumnInfo, ColumnInfoTSC, FontsInfo } from "@tsconline/shared";
import * as parseSettings from "../src/state/parse-settings";
import { ChartSettings } from "../src/types";
jest.mock("@tsconline/shared", () => {
  const fontsInfo = {
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
  const defaultColumnBasicInfoTSC = {
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
    fonts: fontsInfo,
    children: []
  };
  return {
    defaultColumnBasicInfoTSC: defaultColumnBasicInfoTSC,
    defaultEventColumnInfoTSC: {
      ...defaultColumnBasicInfoTSC,
      type: "events",
      rangeSort: "first occurrence",
      drawExtraColumn: null,
      windowSize: 2,
      stepSize: 1,
      isDataMiningColumn: false
    },
    defaultZoneColumnInfoTSC: {
      ...defaultColumnBasicInfoTSC,
      crunchOuterMargin: 0,
      crunchInnerMargin: 0,
      crunchAscendWidth: 0,
      crunchOneSideSpaceUse: 0,
      autoFlip: false,
      orientation: "normal"
    },
    defaultSequenceColumnInfoTSC: {
      ...defaultColumnBasicInfoTSC,
      type: "sequence",
      labelMarginLeft: 0,
      labelMarginRight: 0,
      graphStyle: "",
      drawNameLabel: false
    },
    defaultRangeColumnInfoTSC: {
      ...defaultColumnBasicInfoTSC,
      rangeSort: "first occurrence"
    },
    defaultRulerColumnInfoTSC: {
      ...defaultColumnBasicInfoTSC,
      justification: "left"
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
      fonts: fontsInfo,
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
      doNotSetWindowAuto: false,
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
  };
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
  const basicColumn = {
    name: "Chart Root",
    editName: "Chart Root",
    fontsInfo: {},
    fontOptions: ["Column Header"],
    popup: "",
    on: true,
    width: 100,
    enableTitle: true,
    rgb: {
      r: 255,
      g: 255,
      b: 255
    },
    minAge: 1.7976931348623157e308,
    maxAge: 5e-324,
    children: [],
    parent: null,
    units: "",
    columnDisplayType: "RootColumn",
    show: true,
    expanded: true
  } as unknown as ColumnInfo;
  it("should translate basic column", async () => {
    const test = basicColumn;
    const key = {
      _id: "class datastore.RootColumn:Chart Root",
      title: "Chart Root",
      useNamedColor: false,
      placeHolder: false,
      drawTitle: true,
      drawAgeLabel: false,
      drawUncertaintyLabel: false,
      isSelected: true,
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
      fonts: {},
      children: [],
      width: 100
    };
    expect(parseSettings.translateColumnInfoToColumnInfoTSC(test)).toEqual(key);
  });
  it("should translate event column", async () => {
    const test = {
      ...basicColumn,
      name: "Events (Venusian)",
      editName: "Events (Venusian)",
      columnDisplayType: "Event",
      columnSpecificSettings: {
        type: "events",
        rangeSort: "first occurrence",
        frequency: null,
        stepSize: 1,
        windowSize: 2,
        isDataMiningColumn: false
      }
    } as unknown as ColumnInfo;
    const key = {
      _id: "class datastore.EventColumn:Events (Venusian)",
      title: "Events (Venusian)",
      useNamedColor: false,
      placeHolder: false,
      drawTitle: true,
      drawAgeLabel: false,
      drawUncertaintyLabel: false,
      isSelected: true,
      width: 100,
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
      fonts: {},
      children: [],
      type: "events",
      rangeSort: "first occurrence",
      drawExtraColumn: null,
      windowSize: 2,
      stepSize: 1,
      isDataMiningColumn: false
    };
    expect(parseSettings.translateColumnInfoToColumnInfoTSC(test)).toEqual(key);
  });
  it("should translate point column", async () => {
    const test = {
      ...basicColumn,
      columnDisplayType: "Point",
      name: "Long-Term Phanerozoic",
      editName: "Long-Term Phanerozoic",
      columnSpecificSettings: {
        drawLine: true,
        lineColor: {
          r: 0,
          g: 0,
          b: 0
        },
        smoothed: true,
        drawFill: true,
        fill: {
          r: 64,
          g: 233,
          b: 191
        },
        lowerRange: -150,
        upperRange: 280,
        drawScale: true,
        drawBackgroundGradient: false,
        backgroundGradientStart: {
          r: 0,
          g: 0,
          b: 0
        },
        backgroundGradientEnd: {
          r: 255,
          g: 255,
          b: 255
        },
        drawCurveGradient: false,
        curveGradientStart: {
          r: 0,
          g: 0,
          b: 0
        },
        curveGradientEnd: {
          r: 255,
          g: 255,
          b: 255
        },
        flipScale: false,
        scaleStart: 0,
        scaleStep: 1,
        pointShape: "nopoints",
        minX: -41,
        maxX: 277,
        windowSize: 2,
        stepSize: 1,
        dataMiningPointDataType: null,
        isDataMiningColumn: false
      }
    } as unknown as ColumnInfo;
    const key = {
      _id: "class datastore.PointColumn:Long-Term Phanerozoic",
      title: "Long-Term Phanerozoic",
      useNamedColor: false,
      placeHolder: false,
      drawTitle: true,
      drawAgeLabel: false,
      drawUncertaintyLabel: false,
      isSelected: true,
      width: 100,
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
      fonts: {},
      children: [],
      isDataMiningColumn: false,
      drawPoints: false,
      drawLine: true,
      lineColor: {
        r: 0,
        g: 0,
        b: 0
      },
      drawSmooth: true,
      drawFill: true,
      fillColor: {
        r: 64,
        g: 233,
        b: 191
      },
      doNotSetWindowAuto: false,
      minWindow: -150,
      maxWindow: 280,
      drawScale: true,
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
      scaleStep: 1,
      pointType: "rect",
      drawExtraColumn: null,
      windowSize: 2,
      stepSize: 1
    };
    expect(parseSettings.translateColumnInfoToColumnInfoTSC(test)).toEqual(key);
  });
  const defaultEventSettings = {
    type: "events",
    rangeSort: "first occurrence",
    frequency: null,
    stepSize: 1,
    windowSize: 2,
    isDataMiningColumn: false
  };
  const defaultPointSettings = {
    drawLine: true,
    lineColor: {
      r: 0,
      g: 0,
      b: 0
    },
    smoothed: true,
    drawFill: true,
    fill: {
      r: 64,
      g: 233,
      b: 191
    },
    lowerRange: 0,
    upperRange: 0,
    drawScale: true,
    drawBackgroundGradient: false,
    backgroundGradientStart: {
      r: 0,
      g: 0,
      b: 0
    },
    backgroundGradientEnd: {
      r: 255,
      g: 255,
      b: 255
    },
    drawCurveGradient: false,
    curveGradientStart: {
      r: 0,
      g: 0,
      b: 0
    },
    curveGradientEnd: {
      r: 255,
      g: 255,
      b: 255
    },
    flipScale: false,
    scaleStart: 0,
    scaleStep: 0,
    pointShape: "rect",
    minX: Number.MAX_SAFE_INTEGER,
    maxX: Number.MIN_SAFE_INTEGER,
    windowSize: 2,
    stepSize: 1,
    dataMiningPointDataType: null,
    isDataMiningColumn: false
  };
  test.each([
    [basicColumn.name, basicColumn.columnDisplayType, "class datastore.RootColumn:Chart Root", basicColumn],
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
      { ...basicColumn, columnDisplayType: "Chron" }
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
  const mock = jest.spyOn(parseSettings, "generateFontsXml");
  it("should generate basic column xml", async () => {
    mock.mockReturnValue("");
    const test = {
      _id: "class datastore.RootColumn:Chart Root",
      title: "Chart Root",
      useNamedColor: false,
      placeHolder: false,
      drawTitle: true,
      drawAgeLabel: false,
      drawUncertaintyLabel: false,
      isSelected: true,
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
      fonts: {},
      children: [],
      width: 100
    } as unknown as ColumnInfoTSC;
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
    expect(parseSettings.columnInfoTSCToXml(test, "    ")).toEqual(key);
  });
  it("should generate event column xml", async () => {
    mock.mockReturnValue("");
    const test = {
      _id: "class datastore.EventColumn:Events (Venusian)",
      title: "Events (Venusian)",
      useNamedColor: false,
      placeHolder: false,
      drawTitle: false,
      drawAgeLabel: false,
      drawUncertaintyLabel: false,
      isSelected: false,
      width: 150,
      pad: 0.2,
      "age pad": 2,
      backgroundColor: {
        text: {
          r: 224,
          g: 232,
          b: 239
        }
      },
      customColor: {
        text: {
          r: 224,
          g: 232,
          b: 239
        }
      },
      fonts: {},
      children: [],
      type: "events",
      rangeSort: "first occurrence",
      drawExtraColumn: null,
      windowSize: 2,
      stepSize: 1,
      isDataMiningColumn: false
    } as unknown as ColumnInfoTSC;
    const key =
      `    <setting name="title">Events (Venusian)</setting>\n` +
      `    <setting name="useNamedColor">false</setting>\n` +
      `    <setting name="placeHolder">false</setting>\n` +
      `    <setting name="drawTitle">false</setting>\n` +
      `    <setting name="drawAgeLabel">false</setting>\n` +
      `    <setting name="drawUncertaintyLabel">false</setting>\n` +
      `    <setting name="isSelected">false</setting>\n` +
      `    <setting name="width">150</setting>\n` +
      `    <setting name="pad">0.2</setting>\n` +
      `    <setting name="age pad">2</setting>\n` +
      `    <setting name="backgroundColor" useNamed="false">rgb(224,232,239)</setting>\n` +
      `    <setting name="customColor" useNamed="false">rgb(224,232,239)</setting>\n` +
      `    <fonts>\n` +
      `    </fonts>\n` +
      `    <setting name="type">events</setting>\n` +
      `    <setting name="rangeSort">first occurrence</setting>\n` +
      `    <setting name="windowSize">2</setting>\n` +
      `    <setting name="stepSize">1</setting>\n`;
    expect(parseSettings.columnInfoTSCToXml(test, "    ")).toEqual(key);
  });
  it("should generate point column xml", async () => {
    mock.mockReturnValue("");
    const test = {
      _id: "class datastore.PointColumn:Long-Term Phanerozoic",
      title: "Long-Term Phanerozoic",
      useNamedColor: false,
      placeHolder: false,
      drawTitle: true,
      drawAgeLabel: false,
      drawUncertaintyLabel: false,
      isSelected: false,
      width: 100,
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
      fonts: {},
      children: [],
      isDataMiningColumn: false,
      drawPoints: false,
      drawLine: true,
      lineColor: {
        r: 0,
        g: 0,
        b: 0
      },
      drawSmooth: true,
      drawFill: true,
      fillColor: {
        r: 64,
        g: 233,
        b: 191
      },
      doNotSetWindowAuto: true,
      minWindow: -150,
      maxWindow: 280,
      drawScale: true,
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
      scaleStep: 1,
      pointType: "rect",
      drawExtraColumn: null,
      windowSize: 2,
      stepSize: 1
    } as unknown as ColumnInfoTSC;
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
      `    <setting name="doNotSetWindowAuto">true</setting>\n` +
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
    expect(parseSettings.columnInfoTSCToXml(test, "    ")).toEqual(key);
  });
});

describe("json to xml", () => {
  const mock1 = jest.spyOn(parseSettings, "generateSettingsXml");
  const mock2 = jest.spyOn(parseSettings, "columnInfoTSCToXml");
  const mock3 = jest.spyOn(parseSettings, "columnInfoToSettingsTSC");
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
