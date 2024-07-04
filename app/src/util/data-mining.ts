import { round } from "lodash";
import { DataMiningStatisticApproach, WindowStats } from "../types";
import { normalizeZero } from "./util";

/**
 * This function computes the statistics of a data set in a moving window.
 * assume data isn't sorted
 * @param data the data set, only considering the age of the data points (only one axis supported)
 * @param windows the number of windows
 * @param windowSize the size of the window
 * @param stat The statistic to compute in the window
 * @returns
 */
export function computeWindowStatistics(
  data: number[],
  windowSize: number,
  stepSize: number,
  stat: DataMiningStatisticApproach
): WindowStats[] {
  if (data.length === 0 || windowSize <= 0 || data.some((d) => isNaN(d))) {
    return [];
  }
  data = data.sort((a, b) => a - b);
  const firstDataPoint = data[0]!;
  const lastDataPoint = data[data.length - 1]!;
  const windows = Math.floor((lastDataPoint - firstDataPoint + 1) / stepSize);

  const results: WindowStats[] = [];
  let start = data[0]!; // inclusive
  let end = start + stepSize; // exclusive

  for (let i = 0; i < windows; i++) {
    // make sure to include the last value in the last window
    const window = data.filter((d) => d >= start && (d < end || (i === windows - 1 && d === end)));
    if (window.length === 0) {
      const val = stat == "maximum" || stat == "minimum" ? data.filter((d) => d >= start)[0]! : 0;
      results.push({ windowStart: start, windowEnd: end, value: val });
    } else {
      const firstWindowPoint = window[0]!;
      const lastWindowPoint = window[window.length - 1]!;
      let value = 0;
      switch (stat) {
        case "frequency":
          value = window.length;
          break;
        case "minimum": // @jacqui: Lmk if there's anycase rateOfChange is calculated through this function. If not then I think we can just remove it.
          value = Math.min(...window);
          break;
        case "maximum": // @jacqui: Lmk if there's anycase rateOfChange is calculated through this function. If not then I think we can just remove it.
          value = Math.max(...window);
          break;
        case "average": // @jacqui: Lmk if there's anycase rateOfChange is calculated through this function. If not then I think we can just remove it.
          value = window.reduce((a, b) => a + b, 0) / window.length;
          break;
        case "rateOfChange": // @jacqui: Lmk if there's anycase rateOfChange is calculated through this function. If not then I think we can just it. especially this one, bc the data only contains age, we are unable to apply the correct formula to calculate the correct rate of change.
          if (!firstWindowPoint) value = 0;
          else value = (lastWindowPoint - firstWindowPoint) / firstWindowPoint;
          break;
      }
      results.push({ windowStart: start, windowEnd: end, value: round(normalizeZero(value), 2) });
    }
    if (end > lastDataPoint) break;
    end = Math.min(end + stepSize, lastDataPoint);
    if (end - start > windowSize) {
      start = end - windowSize;
    } else if (end == lastDataPoint) {
      start += stepSize;
    }
  }
  return results;
}

type DataPoint = {
  age: number;
  value: number;
};

/**
 * computes the statistics of a data set in a moving window
 * considers age for windows and values for statistics
 * @param data dataset to compute statistics on (age, value)
 * @param windowSize size of the window
 * @param stat statistic to compute in the window
 * @returns window statistics (start, end, value)
 */
export function computeWindowStatisticsForDataPoints(
  data: DataPoint[],
  windowSize: number,
  stepSize: number,
  stat: DataMiningStatisticApproach
) {
  if (data.length === 0 || windowSize <= 0 || data.some((d) => isNaN(d.value) || isNaN(d.age))) {
    return [];
  }
  const firstDataPointAge = data[0]!.age;
  const lastDataPointAge = data[data.length - 1]!.age;
  const windows = Math.floor((lastDataPointAge - firstDataPointAge + 1) / stepSize);
  data = data.sort((a, b) => a.age - b.age);
  const results: WindowStats[] = [];
  let start = data[0]!.age;
  let end = start + stepSize;
  if (stat === "frequency")
    return computeWindowStatistics(
      data.map((d) => d.age),
      windowSize,
      stepSize,
      stat
    );
  for (let i = 0; i < windows; i++) {
    const window = data.filter((d) => d.age >= start && (d.age < end || (i === windows - 1 && d.age === end)));
    if (window.length === 0) {
      const val = stat == "maximum" || stat == "minimum" ? data.filter((d) => d.age >= start)[0]!.value : 0;
      results.push({ windowStart: start, windowEnd: end, value: val });
    } else {
      let value = 0;
      switch (stat) {
        case "minimum":
          value = Math.min(...window.map((d) => d.value));
          break;
        case "maximum":
          value = Math.max(...window.map((d) => d.value));
          break;
        case "average":
          value = window.reduce((a, b) => a + b.value, 0) / window.length;
          break;
        case "rateOfChange": {
          const sumAge = window.reduce((a, b) => a + b.age, 0);
          const sumAgeSquare = window.reduce((a, b) => a + Math.pow(b.age, 2), 0);
          const sumVal = window.reduce((a, b) => a + b.value, 0);
          const sumAgeVal = window.reduce((a, b) => a + b.age * b.value, 0);
          let slope = window.length * sumAgeVal - sumAge * sumVal;
          slope /= window.length * sumAgeSquare - Math.pow(sumAge, 2);
          value = isNaN(slope) ? 0 : slope;
          value = -value; //fixes the assumption that we're looking in the positive MA year direction
          break;
        }
      }
      results.push({ windowStart: start, windowEnd: end, value: round(value, 2) });
    }
    if (end > lastDataPointAge) break;
    end = Math.min(end + stepSize, lastDataPointAge);
    if (end - start > windowSize) {
      start = end - windowSize;
    } else if (end == lastDataPointAge) {
      start += stepSize;
    }
  }
  return results;
}

export function findRangeOfWindowStats(
  windowStats: WindowStats[],
  topAge: number,
  baseAge: number,
  stat: DataMiningStatisticApproach
): { min: number; max: number } {
  if (stat == "average") {
    return windowStats.reduce(
      (acc, curr) => {
        if (
          curr.value != 0 &&
          curr.value < acc.min &&
          (curr.windowStart + curr.windowEnd) / 2 >= topAge &&
          (curr.windowStart + curr.windowEnd) / 2 <= baseAge
        )
          acc.min = curr.value;
        if (
          curr.value != 0 &&
          curr.value > acc.max &&
          (curr.windowStart + curr.windowEnd) / 2 >= topAge &&
          (curr.windowStart + curr.windowEnd) / 2 <= baseAge
        )
          acc.max = curr.value;
        return acc;
      },
      { min: Infinity, max: -Infinity }
    );
  }
  return windowStats.reduce(
    (acc, curr) => {
      if (
        curr.value < acc.min &&
        (curr.windowStart + curr.windowEnd) / 2 >= topAge &&
        (curr.windowStart + curr.windowEnd) / 2 <= baseAge
      )
        acc.min = curr.value;
      if (
        curr.value > acc.max &&
        (curr.windowStart + curr.windowEnd) / 2 >= topAge &&
        (curr.windowStart + curr.windowEnd) / 2 <= baseAge
      )
        acc.max = curr.value;
      return acc;
    },
    { min: Infinity, max: -Infinity }
  );
}
