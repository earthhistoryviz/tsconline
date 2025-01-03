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
