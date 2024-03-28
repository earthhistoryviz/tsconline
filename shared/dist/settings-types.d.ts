import { FontsInfo } from "./index.js";
export type ChartInfoTSC = {
    settings?: ChartSettingsInfoTSC;
    "class datastore.RootColumn:Chart Root"?: ColumnInfoTSC;
};
export type ChartSettingsInfoTSC = {
    topAge: {
        source: string;
        unit: string;
        stage?: string;
        text?: number;
    };
    baseAge: {
        source: string;
        unit: string;
        stage?: string;
        text?: number;
    };
    unitsPerMY: {
        unit: string;
        text: number;
    };
    skipEmptyColumns: {
        unit: string;
        text: boolean;
    };
    variableColors: string;
    noIndentPattern: boolean;
    negativeChk: boolean;
    doPopups: boolean;
    enEventColBG: boolean;
    enChartLegend: boolean;
    enPriority: boolean;
    enHideBlockLable: boolean;
};
export type ColumnInfoTSC = ColumnBasicProps & (ZoneColumnInfo | EventColumnInfo | SequenceColumnInfo | RangeColumnInfo | RulerColumnInfo | PointColumnInfo);
export type ZoneColumnInfoTSC = ColumnBasicProps & ZoneColumnInfo;
export type EventColumnInfoTSC = ColumnBasicProps & EventColumnInfo;
export type RangeColumnInfoTSC = ColumnBasicProps & RangeColumnInfo;
export type SequenceColumnInfoTSC = ColumnBasicProps & RangeColumnInfo;
export type RulerColumnInfoTSC = ColumnBasicProps & RulerColumnInfo;
export type PointColumnInfoTSC = ColumnBasicProps & PointColumnInfo;
export type ColumnBasicProps = {
    _id: string;
    title: string;
    useNamedColor: boolean;
    placeHolder: boolean;
    drawTitle: boolean;
    drawAgeLabel: boolean;
    drawUncertaintyLabel: boolean;
    isSelected: boolean;
    width: number;
    pad: number;
    "age pad": number;
    backgroundColor: {
        standardized: boolean;
        useNamed: boolean;
        text: string;
    };
    customColor: {
        standardized: boolean;
        useNamed: boolean;
        text: string;
    };
    fonts: FontsInfo;
    children: ColumnInfoTSC[];
};
export type ZoneColumnInfo = {
    crunchOuterMargin: number;
    crunchInnerMargin: number;
    crunchAscendWidth: number;
    crunchOneSideSpaceUse: number;
    autoFlip: boolean;
    orientation: "vertical" | "normal";
};
export type EventColumnInfo = {
    type: string;
};
export type SequenceColumnInfo = {
    type: string;
    labelMarginLeft: number;
    labelMarginRight: number;
    graphStyle: string;
    drawNameLabel: boolean;
};
export type RangeColumnInfo = {
    rangeSort: string;
};
export type RulerColumnInfo = {
    justification: "left" | "right";
};
export type PointColumnInfo = {
    drawPoints: boolean;
    drawLine: boolean;
    lineColor: string;
    drawSmooth: boolean;
    drawFill: boolean;
    fillColor: string;
    doNotSetWindowAuto: boolean;
    minWindow: number;
    maxWindow: number;
    drawScale: boolean;
    drawBgrndGradient: boolean;
    backGradStart: string;
    backGradEnd: string;
    drawCurveGradient: boolean;
    curveGradStart: string;
    curveGradEnd: string;
    flipScale: boolean;
    scaleStart: number;
    scaleStep: number;
    pointType: "rect" | "round" | "tick";
};
export declare function assertChartInfoTSC(o: any): asserts o is ChartInfoTSC;
export declare function assertChartSettingsInfoTSC(o: any): asserts o is ChartSettingsInfoTSC;
export declare function assertZoneColumnInfo(o: any): void;
export declare function assertEventColumnInfo(o: any): void;
export declare function assertSequenceColumnInfo(o: any): void;
export declare function assertRangeColumnInfo(o: any): void;
export declare function assertRulerColumnInfo(o: any): void;
export declare function assertPointColumnInfo(o: any): void;
export declare function assertColumnInfoTSC(o: any): asserts o is ColumnInfoTSC;
