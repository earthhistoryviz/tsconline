import { observable } from "mobx";

import type {
  MapHierarchy,
  MapInfo,
  ChartConfig,
  ColumnInfo,
  GeologicalStages,
} from "@tsconline/shared";

export type State = {
  chartLoading: boolean;
  tab: number;
  showAllTabs: boolean;
  showPresetInfo: boolean;
  settingsTabs: {
    selected: "time" | "font" | "column" | "mappoints";
    columns: ColumnInfo;
    columnSelected: { name: string; parents: string[] } | null;
    geologicalTopStages: GeologicalStages;
    geologicalBaseStages: GeologicalStages;
    mapInfo: MapInfo;
    mapHierarchy: MapHierarchy;
    selectedMap: string | null;
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
  usePreset: boolean;
};

export const state = observable<State>({
  chartLoading: true,
  tab: 0,
  showAllTabs: false,
  showPresetInfo: false,
  settingsTabs: {
    selected: "time",
    columns: {},
    columnSelected: null,
    geologicalTopStages: {},
    geologicalBaseStages: {},
    mapInfo: {},
    mapHierarchy: {},
    selectedMap: null
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
  useCache: true,
  usePreset: true,
});
