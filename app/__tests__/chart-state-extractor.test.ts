import { describe, expect, it } from "vitest";
import { defaultColumnRoot } from "@tsconline/shared";
import { extractCurrentChartState } from "../src/util/chart-state-extractor";

describe("extractCurrentChartState", () => {
  it("includes vertical scale overrides and live column toggle settings", () => {
    const childName = "Synthetic Column";

    const state = {
      config: { datapacks: [] },
      datapacks: [],
      settings: {
        timeSettings: {
          Ma: {
            selectedStage: "",
            topStageAge: 0,
            topStageKey: "",
            baseStageAge: 15,
            baseStageKey: "",
            unitsPerMY: 4,
            skipEmptyColumns: false
          }
        }
      },
      settingsTabs: {
        renderColumns: {
          name: defaultColumnRoot.name,
          children: [childName],
          on: true,
          width: undefined
        },
        columnHashMap: new Map([
          [
            childName,
            {
              name: childName,
              children: [],
              on: false,
              width: 120,
              rgb: { r: 255, g: 255, b: 255 },
              show: false,
              expanded: false
            }
          ]
        ])
      }
    };

    const extracted = extractCurrentChartState(state as never);

    expect(extracted.overrides).toMatchObject({
      baseAge_Ma: 15,
      topAge_Ma: 0,
      unitsPerMY: [{ unit: "Ma", value: 4 }]
    });
    expect(extracted.columnToggles).toMatchObject({
      [childName]: { on: false, width: 120, backgroundColor: "rgb(255, 255, 255)" }
    });
  });
});
