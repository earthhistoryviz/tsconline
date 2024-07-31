import {
  ChartSettingsInfoTSC,
  ChronColumnInfoTSC,
  ChronSettings,
  ColumnBasicInfoTSC,
  DataMiningSettings,
  EventColumnInfoTSC,
  EventSettings,
  FontsInfo,
  Point,
  PointColumnInfoTSC,
  PointSettings,
  RangeColumnInfoTSC,
  RangeSettings,
  RulerColumnInfoTSC,
  SequenceColumnInfoTSC,
  SequenceSettings,
  ValidFontOptions,
  ZoneColumnInfoTSC,
  ZoneSettings
} from "./index";

export const allColumnTypes = [
  "Block",
  "Facies",
  "Event",
  "Range",
  "Chron",
  "Freehand",
  "Point",
  "Sequence",
  "Blank",
  "Transect",
  "Trend"
];

export const validDateFormats = [
  "YYYY-MM-DD",
  "YYYY-MM",
  "YYYY",
  "MM-DD-YYYY",
  "MM-DD-YY",
  "MM-DD",
  "MM-YYYY",
  "MM",
  "DD-MM-YYYY",
  "DD-MM",
  "DD-YYYY",
  "DD",
  "YYYY/MM/DD",
  "YYYY/MM",
  "MM/DD/YYYY",
  "MM/DD",
  "DD/MM/YYYY",
  "DD/MM"
];

export const defaultDataMiningSettings: DataMiningSettings = {
  windowSize: 2,
  stepSize: 1
};

export const defaultEventSettings: EventSettings = {
  type: "events",
  rangeSort: "first occurrence",
  frequency: null,
  ...defaultDataMiningSettings
};
export const defaultChronSettings: ChronSettings = {
  dataMiningChronDataType: null,
  ...defaultDataMiningSettings
};

export const allFontOptions: ValidFontOptions[] = [
  "Column Header",
  "Age Label",
  "Uncertainty Label",
  "Zone Column Label",
  "Sequence Column Label",
  "Event Column Label",
  "Popup Body",
  "Ruler Label",
  "Point Column Scale Label",
  "Range Label",
  "Ruler Tick Mark Label",
  "Legend Title",
  "Legend Column Name",
  "Legend Column Source",
  "Range Box Label"
];

export const defaultFontsInfoConstant: FontsInfo = {
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

export const defaultChartSettingsInfoTSC: ChartSettingsInfoTSC = {
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
};

export const defaultColumnBasicInfoTSC: ColumnBasicInfoTSC = {
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
  fonts: defaultFontsInfoConstant,
  children: []
};

export const defaultEventColumnInfoTSC: EventColumnInfoTSC = {
  ...defaultColumnBasicInfoTSC,
  width: 150,
  isSelected: false,
  type: "events",
  rangeSort: "first occurrence",
  drawExtraColumn: null,
  windowSize: 2,
  stepSize: 1
};

export const defaultChronColumnInfoTSC: ChronColumnInfoTSC = {
  ...defaultColumnBasicInfoTSC,
  windowSize: 2,
  stepSize: 1,
  drawExtraColumn: null
};

export const defaultZoneColumnInfoTSC: ZoneColumnInfoTSC = {
  ...defaultColumnBasicInfoTSC,
  crunchOuterMargin: 5,
  crunchInnerMargin: 1,
  crunchAscendWidth: 4,
  crunchOneSideSpaceUse: 10,
  autoFlip: false,
  orientation: "normal"
};

export const defaultSequenceColumnInfoTSC: SequenceColumnInfoTSC = {
  ...defaultColumnBasicInfoTSC,
  type: "sequence",
  labelMarginLeft: 5,
  labelMarginRight: 5,
  graphStyle: "",
  drawNameLabel: false
};

export const defaultRangeColumnInfoTSC: RangeColumnInfoTSC = {
  ...defaultColumnBasicInfoTSC,
  rangeSort: "first occurrence"
};

export const defaultRulerColumnInfoTSC: RulerColumnInfoTSC = {
  ...defaultColumnBasicInfoTSC,
  justification: "right"
};

export const defaultPointColumnInfoTSC: PointColumnInfoTSC = {
  ...defaultColumnBasicInfoTSC,
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
};

export const defaultPointSettings: PointSettings = {
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
  dataMiningPointDataType: null,
  isDataMiningColumn: false,
  ...defaultDataMiningSettings
};

export const defaultPoint: Partial<Point> = {
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
  scaleStep: 1
};

export const defaultRangeSettings: RangeSettings = {
  margin: 0.2,
  rangeSort: "first occurrence",
  agePad: 2
};

export const defaultSequenceSettings: SequenceSettings = {
  labelMarginLeft: 5,
  labelMarginRight: 5,
  graphStyle: "",
  drawNameLabel: true,
  type: "sequence"
};

export const defaultZoneSettings: ZoneSettings = {
  orientation: "normal"
};
