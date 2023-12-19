import { observable } from "mobx";

import type { ChartConfig, ColumnSetting } from "@tsconline/shared";


export type State = {
  tab: number;
  showAllTabs: boolean;
  settingsTabs: {
    selected: "time" | "font" | "column" | "mappoints";
    columns: ColumnSetting;
    columnSelected: { name: string; parents: string[] } | null;
  };
  chart: ChartConfig | null;
  presets: ChartConfig[];
  chartPath: string;
  settingsXML: string;
  settingsJSON: any;
  settings: {
    topAge: number;
    selectedStage: string | null;
    baseAge: number;
    unitsPerMY: number;
  };
};

export const state = observable<State>({
  tab: 0,
  showAllTabs: false,
  settingsTabs: {
    selected: "time",
    columns: {
      Presidents: { on: true, children: null, parents: [] },
      Society: { on: true, children: null, parents: [] },
      // "Standard Chronostratigraphy": { on: false, children: null, parents: [] },
      // "Planetary Time Scale": { on: false, children: null, parents: [] },
      // "Regional Stages": { on: false, children: null, parents: [] },
      // "Geomagnetic Polarity": { on: false, children: null, parents: [] },
      // "Marine Macrofossils": { on: false, children: null, parents: [] },
      // "Microfossils": { on: false, children: null, parents: [] },
    },
    columnSelected: null,
  },
  chart: null,
  presets: [],
  chartPath: "",
  settingsXML: "",
  settingsJSON: {},
  settings: {
    topAge: 0,
    selectedStage: null,
    baseAge: 20,
    unitsPerMY: 2,
  },
});
