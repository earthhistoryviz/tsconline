import { first, round } from "lodash";
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
  stat: DataMiningStatisticApproach
): WindowStats[] {
  if (data.length === 0 || windowSize <= 0 || data.some((d) => isNaN(d))) {
    return [];
  }
  data = data.sort((a, b) => a - b);
  console.log("sorted filted data:" + data);
  const firstDataPoint = data[0]!;
  const lastDataPoint = data[data.length - 1]!;
  const windows = Math.ceil((lastDataPoint - firstDataPoint + 1) / windowSize);

  console.log("windows:" + windows);
  console.log("firstDatapoint:" + firstDataPoint);
  console.log("lastDatapoint:" + lastDataPoint);

  const results: WindowStats[] = [];
  let start = data[0]!; // inclusive
  let end = start + windowSize; // exclusive

  for (let i = 0; i < windows; i++) {
    // make sure to include the last value in the last window
    console.log("i:" + i);
    const window = data.filter((d) => d >= start && (d < end || (i === windows - 1 && d === end)));
    if (window.length === 0) {
      results.push({ windowStart: start, windowEnd: end, value: 0 });
    } else {
      const firstWindowPoint = window[0]!;
      const lastWindowPoint = window[window.length - 1]!;
      let value = 0;
      switch (stat) {
        case "frequency":
          value = window.length;
          break;
        case "minimum":
          value = Math.min(...window);
          break;
        case "maximum":
          value = Math.max(...window);
          break;
        case "average":
          value = window.reduce((a, b) => a + b, 0) / window.length;
          break;
        case "rateOfChange":
          if (!firstWindowPoint) value = 0;
          else value = (lastWindowPoint - firstWindowPoint) / firstWindowPoint;
          break;
      }
      results.push({ windowStart: start, windowEnd: end, value: round(normalizeZero(value), 2) });
    }
    if (end > lastDataPoint) break;
    start = end;
    end = Math.min(end + windowSize, lastDataPoint);
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
  stat: DataMiningStatisticApproach
) {
  if (data.length === 0 || windowSize <= 0 || data.some((d) => isNaN(d.value) || isNaN(d.age))) {
    return [];
  }
  const firstDataPoint = data[0]!.age;
  const lastDataPointAge = data[data.length - 1]!.age;
  const windows = Math.ceil((lastDataPointAge - firstDataPoint + 1) / windowSize);
  data = data.sort((a, b) => a.age - b.age);
  const results: WindowStats[] = [];
  let start = data[0]!.age;
  let end = start + windowSize;
  console.log("filtered data:" + JSON.stringify(data))
  console.log("length of ftered data is:" + data.length)
  const testa = [1.21, 3, 5.16, 8.31, 10.21]
  if (stat === "frequency")
    return computeWindowStatistics(
      data.map((d) => d.value),
      //testa,
      windowSize,
      stat
    );
  for (let i = 0; i < windows; i++) {
    const window = data.filter((d) => d.age >= start && (d.age < end || (i === windows - 1 && d.age === end)));
    if (window.length === 0) {
      results.push({ windowStart: start, windowEnd: end, value: 0 });
      //continue;
    } else {
      const firstWindowPoint = window[0]!;
      const lastWindowPoint = window[window.length - 1]!;
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
        case "rateOfChange":
          if (!firstWindowPoint.value) value = 0;
          else value = (lastWindowPoint.value - firstWindowPoint.value) / firstWindowPoint.value;
          break;
      }
      results.push({ windowStart: start, windowEnd: end, value: round(value, 2) });
    }
    if (end > lastDataPointAge) break;
    start = end;
    end = Math.min(end + windowSize, lastDataPointAge);
  }
  return results;
}

export function findRangeOfWindowStats(
  windowStats: WindowStats[]
): { min: number; max: number } {
  return windowStats.reduce(
    (acc, curr) => {
      if (curr.value < acc.min) acc.min = curr.value;
      if (curr.value > acc.max) acc.max = curr.value;
      return acc;
    },
    { min: Infinity, max: -Infinity }
  );
}
