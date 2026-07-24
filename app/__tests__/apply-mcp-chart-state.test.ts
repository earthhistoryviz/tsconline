import { describe, expect, it } from "vitest";
import { defaultColumnRoot } from "@tsconline/shared";
import { applyMcpChartStateToApp } from "../src/util/apply-mcp-chart-state";

describe("applyMcpChartStateToApp", () => {
  it("turns off default-on columns via columnToggles", () => {
    const defaultOnColumn = "Events";

    const state = {
      settings: { timeSettings: { Ma: { baseStageAge: 10, topStageAge: 0, unitsPerMY: 2 } } },
      config: { datapacks: [{ title: "GTS2020" }] },
      datapacks: [
        {
          title: "GTS2020",
          columnInfo: {
            name: "Chart Title",
            children: [{ name: defaultOnColumn, on: true, width: 100, children: [] }]
          }
        }
      ],
      settingsTabs: {
        hideDatapackDefaults: false,
        columnOnSnapshot: null,
        renderColumns: { name: defaultColumnRoot.name, children: ["Chart Title"] },
        columnHashMap: new Map([
          ["Chart Title", { name: "Chart Title", children: [defaultOnColumn], on: true }],
          [defaultOnColumn, { name: defaultOnColumn, children: [], on: true, width: 100 }]
        ])
      }
    };

    applyMcpChartStateToApp(state as never, {
      datapackTitles: ["GTS2020"],
      overrides: { hideDatapackDefaults: false },
      columnToggles: { [defaultOnColumn]: { on: false } }
    });

    expect(state.settingsTabs.columnHashMap.get(defaultOnColumn)?.on).toBe(false);
    expect(state.settingsTabs.hideDatapackDefaults).toBe(false);
  });

  it("reorders sibling columns using columnOrder", () => {
    const firstColumn = "Era";
    const secondColumn = "Period";
    const nestedColumn = "Stage";

    const state = {
      settings: { timeSettings: {} },
      config: { datapacks: [{ title: "GTS2020" }] },
      columns: {
        name: "Chart Title",
        children: [
          { name: firstColumn, on: true, children: [{ name: nestedColumn, on: true, children: [] }] },
          { name: secondColumn, on: true, children: [] }
        ]
      },
      datapacks: [
        {
          title: "GTS2020",
          columnInfo: {
            name: "Chart Title",
            children: [
              { name: firstColumn, on: true, children: [{ name: nestedColumn, on: true, children: [] }] },
              { name: secondColumn, on: true, children: [] }
            ]
          }
        }
      ],
      settingsTabs: {
        hideDatapackDefaults: false,
        columnOnSnapshot: null,
        renderColumns: {
          name: defaultColumnRoot.name,
          children: [firstColumn, secondColumn],
          columnRef: {
            name: "Chart Title",
            children: [
              { name: firstColumn, on: true, children: [{ name: nestedColumn, on: true, children: [] }] },
              { name: secondColumn, on: true, children: [] }
            ]
          }
        },
        columnHashMap: new Map([
          [
            firstColumn,
            {
              name: firstColumn,
              children: [nestedColumn],
              on: true,
              columnRef: { name: firstColumn, children: [{ name: nestedColumn, on: true, children: [] }] }
            }
          ],
          [
            secondColumn,
            {
              name: secondColumn,
              children: [],
              on: true,
              columnRef: { name: secondColumn, children: [] }
            }
          ],
          [
            nestedColumn,
            {
              name: nestedColumn,
              children: [],
              on: true,
              columnRef: { name: nestedColumn, children: [] }
            }
          ]
        ])
      }
    };

    applyMcpChartStateToApp(state as never, {
      datapackTitles: ["GTS2020"],
      overrides: { hideDatapackDefaults: false },
      columnToggles: {},
      columnOrder: [secondColumn, firstColumn, nestedColumn]
    });

    expect(state.settingsTabs.renderColumns.children).toEqual([secondColumn, firstColumn]);
    expect(state.columns.children.map((child: { name: string }) => child.name)).toEqual([secondColumn, firstColumn]);
    expect(state.settingsTabs.columnHashMap.get(firstColumn)?.children).toEqual([nestedColumn]);
  });

  it("applies blank slate from overrides.hideDatapackDefaults", () => {
    const visibleColumn = "Period";
    const hiddenColumn = "Epoch";

    const state = {
      settings: { timeSettings: {} },
      config: { datapacks: [{ title: "GTS2020" }] },
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
      settingsTabs: {
        hideDatapackDefaults: false,
        columnOnSnapshot: null,
        renderColumns: { name: defaultColumnRoot.name, children: ["Chart Title"] },
        columnHashMap: new Map([
          ["Chart Title", { name: "Chart Title", children: [visibleColumn, hiddenColumn], on: true }],
          [visibleColumn, { name: visibleColumn, children: [], on: true, width: 100 }],
          [hiddenColumn, { name: hiddenColumn, children: [], on: true, width: 100 }]
        ])
      }
    };

    applyMcpChartStateToApp(state as never, {
      datapackTitles: ["GTS2020"],
      overrides: { hideDatapackDefaults: true },
      columnToggles: { [visibleColumn]: { on: true, width: 100 } }
    });

    expect(state.settingsTabs.hideDatapackDefaults).toBe(true);
    expect(state.settingsTabs.columnHashMap.get(visibleColumn)?.on).toBe(true);
    expect(state.settingsTabs.columnHashMap.get(hiddenColumn)?.on).toBe(false);
  });
});
