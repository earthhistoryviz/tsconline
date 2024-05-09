import {
  ChartSettingsInfoTSC,
  ColumnBasicInfoTSC,
  EventColumnInfoTSC,
  EventSettings,
  FontsInfo,
  Point,
  PointColumnInfoTSC,
  PointSettings,
  RangeColumnInfoTSC,
  RulerColumnInfoTSC,
  SequenceColumnInfoTSC,
  ValidFontOptions,
  ZoneColumnInfoTSC
} from "./index";

export const defaultEventSettings: EventSettings = {
  type: "events",
  rangeSort: "first occurrence"
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
  "Age Label": {
    on: false,
    bold: false,
    color: "rgb(0, 0, 0)",
    fontFace: "Arial",
    inheritable: false,
    italic: false,
    size: 6
  },
  "Column Header": {
    on: false,
    bold: false,
    color: "rgb(0, 0, 0)",
    fontFace: "Arial",
    inheritable: false,
    italic: false,
    size: 14
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
  "Legend Title": {
    on: false,
    bold: true,
    color: "rgb(0, 0, 0)",
    fontFace: "Verdana",
    inheritable: false,
    italic: false,
    size: 14
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
  "Popup Body": {
    on: false,
    bold: false,
    color: "rgb(0, 0, 0)",
    fontFace: "Arial",
    inheritable: false,
    italic: false,
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
  "Ruler Label": {
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
  "Sequence Column Label": {
    on: false,
    bold: false,
    color: "rgb(0, 0, 0)",
    fontFace: "Arial",
    inheritable: false,
    italic: false,
    size: 12
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
  rangeSort: "first occurrence"
};

export const defaultZoneColumnInfoTSC: ZoneColumnInfoTSC = {
  ...defaultColumnBasicInfoTSC,
  crunchOuterMargin: 0,
  crunchInnerMargin: 0,
  crunchAscendWidth: 0,
  crunchOneSideSpaceUse: 0,
  autoFlip: false,
  orientation: "normal"
};

export const defaultSequenceColumnInfoTSC: SequenceColumnInfoTSC = {
  ...defaultColumnBasicInfoTSC,
  type: "",
  labelMarginLeft: 0,
  labelMarginRight: 0,
  graphStyle: "",
  drawNameLabel: false
};

export const defaultRangeColumnInfoTSC: RangeColumnInfoTSC = {
  ...defaultColumnBasicInfoTSC,
  rangeSort: "first occurrence"
};

export const defaultRulerColumnInfoTSC: RulerColumnInfoTSC = {
  ...defaultColumnBasicInfoTSC,
  justification: "left"
};

export const defaultPointColumnInfoTSC: PointColumnInfoTSC = {
  ...defaultColumnBasicInfoTSC,
  drawPoints: false,
  drawLine: false,
  lineColor: "",
  drawSmooth: false,
  drawFill: false,
  fillColor: "",
  doNotSetWindowAuto: false,
  minWindow: 0,
  maxWindow: 0,
  drawScale: false,
  drawBgrndGradient: false,
  backGradStart: "",
  backGradEnd: "",
  drawCurveGradient: false,
  curveGradStart: "",
  curveGradEnd: "",
  flipScale: false,
  scaleStart: 0,
  scaleStep: 0,
  pointType: "rect"
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
  fillColor: {
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
  pointShape: "rect"
};

export const defaultPoint: Partial<Point> ={
  subPointInfo: [],
  lowerRange: 0,
  upperRange: 0,
  smoothed: false,
  drawLine: false,
  pointShape: "rect",
  drawFill: true,
  fill: {
    r: 255,
    g: 255,
    b: 255
  },
  minX: Number.MAX_SAFE_INTEGER,
  maxX: Number.MIN_SAFE_INTEGER,
}