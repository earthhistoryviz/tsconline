import { DataMiningStatisticApproach, WindowStats } from "../types";

/**
 * This function computes the statistics of a data set in a moving window.
 * assume data isn't sorted
 * @param data the data set
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
  if (data.length === 0 || windowSize === 0 || data.some((d) => isNaN(d))) {
    return [];
  }
  const windows = Math.ceil(data.length / windowSize);
  data = data.sort((a, b) => a - b);
  const results: WindowStats[] = [];
  let start = data[0]!;
  let end = start + windowSize;

  for (let i = 0; i < windows; i++) {
    // make sure to include the last value in the last window
    const window = data.filter((d) => d >= start && (d < end || (i === windows - 1 && d === end)));
    if (window.length === 0) results.push({ windowStart: start, windowEnd: end, value: 0 });
    const firstWindowPoint = window[0];
    const lastWindowPoint = window[window.length - 1];
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
        if (!firstWindowPoint || !lastWindowPoint) value = 0;
        else value = (lastWindowPoint - firstWindowPoint) / firstWindowPoint;
        break;
    }
    results.push({ windowStart: start, windowEnd: end, value: value });
    const lastDataPoint = data[data.length - 1];
    if (!lastDataPoint || end > lastDataPoint) break;
    start = end;
    end = Math.min(end + windowSize, lastDataPoint);
  }
  return results;
}
