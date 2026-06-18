import { describe, expect, it } from "vitest";
import { defaultColumnRoot } from "@tsconline/shared";
import { extractCurrentChartState } from "../src/util/chart-state-extractor";

describe("extractCurrentChartState", () => {
  it("includes vertical scale overrides and leaf deltas vs defaults", () => {
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
        hideDatapackDefaults: false,
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
              show: false,
              expanded: false
            }
          ]
        ])
      }
    };

    const extracted = extractCurrentChartState(state as never);

    expect(extracted.overrides).toMatchObject({
      hideDatapackDefaults: false,
      baseAge_Ma: 15,
      topAge_Ma: 0,
      unitsPerMY: [{ unit: "Ma", value: 4 }]
    });
    expect(extracted.columnToggles).toMatchObject({
      [childName]: { width: 120 }
    });
    expect(extracted.columnToggles[childName]?.on).toBeUndefined();
  });

  it("omits default-on leaves that match datapack defaults", () => {
    const defaultOnColumn = "Events";
    const defaultOffColumn = "Ranges";

    const state = {
      config: {
        datapacks: [{ title: "GTS2020" }]
      },
      datapacks: [
        {
          title: "GTS2020",
          columnInfo: {
            name: "Chart Title",
            children: [
              { name: defaultOnColumn, on: true, width: 100, children: [] },
              { name: defaultOffColumn, on: false, width: 80, children: [] }
            ]
          }
        }
      ],
      settings: { timeSettings: {} },
      settingsTabs: {
        hideDatapackDefaults: false,
        renderColumns: {
          name: defaultColumnRoot.name,
          children: ["Chart Title"]
        },
        columnHashMap: new Map([
          [
            "Chart Title",
            {
              name: "Chart Title",
              children: [defaultOnColumn, defaultOffColumn],
              on: true
            }
          ],
          [
            defaultOnColumn,
            {
              name: defaultOnColumn,
              children: [],
              on: true,
              width: 100
            }
          ],
          [
            defaultOffColumn,
            {
              name: defaultOffColumn,
              children: [],
              on: false,
              width: 80
            }
          ]
        ])
      }
    };

    const extracted = extractCurrentChartState(state as never);

    expect(extracted.overrides.hideDatapackDefaults).toBe(false);
    expect(extracted.columnToggles).toEqual({});
  });

  it("reports width-only deltas for default-on leaves", () => {
    const defaultOnColumn = "Events";

    const state = {
      config: {
        datapacks: [{ title: "GTS2020" }]
      },
      datapacks: [
        {
          title: "GTS2020",
          columnInfo: {
            name: "Chart Title",
            children: [{ name: defaultOnColumn, on: true, width: 100, children: [] }]
          }
        }
      ],
      settings: { timeSettings: {} },
      settingsTabs: {
        hideDatapackDefaults: false,
        renderColumns: {
          name: defaultColumnRoot.name,
          children: ["Chart Title"]
        },
        columnHashMap: new Map([
          [
            "Chart Title",
            {
              name: "Chart Title",
              children: [defaultOnColumn],
              on: true
            }
          ],
          [
            defaultOnColumn,
            {
              name: defaultOnColumn,
              children: [],
              on: true,
              width: 110
            }
          ]
        ])
      }
    };

    const extracted = extractCurrentChartState(state as never);

    expect(extracted.columnToggles).toMatchObject({
      [defaultOnColumn]: { width: 110 }
    });
    expect(extracted.columnToggles[defaultOnColumn]?.on).toBeUndefined();
  });

  it("reports on:true for default-off leaves that are effectively on", () => {
    const defaultOffColumn = "Ranges";

    const state = {
      config: {
        datapacks: [{ title: "GTS2020" }]
      },
      datapacks: [
        {
          title: "GTS2020",
          columnInfo: {
            name: "Chart Title",
            children: [{ name: defaultOffColumn, on: false, width: 80, children: [] }]
          }
        }
      ],
      settings: { timeSettings: {} },
      settingsTabs: {
        hideDatapackDefaults: false,
        renderColumns: {
          name: defaultColumnRoot.name,
          children: ["Chart Title"]
        },
        columnHashMap: new Map([
          [
            "Chart Title",
            {
              name: "Chart Title",
              children: [defaultOffColumn],
              on: true
            }
          ],
          [
            defaultOffColumn,
            {
              name: defaultOffColumn,
              children: [],
              on: true,
              width: 80
            }
          ]
        ])
      }
    };

    const extracted = extractCurrentChartState(state as never);

    expect(extracted.columnToggles).toMatchObject({
      [defaultOffColumn]: { on: true }
    });
  });

  it("puts blank slate in overrides and lists all effectively-on columns including folders", () => {
    const folderColumn = "Polarity chrons";
    const leafColumn = "Chron Label";

    const state = {
      config: {
        datapacks: [{ title: "GTS2020" }]
      },
      datapacks: [
        {
          title: "GTS2020",
          columnInfo: {
            name: "Chart Title",
            children: [
              {
                name: folderColumn,
                on: true,
                width: 144,
                children: [
                  { name: folderColumn, on: true, width: 60, children: [] },
                  { name: leafColumn, on: true, width: 40, children: [] }
                ]
              }
            ]
          }
        }
      ],
      settings: { timeSettings: {} },
      settingsTabs: {
        hideDatapackDefaults: true,
        renderColumns: {
          name: defaultColumnRoot.name,
          children: ["Chart Title"]
        },
        columnHashMap: new Map([
          [
            "Chart Title",
            {
              name: "Chart Title",
              children: [folderColumn],
              on: true
            }
          ],
          [
            folderColumn,
            {
              name: folderColumn,
              children: [leafColumn],
              on: true,
              width: 144
            }
          ],
          [
            leafColumn,
            {
              name: leafColumn,
              children: [],
              on: true,
              width: 40
            }
          ]
        ])
      }
    };

    const extracted = extractCurrentChartState(state as never);

    expect(extracted.overrides.hideDatapackDefaults).toBe(true);
    expect(extracted.columnToggles[folderColumn]).toMatchObject({ on: true, width: 144 });
    expect(extracted.columnToggles[leafColumn]).toMatchObject({ on: true, width: 40 });
  });

  it("puts blank slate in overrides and lists effectively-on leaves", () => {
    const visibleColumn = "Period";
    const hiddenColumn = "Epoch";

    const state = {
      config: {
        datapacks: [{ title: "GTS2020" }]
      },
      datapacks: [
        {
          title: "GTS2020",
          columnInfo: {
            name: "Chart Title",
            children: [
              { name: visibleColumn, on: true, width: 100, children: [] },
              { name: hiddenColumn, on: true, width: 100, children: [] }
            ]
          }
        }
      ],
      settings: { timeSettings: {} },
      settingsTabs: {
        hideDatapackDefaults: true,
        renderColumns: {
          name: defaultColumnRoot.name,
          children: ["Chart Title"]
        },
        columnHashMap: new Map([
          [
            "Chart Title",
            {
              name: "Chart Title",
              children: [visibleColumn, hiddenColumn],
              on: true
            }
          ],
          [
            visibleColumn,
            {
              name: visibleColumn,
              children: [],
              on: true,
              width: 100
            }
          ],
          [
            hiddenColumn,
            {
              name: hiddenColumn,
              children: [],
              on: false,
              width: 100
            }
          ]
        ])
      }
    };

    const extracted = extractCurrentChartState(state as never);

    expect(extracted.overrides.hideDatapackDefaults).toBe(true);
    expect(extracted.columnToggles).toMatchObject({
      [visibleColumn]: { on: true, width: 100 }
    });
    expect(extracted.columnToggles[hiddenColumn]).toBeUndefined();
  });

  it("omits leaves under an off parent instead of reporting on:false for each one", () => {
    const topFolder = "Dinoflagellate cysts, Acritarchs and Chitinozoans";
    const folderColumn = "Chitinozoans";
    const leafColumn = "Ordov-Silur-Devon Chitinozoan Zones";

    const state = {
      config: {
        datapacks: [{ title: "GTS2020" }]
      },
      datapacks: [
        {
          title: "GTS2020",
          columnInfo: {
            name: "Chart Title",
            children: [
              {
                name: topFolder,
                on: true,
                children: [
                  {
                    name: folderColumn,
                    on: true,
                    children: [{ name: leafColumn, on: true, width: 120, children: [] }]
                  }
                ]
              }
            ]
          }
        }
      ],
      settings: { timeSettings: {} },
      settingsTabs: {
        hideDatapackDefaults: false,
        renderColumns: {
          name: defaultColumnRoot.name,
          children: ["Chart Title"]
        },
        columnHashMap: new Map([
          [
            "Chart Title",
            {
              name: "Chart Title",
              children: [topFolder],
              on: true
            }
          ],
          [
            topFolder,
            {
              name: topFolder,
              children: [folderColumn],
              on: false
            }
          ],
          [
            folderColumn,
            {
              name: folderColumn,
              children: [leafColumn],
              on: false
            }
          ],
          [
            leafColumn,
            {
              name: leafColumn,
              children: [],
              on: true,
              width: 120
            }
          ]
        ])
      }
    };

    const extracted = extractCurrentChartState(state as never);

    expect(extracted.columnToggles[leafColumn]).toBeUndefined();
    expect(extracted.columnToggles[folderColumn]).toBeUndefined();
    expect(extracted.columnToggles[topFolder]).toEqual({ on: false });
    expect(Object.keys(extracted.columnToggles)).toHaveLength(1);
  });

  it("reports on:false when ancestors are on but the leaf itself was turned off", () => {
    const defaultOnColumn = "Events";

    const state = {
      config: {
        datapacks: [{ title: "GTS2020" }]
      },
      datapacks: [
        {
          title: "GTS2020",
          columnInfo: {
            name: "Chart Title",
            children: [{ name: defaultOnColumn, on: true, width: 100, children: [] }]
          }
        }
      ],
      settings: { timeSettings: {} },
      settingsTabs: {
        hideDatapackDefaults: false,
        renderColumns: {
          name: defaultColumnRoot.name,
          children: ["Chart Title"]
        },
        columnHashMap: new Map([
          [
            "Chart Title",
            {
              name: "Chart Title",
              children: [defaultOnColumn],
              on: true
            }
          ],
          [
            defaultOnColumn,
            {
              name: defaultOnColumn,
              children: [],
              on: false,
              width: 100
            }
          ]
        ])
      }
    };

    const extracted = extractCurrentChartState(state as never);

    expect(extracted.columnToggles).toEqual({
      [defaultOnColumn]: { on: false }
    });
  });

  it("omits golden-path leaves that still match datapack defaults", () => {
    const folderColumn = "Chitinozoans";
    const leafColumn = "Ordov-Silur-Devon Chitinozoan Zones";

    const state = {
      config: {
        datapacks: [{ title: "GTS2020" }]
      },
      datapacks: [
        {
          title: "GTS2020",
          columnInfo: {
            name: "Chart Title",
            children: [
              {
                name: folderColumn,
                on: true,
                children: [{ name: leafColumn, on: true, width: 120, children: [] }]
              }
            ]
          }
        }
      ],
      settings: { timeSettings: {} },
      settingsTabs: {
        hideDatapackDefaults: false,
        renderColumns: {
          name: defaultColumnRoot.name,
          children: ["Chart Title"]
        },
        columnHashMap: new Map([
          [
            "Chart Title",
            {
              name: "Chart Title",
              children: [folderColumn],
              on: true
            }
          ],
          [
            folderColumn,
            {
              name: folderColumn,
              children: [leafColumn],
              on: true
            }
          ],
          [
            leafColumn,
            {
              name: leafColumn,
              children: [],
              on: true,
              width: 120
            }
          ]
        ])
      }
    };

    const extracted = extractCurrentChartState(state as never);

    expect(extracted.columnToggles).toEqual({});
  });
});
