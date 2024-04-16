import {
  ChartSettingsInfoTSC,
  ColumnBasicInfoTSC,
  EventColumnInfoTSC,
  FontsInfo,
  PointColumnInfoTSC,
  RangeColumnInfoTSC,
  RulerColumnInfoTSC,
  SequenceColumnInfoTSC,
  ValidFontOptions,
  ZoneColumnInfoTSC
} from "./index";

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
  isSelected: false,
  width: 100,
  pad: 0.2,
  "age pad": 2,
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
  rangeSort: "first occurence"
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
