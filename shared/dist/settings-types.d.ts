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
export type ColumnInfoTSC = {
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
        standardized?: boolean;
        useNamed?: boolean;
        text: string;
    };
    customColor: {
        standardized?: boolean;
        useNamed?: boolean;
        text: string;
    };
    fonts?: FontsInfo;
    crunchOuterMargin?: number;
    crunchInnerMargin?: number;
    crunchAscendWidth?: number;
    crunchOneSideSpaceUse?: number;
    autoFlip?: boolean;
    orientation?: "vertical" | "normal";
    type?: string;
    rangeSort?: string;
    justification?: "left" | "right";
    labelMarginLeft?: number;
    labelMarginRight?: number;
    graphStyle?: string;
    drawNameLabel?: boolean;
    drawPoints?: boolean;
    drawLine?: boolean;
    lineColor?: string;
    drawSmooth?: boolean;
    drawFill?: boolean;
    fillColor?: string;
    doNotSetWindowAuto?: boolean;
    minWindow?: number;
    maxWindow?: number;
    drawScale?: boolean;
    drawBgrndGradient?: boolean;
    backGradStart?: string;
    backGradEnd?: string;
    drawCurveGradient?: boolean;
    curveGradStart?: string;
    curveGradEnd?: string;
    flipScale?: boolean;
    scaleStart?: number;
    scaleStep?: number;
    pointType?: "rect" | "round" | "tick";
    children?: ColumnInfoTSC[];
};
export declare function assertChartInfoTSC(o: any): asserts o is ChartInfoTSC;
export declare function assertChartSettingsInfoTSC(o: any): asserts o is ChartSettingsInfoTSC;
export declare function assertColumnInfoTSC(o: any): asserts o is ColumnInfoTSC;
