import {
  DataMiningChronDataType,
  DataMiningPointDataType,
  EventFrequency,
  EventType,
  FontsInfo,
  PointShape,
  RGB,
  RangeSort,
  assertFontsInfo,
  assertRGB,
  isDataMiningChronDataType,
  isDataMiningPointDataType,
  isEventFrequency,
  isEventType,
  isRangeSort,
  throwError
} from "./index.js";

export type ChartInfoTSC = {
  settings: ChartSettingsInfoTSC;
  "class datastore.RootColumn:Chart Root": ColumnInfoTSC;
};

export type ChartSettingsInfoTSC = {
  topAge: {
    source: string;
    unit: string;
    stage?: string;
    text?: number;
  }[];
  baseAge: {
    source: string;
    unit: string;
    stage?: string;
    text?: number;
  }[];
  unitsPerMY: {
    unit: string;
    text: number;
  }[];
  skipEmptyColumns: {
    unit: string;
    text: boolean;
  }[];
  variableColors: string;
  noIndentPattern: boolean;
  negativeChk: boolean;
  doPopups: boolean;
  enEventColBG: boolean;
  enChartLegend: boolean;
  enPriority: boolean;
  enHideBlockLable: boolean;
};

export type ColumnInfoTSC =
  | ColumnBasicInfoTSC
  | ZoneColumnInfoTSC
  | EventColumnInfoTSC
  | SequenceColumnInfoTSC
  | RangeColumnInfoTSC
  | PointColumnInfoTSC
  | RulerColumnInfoTSC
  | ChronColumnInfoTSC;

export type ChronColumnInfoTSC = {
  drawExtraColumn: DataMiningChronDataType | null;
  windowSize: number;
  stepSize: number;
} & ColumnBasicInfoTSC;

export type ColumnBasicInfoTSC = {
  _id: string;
  title: string;
  useNamedColor: boolean;
  placeHolder: boolean;
  drawTitle: boolean;
  drawAgeLabel: boolean;
  drawUncertaintyLabel: boolean;
  isSelected: boolean;
  width: number | undefined;
  pad: number;
  "age pad": number;
  backgroundColor: {
    standardized?: boolean;
    useNamed?: boolean;
    text?: RGB;
  };
  customColor: {
    standardized?: boolean;
    useNamed?: boolean;
    text?: RGB;
  };
  fonts: FontsInfo;
  children: ColumnInfoTSC[];
};

export type EventColumnInfoTSC = ColumnBasicInfoTSC & {
  type: EventType;
  rangeSort: RangeSort;
  windowSize: number;
  stepSize: number;
  drawExtraColumn: EventFrequency | null;
};

export type ZoneColumnInfoTSC = ColumnBasicInfoTSC & {
  crunchOuterMargin: number;
  crunchInnerMargin: number;
  crunchAscendWidth: number;
  crunchOneSideSpaceUse: number;
  autoFlip: boolean;
  orientation: "vertical" | "normal";
};

export type SequenceColumnInfoTSC = ColumnBasicInfoTSC & {
  type: "trend" | "sequence";
  labelMarginLeft: number;
  labelMarginRight: number;
  graphStyle: string;
  drawNameLabel: boolean;
};

export type RangeColumnInfoTSC = ColumnBasicInfoTSC & {
  rangeSort: string;
};

export type RulerColumnInfoTSC = ColumnBasicInfoTSC & {
  justification: "left" | "right";
};

export type PointColumnInfoTSC = ColumnBasicInfoTSC & {
  drawPoints: boolean;
  drawLine: boolean;
  lineColor: RGB;
  drawSmooth: boolean;
  drawFill: boolean;
  fillColor: RGB;
  doNotSetWindowAuto: boolean;
  minWindow: number;
  maxWindow: number;
  drawScale: boolean;
  drawBgrndGradient: boolean;
  backGradStart: RGB;
  backGradEnd: RGB;
  drawCurveGradient: boolean;
  curveGradStart: RGB;
  curveGradEnd: RGB;
  flipScale: boolean;
  scaleStart: number;
  scaleStep: number;
  pointType: "rect" | "round" | "tick";
  drawExtraColumn: DataMiningPointDataType | null;
  windowSize: number;
  stepSize: number;
  isDataMiningColumn: boolean;
};

export function convertPointTypeToPointShape(type: "rect" | "round" | "tick"): PointShape {
  switch (type) {
    case "round":
      return "circle";
    case "tick":
      return "cross";
    default:
      return "rect";
  }
}

export function convertPointShapeToPointType(shape: PointShape): "rect" | "round" | "tick" {
  switch (shape) {
    case "circle":
      return "round";
    case "cross":
      return "tick";
    default:
      return "rect";
  }
}

export function assertChartInfoTSC(o: any): asserts o is ChartInfoTSC {
  if (!o || typeof o !== "object") throw new Error("ChartInfoTSC must be a non-null object");
  if (!o["class datastore.RootColumn:Chart Root"]) throw new Error("ChartInfoTSC must have a Chart Root");
  assertColumnInfoTSC(o["class datastore.RootColumn:Chart Root"]);
}

export function assertChronColumnInfoTSC(o: any): asserts o is ChronColumnInfoTSC {
  if (
    o.drawExtraColumn != null &&
    (typeof o.drawExtraColumn !== "string" || !isDataMiningChronDataType(o.drawExtraColumn))
  )
    throwError("ChronColumnInfoTSC", "drawExtraColumn", "string", o.drawExtraColumn);
  if (typeof o.windowSize !== "number") throwError("ChronColumnInfoTSC", "windowSize", "number", o.windowSize);
  if (typeof o.stepSize !== "number") throwError("ChronColumnInfoTSC", "stepSize", "number", o.step);
  assertColumnBasicInfoTSC(o);
}

export function assertChartSettingsInfoTSC(o: any): asserts o is ChartSettingsInfoTSC {
  if (!o || typeof o !== "object") throw new Error("ChartSettingsInfoTSC must be a non-null object");
  if (!Array.isArray(o.topAge)) throw new Error("ChartSettingsTSC must have a topAge array");
  for (const item of o.topAge) {
    if (typeof item.source !== "string") throwError("topAge", "source", "string", item.source);
    if (typeof item.unit !== "string") throwError("topAge", "unit", "string", item.unit);
    if (!("stage" in item) && !("text" in item))
      throw new Error("ChartSettingsInfoTSC topAge must have either stage or text or both");
    if ("stage" in item && typeof item.stage !== "string") throwError("topAge stage", "stage", "string", item.stage);
    if ("text" in item && typeof item.text !== "number") throwError("topAge", "text", "number", item.text);
  }
  if (!Array.isArray(o.baseAge)) throw new Error("ChartSettingsTSC must have a baseAge array");
  for (const item of o.baseAge) {
    if (typeof item.source !== "string") throwError("baseAge", "source", "string", item.source);
    if (typeof item.unit !== "string") throwError("baseAge", "unit", "string", item.unit);
    if (!("stage" in item) && !("text" in item))
      throw new Error("ChartSettingsInfoTSC baseAge must have either stage or text or both");
    if ("stage" in item && typeof item.stage !== "string") throwError("topAge stage", "stage", "string", item.stage);
    if ("text" in item && typeof item.text !== "number") throwError("topAge", "text", "number", item.text);
  }
  if (!Array.isArray(o.unitsPerMY)) throw new Error("ChartSettingsTSC must have a unitsPerMY array");
  for (const item of o.unitsPerMY) {
    if (typeof item.unit !== "string") throwError("unitsPerMY", "unit", "string", item.unit);
    if (typeof item.text !== "number") throwError("unitsPerMY", "text", "number", item.text);
  }
  if (!Array.isArray(o.skipEmptyColumns)) throw new Error("ChartSettingsTSC must have a skipEmptyColumns array");
  for (const item of o.skipEmptyColumns) {
    if (typeof item.unit !== "string") throwError("skipEmptyColumns", "unit", "string", item.unit);
    if (typeof item.text !== "boolean") throwError("skipEmptyColumns", "text", "boolean", item.text);
  }
  if (typeof o.variableColors !== "string")
    throwError("ColumnSettingsInfoTSC", "variableColors", "string", o.variableColors);
  if (typeof o.noIndentPattern !== "boolean")
    throwError("ColumnSettingsInfoTSC", "noIndentPattern", "boolean", o.noIndentPattern);
  if (typeof o.negativeChk !== "boolean") throwError("ColumnSettingsInfoTSC", "negativeChk", "boolean", o.negativeChk);
  if (typeof o.doPopups !== "boolean") throwError("ColumnSettingsInfoTSC", "doPopups", "boolean", o.doPopups);
  if (typeof o.enEventColBG !== "boolean")
    throwError("ColumnSettingsInfoTSC", "enEventColBG", "boolean", o.enEventColBG);
  if (typeof o.enChartLegend !== "boolean")
    throwError("ColumnSettingsInfoTSC", "enChartLegend", "boolean", o.enChartLegend);
  if (typeof o.enPriority !== "boolean") throwError("ColumnSettingsInfoTSC", "enPriority", "boolean", o.enPriority);
  if (typeof o.enHideBlockLable !== "boolean")
    throwError("ColumnSettingsInfoTSC", "enHideBlockLable", "boolean", o.enHideBlockLable);
}

export function assertZoneColumnInfoTSC(o: any): asserts o is ZoneColumnInfoTSC {
  if (typeof o.crunchOuterMargin !== "number")
    throwError("ZoneColumnInfoTSC", "crunchOuterMargin", "number", o.crunchOuterMargin);
  if (typeof o.crunchInnerMargin !== "number")
    throwError("ZoneColumnInfoTSC", "crunchInnerMargin", "number", o.crunchInnerMargin);
  if (typeof o.crunchAscendWidth !== "number")
    throwError("ZoneColumnInfoTSC", "CrunchAscendWidth", "number", o.CrunchAscendWidth);
  if (typeof o.crunchOneSideSpaceUse !== "number")
    throwError("ZoneColumnInfoTSC", "crunchOneSideSpaceUse", "number", o.crunchOneSideSpaceUse);
  if (typeof o.autoFlip !== "boolean") throwError("ZoneColumnInfoTSC", "autoFlip", "boolean", o.autoFlip);
  if (o.orientation !== "vertical" && o.orientation !== "normal")
    throwError("ZoneColumnInfoTSC", "orientation", "vertical or normal", o.orientation);
  assertColumnBasicInfoTSC(o);
}

export function assertEventColumnInfoTSC(o: any): asserts o is EventColumnInfoTSC {
  if (typeof o.type !== "string" || !isEventType(o.type)) throwError("EventColumnInfoTSC", "type", "string", o.type);
  if (typeof o.rangeSort !== "string" || !isRangeSort(o.rangeSort))
    throwError("EventColumnInfoTSC", "rangeSort", "string", o.rangeSort);
  if (typeof o.windowSize !== "number") throwError("EventColumnInfoTSC", "windowSize", "number", o.windowSize);
  if (typeof o.stepSize !== "number") throwError("EventColumnInfoTSC", "stepSize", "number", o.stepSize);
  if (
    o.drawExtraColumn != null &&
    (typeof o.drawExtraColumn !== "string" || !isEventFrequency(o.drawExtraColumn) || o.drawExtraColumn !== "OVERLAY")
  )
    throwError("EventColumnInfoTSC", "drawExtraColumn", "string", o.drawExtraColumn);
  assertColumnBasicInfoTSC(o);
}
export function assertSequenceColumnInfoTSC(o: any): asserts o is SequenceColumnInfoTSC {
  if (o.type !== "trend" && o.type !== "sequence")
    throwError("SequenceColumnInfoTSC", "type", "trend or sequence", o.type);
  if (typeof o.labelMarginLeft !== "number")
    throwError("SequenceColumnInfoTSC", "labelMarginLeft", "number", o.labelMarginLeft);
  if (typeof o.labelMarginRight !== "number")
    throwError("SequenceColumnInfoTSC", "labelMarginRight", "number", o.labelMarginRight);
  if (typeof o.graphStyle !== "string") throwError("SequenceColumnInfoTSC", "graphStype", "string", o.graphStyle);
  if (typeof o.drawNameLabel !== "boolean")
    throwError("SequenceColumnInfoTSC", "drawNameLabel", "boolean", o.drawNameLabel);
  assertColumnBasicInfoTSC(o);
}

export function assertRangeColumnInfoTSC(o: any): asserts o is RangeColumnInfoTSC {
  if (typeof o.rangeSort !== "string") throwError("RangeColumnInfoTSC", "rangeSort", "string", o.rangeSort);
  assertColumnBasicInfoTSC(o);
}

export function assertRulerColumnInfoTSC(o: any): asserts o is RulerColumnInfoTSC {
  if (o.justification !== "left" && o.justification !== "right")
    throwError("RulerColumnInfoTSC", "justification", "left or right", o.justification);
  assertColumnBasicInfoTSC(o);
}

export function assertPointColumnInfoTSC(o: any): asserts o is PointColumnInfoTSC {
  if (typeof o.drawPoints !== "boolean") throwError("PointColumnInfoTSC", "drawPoints", "boolean", o.drawPoints);
  if (typeof o.drawLine !== "boolean") throwError("PointColumnInfoTSC", "drawLine", "boolean", o.drawLine);
  assertRGB(o.lineColor);
  if (typeof o.drawSmooth !== "boolean") throwError("PointColumnInfoTSC", "drawSmooth", "boolean", o.drawSmooth);
  if (typeof o.drawFill !== "boolean") throwError("PointColumnInfoTSC", "drawFill", "boolean", o.drawFill);
  assertRGB(o.fillColor);
  if (typeof o.doNotSetWindowAuto !== "boolean")
    throwError("PointColumnInfoTSC", "doNotSetWindowAuto", "boolean", o.doNotSetWindowAuto);
  if (typeof o.minWindow !== "number") throwError("PointColumnInfoTSC", "minWindow", "number", o.minWindow);
  if (typeof o.maxWindow !== "number") throwError("PointColumnInfoTSC", "maxWindow", "number", o.maxWindow);
  if (typeof o.drawScale !== "boolean") throwError("PointColumnInfoTSC", "drawScale", "boolean", o.drawScale);
  if (typeof o.drawBgrndGradient !== "boolean")
    throwError("PointColumnInfoTSC", "drawBgrndGradient", "boolean", o.drawBgrndGradient);
  assertRGB(o.backGradStart);
  assertRGB(o.backGradEnd);
  if (typeof o.drawCurveGradient !== "boolean")
    throwError("PointColumnInfoTSC", "drawCurveGradient", "boolean", o.drawCurveGradient);
  assertRGB(o.curveGradStart);
  assertRGB(o.curveGradEnd);
  if (typeof o.flipScale !== "boolean") throwError("PointColumnInfoTSC", "flipScale", "boolean", o.flipScale);
  if (typeof o.scaleStart !== "number") throwError("PointColumnInfoTSC", "scaleStart", "number", o.scaleStart);
  if (typeof o.scaleStep !== "number") throwError("PointColumnInfoTSC", "scaleStep", "number", o.scaleStep);
  if (o.pointType !== "rect" && o.pointType !== "round" && o.pointType !== "tick")
    throwError("ColumnInfoTSC", "pointType", "rect or round or tick", o.pointType);
  if (
    o.drawExtraColumn != null &&
    (typeof o.drawExtraColumn !== "string" || !isDataMiningPointDataType(o.drawExtraColumn))
  )
    throwError("PointColumnInfoTSC", "drawExtraColumn", "string", o.drawExtraColumn);
  if (typeof o.windowSize !== "number") throwError("PointColumnInfoTSC", "windowSize", "number", o.windowSize);
  if (typeof o.stepSize !== "number") throwError("PointColumnInfoTSC", "stepSize", "number", o.stepSize);
  if (typeof o.isDataMiningColumn !== "boolean")
    throwError("PointColumnInfoTSC", "isDataMiningColumn", "boolean", o.isDataMiningColumn);
  assertColumnBasicInfoTSC(o);
}
export function assertColumnBasicInfoTSC(o: any): asserts o is ColumnBasicInfoTSC {
  if (typeof o.title !== "string") throwError("ColumnInfoTSC", "title", "string", o.title);
  if (typeof o.useNamedColor !== "boolean") throwError("ColumnInfoTSC", "useNamedColor", "boolean", o.useNamedColor);
  if (typeof o.placeHolder !== "boolean") throwError("ColumnInfoTSC", "placeHolder", "boolean", o.placeHolder);
  if (typeof o.drawTitle !== "boolean") throwError("ColumnInfoTSC", "drawTitle", "boolean", o.drawTitle);
  if (typeof o.drawAgeLabel !== "boolean") throwError("ColumnInfoTSC", "drawAgeLabel", "boolean", o.drawAgeLabel);
  if (typeof o.drawUncertaintyLabel !== "boolean")
    throwError("ColumnInfoTSC", "drawUncertaintlyLabel", "boolean", o.drawUncertaintyLabel);
  if (typeof o.isSelected !== "boolean") throwError("ColumnInfoTSC", "isSelected", "boolean", o.isSelected);
  if (typeof o.width !== "number" && typeof o.width !== "undefined")
    throwError("ColumnInfoTSC", "width", "number or undefined", o.width);
  if (typeof o.pad !== "number") throwError("ColumnInfoTSC", "pad", "number", o.pad);
  if (typeof o["age pad"] !== "number") throwError("ColumnInfoTSC", "age pad", "number", o["age pad"]);
  if (o.backgroundColor) {
    if ("standardized" in o.backgroundColor) {
      if (typeof o.backgroundColor.standardized !== "boolean")
        throwError("ColumnInfoTSC backgroundColor", "standardized", "boolean", o.backgroundColor.standardized);
    }
    if ("useNamed" in o.backgroundColor) {
      if (typeof o.backgroundColor.useNamed !== "boolean")
        throwError("ColumnInfoTSC backgroundColor", "useNamed", "boolean", o.backgroundColor.useNamed);
    }
    if ("text" in o.backgroundColor) {
      assertRGB(o.backgroundColor.text);
    }
  } else throw new Error("ColumnInfoTSC must have backgroundColor");
  if (o.customColor) {
    if ("standardized" in o.customColor) {
      if (typeof o.customColor.standardized !== "boolean")
        throwError("ColumnInfoTSC customColor", "standardized", "boolean", o.customColor.standardized);
    }
    if ("useNamed" in o.customColor) {
      if (typeof o.customColor.useNamed !== "boolean")
        throwError("ColumnInfoTSC customColor", "useNamed", "boolean", o.customColor.standardized);
    }
    assertRGB(o.customColor.text);
  } else throw new Error("ColumnInfoTSC must have customColor");
  assertFontsInfo(o.fonts);
}

export function assertColumnInfoTSC(o: any): asserts o is ColumnInfoTSC {
  if (!o || typeof o !== "object") throw new Error("ColumnInfoTSC must be a non-null object");
  if (typeof o._id !== "string") {
    throwError("ColumnInfoTSC", "_id", "string", o._id);
  } else {
    //check for specific column type since id has the column type in it
    const columnType = o._id.substring(o._id.indexOf(".") + 1, o._id.indexOf(":"));
    switch (columnType) {
      case "ZoneColumn":
        assertZoneColumnInfoTSC(o);
        break;
      case "EventColumn":
        assertEventColumnInfoTSC(o);
        break;
      case "SequenceColumn":
        assertSequenceColumnInfoTSC(o);
        break;
      case "RangeColumn":
        assertRangeColumnInfoTSC(o);
        break;
      case "RulerColumn":
        assertRulerColumnInfoTSC(o);
        break;
      case "PointColumn":
        assertPointColumnInfoTSC(o);
        break;
      //these just have the basic column InfoTSC props
      case "MetaColumn":
      case "FaciesColumn":
      case "BlockSeriesMetaColumn":
      case "ChronColumn":
      case "FreehandColumn":
      case "TransectColumn":
      case "RootColumn":
      case "BlankColumn":
        assertColumnBasicInfoTSC(o);
        break;
      default:
        console.log("Warning: unknown column type", columnType);
        assertColumnBasicInfoTSC(o);
    }
  }
  if ("children" in o) {
    //console.log(o.children.length)
    for (let i = 0; i < o.children.length; i++) {
      assertColumnInfoTSC(o.children[i]);
    }
  }
}
