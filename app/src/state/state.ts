import { observable } from "mobx";

import type { MapInfo, ChartConfig, ColumnInfo, GeologicalStages} from "@tsconline/shared";


export type State = {
  chartLoading: boolean;
  tab: number;
  showAllTabs: boolean;
  settingsTabs: {
    selected: "time" | "font" | "column" | "mappoints";
    columns: ColumnInfo;
    columnSelected: { name: string; parents: string[] } | null;
    geologicalTopStages: GeologicalStages;
    geologicalBaseStages: GeologicalStages;
    maps: MapInfo;
  };
  chart: ChartConfig | null;
  presets: ChartConfig[];
  chartPath: string;
  chartHash: string;
  settingsXML: string;
  settingsJSON: any;
  settings: {
    topStageKey: string;
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
    },
    columnSelected: null,
    geologicalTopStages: {},
    geologicalBaseStages: {} ,
    maps: {} ,
  },
  chart: null,
  presets: [],
  chartPath: "",
  chartHash: "",
  settingsXML: "",
  settingsJSON: {},
  settings: {
    topStageKey: "",
    baseStageKey: "",
    unitsPerMY: 2,
  },
  useCache: false,
});
