import { assertDataMiningStatisticApproach } from "../src/types";
import { computeWindowStatistics } from "../src/util/data-mining";
describe("computeWindowStatistics tests", () => {
  test.each([
    [
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      2,
      3,
      "average",
      [
        { windowStart: 1, windowEnd: 4, value: 2 },
        { windowStart: 4, windowEnd: 7, value: 5.5 }
      ]
    ],
    [
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      2,
      3,
      "minimum",
      [
        { windowStart: 1, windowEnd: 4, value: 1 },
        { windowStart: 4, windowEnd: 7, value: 4 }
      ]
    ],
    [
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      2,
      3,
      "maximum",
      [
        { windowStart: 1, windowEnd: 4, value: 3 },
        { windowStart: 4, windowEnd: 7, value: 7 }
      ]
    ],
    [
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      2,
      3,
      "rateOfChange",
      [
        { windowStart: 1, windowEnd: 4, value: 2 },
        { windowStart: 4, windowEnd: 7, value: 0.75 }
      ]
    ],
    [
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      2,
      3,
      "frequency",
      [
        { windowStart: 1, windowEnd: 4, value: 3 },
        { windowStart: 4, windowEnd: 7, value: 4 }
      ]
    ]
  ])("Computes %s %s %s %s correctly", (data, windows, windowSize, stat, expected) => {
    assertDataMiningStatisticApproach(stat);
    expect(computeWindowStatistics(data, windows, windowSize, stat)).toEqual(expected);
  });
});
