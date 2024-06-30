import { describe, expect, test } from "vitest";
import { assertDataMiningStatisticApproach } from "../src/types";
import { computeWindowStatistics, computeWindowStatisticsForDataPoints } from "../src/util/data-mining";
describe("computeWindowStatistics tests", () => {
  const dataArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  test.each([
    [
      dataArray,
      3,
      1,
      "average",
      [
        { windowStart: 1, windowEnd: 2, value: 1 },
        { windowStart: 1, windowEnd: 3, value: 1.5 },
        { windowStart: 1, windowEnd: 4, value: 2 },
        { windowStart: 2, windowEnd: 5, value: 3 },
        { windowStart: 3, windowEnd: 6, value: 4 },
        { windowStart: 4, windowEnd: 7, value: 5 },
        { windowStart: 5, windowEnd: 8, value: 6 },
        { windowStart: 6, windowEnd: 9, value: 7 },
        { windowStart: 7, windowEnd: 10, value: 8 },
        { windowStart: 8, windowEnd: 10, value: 9 }
      ]
    ],
    [
      dataArray,
      3,
      1,
      "minimum",
      [
        { windowStart: 1, windowEnd: 2, value: 1 },
        { windowStart: 1, windowEnd: 3, value: 1 },
        { windowStart: 1, windowEnd: 4, value: 1 },
        { windowStart: 2, windowEnd: 5, value: 2 },
        { windowStart: 3, windowEnd: 6, value: 3 },
        { windowStart: 4, windowEnd: 7, value: 4 },
        { windowStart: 5, windowEnd: 8, value: 5 },
        { windowStart: 6, windowEnd: 9, value: 6 },
        { windowStart: 7, windowEnd: 10, value: 7 },
        { windowStart: 8, windowEnd: 10, value: 8 }
      ]
    ],
    [
      dataArray,
      3,
      1,
      "maximum",
      [
        { windowStart: 1, windowEnd: 2, value: 1 },
        { windowStart: 1, windowEnd: 3, value: 2 },
        { windowStart: 1, windowEnd: 4, value: 3 },
        { windowStart: 2, windowEnd: 5, value: 4 },
        { windowStart: 3, windowEnd: 6, value: 5 },
        { windowStart: 4, windowEnd: 7, value: 6 },
        { windowStart: 5, windowEnd: 8, value: 7 },
        { windowStart: 6, windowEnd: 9, value: 8 },
        { windowStart: 7, windowEnd: 10, value: 9 },
        { windowStart: 8, windowEnd: 10, value: 10 }
      ]
    ],
    [
      dataArray,
      3,
      1,
      "rateOfChange",
      [
        { windowStart: 1, windowEnd: 2, value: 0 },
        { windowStart: 1, windowEnd: 3, value: 1 },
        { windowStart: 1, windowEnd: 4, value: 2 },
        { windowStart: 2, windowEnd: 5, value: 1 },
        { windowStart: 3, windowEnd: 6, value: 0.67 },
        { windowStart: 4, windowEnd: 7, value: 0.5 },
        { windowStart: 5, windowEnd: 8, value: 0.4 },
        { windowStart: 6, windowEnd: 9, value: 0.33 },
        { windowStart: 7, windowEnd: 10, value: 0.29 },
        { windowStart: 8, windowEnd: 10, value: 0.25 }
      ]
    ],
    [
      dataArray,
      3,
      1,
      "frequency",
      [
        { windowStart: 1, windowEnd: 2, value: 1 },
        { windowStart: 1, windowEnd: 3, value: 2 },
        { windowStart: 1, windowEnd: 4, value: 3 },
        { windowStart: 2, windowEnd: 5, value: 3 },
        { windowStart: 3, windowEnd: 6, value: 3 },
        { windowStart: 4, windowEnd: 7, value: 3 },
        { windowStart: 5, windowEnd: 8, value: 3 },
        { windowStart: 6, windowEnd: 9, value: 3 },
        { windowStart: 7, windowEnd: 10, value: 3 },
        { windowStart: 8, windowEnd: 10, value: 3 }
      ]
    ],
    [
      [-1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      3,
      1,
      "rateOfChange",
      [
        { windowStart: -1, windowEnd: 0, value: 0 },
        { windowStart: 0, windowEnd: 0, value: 0 }
      ]
    ],
    [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 3, 1, "rateOfChange", [{ windowStart: 0, windowEnd: 1, value: 0 }]],
    [[], 3, 1, "rateOfChange", []],
    [
      [-10, -10, -10, -10, -10, -10, -10, -10, -10, -10],
      3,
      1,
      "rateOfChange",
      [{ windowStart: -10, windowEnd: -9, value: 0 }]
    ]
  ])("Computes %s %s %s %s correctly", (data, windowSize, stepSize, stat, expected) => {
    assertDataMiningStatisticApproach(stat);
    expect(computeWindowStatistics(data, windowSize, stepSize, stat)).toEqual(expected);
  });
});

describe("computeWindowStatisticsForDataSet tests", () => {
  const dataPoints = [
    { age: 1, value: 10 },
    { age: 2, value: 9 },
    { age: 3, value: 8 },
    { age: 4, value: 7 },
    { age: 5, value: 6 },
    { age: 6, value: 5 },
    { age: 7, value: 4 },
    { age: 8, value: 3 },
    { age: 9, value: 2 },
    { age: 10, value: 1 }
  ];
  test.each([
    [
      dataPoints,
      3,
      1,
      "frequency",
      [
        { windowStart: 1, windowEnd: 2, value: 1 },
        { windowStart: 1, windowEnd: 3, value: 2 },
        { windowStart: 1, windowEnd: 4, value: 3 },
        { windowStart: 2, windowEnd: 5, value: 3 },
        { windowStart: 3, windowEnd: 6, value: 3 },
        { windowStart: 4, windowEnd: 7, value: 3 },
        { windowStart: 5, windowEnd: 8, value: 3 },
        { windowStart: 6, windowEnd: 9, value: 3 },
        { windowStart: 7, windowEnd: 10, value: 3 },
        { windowStart: 8, windowEnd: 10, value: 3 }
      ]
    ],
    [
      dataPoints,
      3,
      1,
      "minimum",
      [
        { windowStart: 1, windowEnd: 2, value: 10 },
        { windowStart: 1, windowEnd: 3, value: 9 },
        { windowStart: 1, windowEnd: 4, value: 8 },
        { windowStart: 2, windowEnd: 5, value: 7 },
        { windowStart: 3, windowEnd: 6, value: 6 },
        { windowStart: 4, windowEnd: 7, value: 5 },
        { windowStart: 5, windowEnd: 8, value: 4 },
        { windowStart: 6, windowEnd: 9, value: 3 },
        { windowStart: 7, windowEnd: 10, value: 2 },
        { windowStart: 8, windowEnd: 10, value: 1 }
      ]
    ],
    [
      dataPoints,
      3,
      1,
      "maximum",
      [
        { windowStart: 1, windowEnd: 2, value: 10 },
        { windowStart: 1, windowEnd: 3, value: 10 },
        { windowStart: 1, windowEnd: 4, value: 10 },
        { windowStart: 2, windowEnd: 5, value: 9 },
        { windowStart: 3, windowEnd: 6, value: 8 },
        { windowStart: 4, windowEnd: 7, value: 7 },
        { windowStart: 5, windowEnd: 8, value: 6 },
        { windowStart: 6, windowEnd: 9, value: 5 },
        { windowStart: 7, windowEnd: 10, value: 4 },
        { windowStart: 8, windowEnd: 10, value: 3 }
      ]
    ],
    [
      dataPoints,
      3,
      1,
      "average",
      [
        { windowStart: 1, windowEnd: 2, value: 10 },
        { windowStart: 1, windowEnd: 3, value: 9.5 },
        { windowStart: 1, windowEnd: 4, value: 9 },
        { windowStart: 2, windowEnd: 5, value: 8 },
        { windowStart: 3, windowEnd: 6, value: 7 },
        { windowStart: 4, windowEnd: 7, value: 6 },
        { windowStart: 5, windowEnd: 8, value: 5 },
        { windowStart: 6, windowEnd: 9, value: 4 },
        { windowStart: 7, windowEnd: 10, value: 3 },
        { windowStart: 8, windowEnd: 10, value: 2 }
      ]
    ],
    [
      dataPoints,
      3,
      1,
      "rateOfChange",
      [
        { windowStart: 1, windowEnd: 2, value: -0 },
        { windowStart: 1, windowEnd: 3, value: 1 },
        { windowStart: 1, windowEnd: 4, value: 1 },
        { windowStart: 2, windowEnd: 5, value: 1 },
        { windowStart: 3, windowEnd: 6, value: 1 },
        { windowStart: 4, windowEnd: 7, value: 1 },
        { windowStart: 5, windowEnd: 8, value: 1 },
        { windowStart: 6, windowEnd: 9, value: 1 },
        { windowStart: 7, windowEnd: 10, value: 1 },
        { windowStart: 8, windowEnd: 10, value: 1 }
      ]
    ],
    [
      [
        { age: 1, value: 0 },
        { age: 2, value: 0 },
        { age: 3, value: 0 }
      ],
      3,
      1,
      "rateOfChange",
      [
        { windowStart: 1, windowEnd: 2, value: -0 },
        { windowStart: 2, windowEnd: 3, value: -0 },
        { windowStart: 3, windowEnd: 3, value: -0 }
      ]
    ],
    [
      [
        { age: 1, value: 0 },
        { age: 2, value: 0 },
        { age: 3, value: -10 }
      ],
      3,
      1,
      "rateOfChange",
      [
        { windowStart: 1, windowEnd: 2, value: -0 },
        { windowStart: 2, windowEnd: 3, value: -0 },
        { windowStart: 3, windowEnd: 3, value: -0 }
      ]
    ]
  ])(`Computes %s %s %s correctly`, (data, windowSize, stepSize, stat, expected) => {
    assertDataMiningStatisticApproach(stat);
    expect(computeWindowStatisticsForDataPoints(data, windowSize, stepSize, stat)).toEqual(expected);
  });
});
