import { ColumnHeaderProps, DisplayedColumnTypes, RGB, ValidFontOptions } from "./index.js";
import { allFontOptions } from "./constants.js";
export function roundToDecimalPlace(value: number, decimalPlace: number) {
  const factor = Math.pow(10, decimalPlace);
  return Math.round(value * factor) / factor;
}

export function calculateAutoScale(min: number, max: number) {
  const margin = 0.1;
  const outerMargin = ((max - min) * margin) / 2;
  const lowerRange = roundToDecimalPlace(min - outerMargin, 3);
  const upperRange = roundToDecimalPlace(max + outerMargin, 3);
  const scaleStep = roundToDecimalPlace((upperRange - lowerRange) * 0.2, 3);
  const scaleStart = 0;
  return { lowerRange, upperRange, scaleStep, scaleStart };
}

export function createDefaultColumnHeaderProps(overrides: Partial<ColumnHeaderProps> = {}): ColumnHeaderProps {
  const defaultRGB: RGB = { r: 255, g: 255, b: 255 };
  const defaultProps: ColumnHeaderProps = {
    name: "",
    minAge: Number.MAX_VALUE,
    maxAge: Number.MIN_VALUE,
    enableTitle: true,
    on: true,
    width: 100,
    popup: "",
    rgb: defaultRGB
  };

  return { ...defaultProps, ...overrides };
}

export function getValidFontOptions(type: DisplayedColumnTypes): ValidFontOptions[] {
  switch (type) {
    case "Block":
    case "Zone":
      return ["Column Header", "Age Label", "Zone Column Label"];
    case "Chron":
      return ["Column Header", "Age Label"];
    case "Event":
      return ["Column Header", "Age Label", "Event Column Label", "Uncertainty Label", "Range Label"];
    case "Facies":
      return ["Column Header", "Age Label", "Uncertainty Label"];
    case "Point":
      return ["Column Header", "Point Column Scale Label"];
    case "Range":
      return [...allFontOptions];
    case "Sequence":
      return ["Column Header", "Age Label", "Sequence Column Label"];
    case "Ruler":
    case "AgeAge":
      return ["Column Header", "Ruler Label"];
    case "Transect":
      return ["Column Header"];
    case "Freehand":
      return ["Column Header"];
    default:
      return ["Column Header"];
  }
}
