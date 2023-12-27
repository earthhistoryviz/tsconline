import { observable } from "mobx";

import type { ChartConfig, ColumnSetting, GeologicalStages} from "@tsconline/shared";


export type State = {
  chartLoading: boolean;
  tab: number;
  showAllTabs: boolean;
  settingsTabs: {
    selected: "time" | "font" | "column" | "mappoints";
    columns: ColumnSetting;
    columnSelected: { name: string; parents: string[] } | null;
    geologicalTopStages: GeologicalStages
    geologicalBaseStages: GeologicalStages
  };
  chart: ChartConfig | null;
  presets: ChartConfig[];
  chartPath: string;
  chartHash: string;
  settingsXML: string;
  settingsJSON: any;
  settings: {
    topStage: string;
    topStageKey: string;
    baseStage: string;
    baseStageKey: string;
    unitsPerMY: number;
  };
  useCache: boolean;
};

export const state = observable<State>({
  chartLoading: true, 
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
    geologicalTopStages: {},
    geologicalBaseStages: {} 
  },
  chart: null,
  presets: [],
  chartPath: "",
  chartHash: "",
  settingsXML: "",
  settingsJSON: {},
  settings: {
    topStage: "",
    topStageKey: "",
    baseStage: "",
    baseStageKey: "",
    unitsPerMY: 2,
  },
  useCache: false,
});
