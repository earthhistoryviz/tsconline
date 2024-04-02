import {
  ChartSettingsInfoTSC,
  ColumnBasicInfoTSC,
  EventColumnInfoTSC,
  FontsInfo,
  PointColumnInfoTSC,
  RangeColumnInfoTSC,
  RulerColumnInfoTSC,
  SequenceColumnInfoTSC,
  ZoneColumnInfoTSC
} from "./index";

export const defaultFontsInfoConstant: FontsInfo = {
  "Age Label": {
    bold: false,
    color: "rgb(0, 0, 0)",
    fontFace: "Arial",
    inheritable: false,
    italic: false,
    size: 6
  },
  "Column Header": {
    bold: false,
    color: "rgb(0, 0, 0)",
    fontFace: "Arial",
    inheritable: false,
    italic: false,
    size: 14
  },
  "Event Column Label": {
    bold: false,
    color: "rgb(0, 0, 0)",
    fontFace: "Arial",
    inheritable: false,
    italic: false,
    size: 11
  },
  "Legend Column Name": {
    bold: true,
    color: "rgb(0, 0, 0)",
    fontFace: "Verdana",
    inheritable: false,
    italic: false,
    size: 12
  },
  "Legend Column Source": {
    bold: false,
    color: "rgb(0, 0, 0)",
    fontFace: "Verdana",
    inheritable: false,
    italic: true,
    size: 12
  },
  "Legend Title": {
    bold: true,
    color: "rgb(0, 0, 0)",
    fontFace: "Verdana",
    inheritable: false,
    italic: false,
    size: 14
  },
  "Point Column Scale Label": {
    bold: false,
    color: "rgb(0, 0, 0)",
    fontFace: "Arial",
    inheritable: false,
    italic: false,
    size: 6
  },
  "Popup Body": { bold: false, color: "rgb(0, 0, 0)", fontFace: "Arial", inheritable: false, italic: false, size: 12 },
  "Range Box Label": {
    bold: false,
    color: "rgb(0, 0, 0)",
    fontFace: "Arial",
    inheritable: false,
    italic: true,
    size: 14
  },
  "Range Label": { bold: false, color: "rgb(0, 0, 0)", fontFace: "Arial", inheritable: false, italic: false, size: 12 },
  "Ruler Label": { bold: false, color: "rgb(0, 0, 0)", fontFace: "Arial", inheritable: false, italic: false, size: 12 },
  "Ruler Tick Mark Label": {
    bold: false,
    color: "rgb(0, 0, 0)",
    fontFace: "Arial",
    inheritable: false,
    italic: false,
    size: 7
  },
  "Sequence Column Label": {
    bold: false,
    color: "rgb(0, 0, 0)",
    fontFace: "Arial",
    inheritable: false,
    italic: false,
    size: 12
  },
  "Uncertainty Label": {
    bold: false,
    color: "rgb(0, 0, 0)",
    fontFace: "Arial",
    inheritable: false,
    italic: true,
    size: 5
  },
  "Zone Column Label": {
    bold: false,
    color: "rgb(0, 0, 0)",
    fontFace: "Arial",
    inheritable: false,
    italic: false,
    size: 12
  }
};

export const defaultChartSettingsInfoTSC: ChartSettingsInfoTSC = {
  topAge: {
    source: "",
    unit: "",
    stage: undefined,
    text: undefined
  },
  baseAge: {
    source: "",
    unit: "",
    stage: undefined,
    text: undefined
  },
  unitsPerMY: {
    unit: "",
    text: 0
  },
  skipEmptyColumns: {
    unit: "",
    text: false
  },
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
  drawTitle: false,
  drawAgeLabel: false,
  drawUncertaintyLabel: false,
  isSelected: false,
  width: 0,
  pad: 0,
  "age pad": 0,
  backgroundColor: {
    text: ""
  },
  customColor: {
    text: ""
  },
  fonts: defaultFontsInfoConstant,
  children: []
};

export const defaultEventColumnInfoTSC: EventColumnInfoTSC = {
  ...defaultColumnBasicInfoTSC,
  type: ""
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
  rangeSort: ""
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
