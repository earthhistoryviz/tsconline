import { roundToDecimalPlace, calculateAutoScale } from "../src/util";
describe("roundToDecimalPlace tests", () => {
  test.each([
    [1.234567, 2, 1.23],
    [1.234567, 3, 1.235],
    [1.234567, 4, 1.2346],
    [1.234567, 5, 1.23457]
  ])("roundToDecimalPlace(%p, %p) should return %p", (value, decimalPlace, expected) => {
    const result = roundToDecimalPlace(value, decimalPlace);
    expect(result).toBe(expected);
  });
});

describe("calculateAutoScale tests", () => {
  test.each([
    [0, 10, { lowerRange: -0.5, upperRange: 10.5, scaleStep: 2.2 }],
    [0, 100, { lowerRange: -5, upperRange: 105, scaleStep: 22 }],
    [0, 1000, { lowerRange: -50, upperRange: 1050, scaleStep: 220 }],
    [0, 9, { lowerRange: -0.45, upperRange: 9.45, scaleStep: 1.98 }],
    [-8, 8, { lowerRange: -8.8, upperRange: 8.8, scaleStep: 3.52 }]
  ])("calculateAutoScale(%p, %p) should return %p", (min, max, expected) => {
    const result = calculateAutoScale(min, max);
    expect(result).toEqual(expected);
  });
});
