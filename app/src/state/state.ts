import { observable } from "mobx";

import { FaciesOptions, MapHistory } from "../types";
import fetchTimescaleData from "../state/timeParser"
import React, { useState, useEffect } from "react";

import type {
  MapHierarchy,
  MapInfo,
  ChartConfig,
  ColumnInfo,
  Facies,
  GeologicalStages,
  Presets,
  DatapackIndex,
  MapPackIndex,
} from "@tsconline/shared";

export interface TimescaleItem {
  key: string;
  value: number;
};

export type State = {
  chartLoading: boolean;
  tab: number;
  showAllTabs: boolean;
  madeChart: boolean;
  showPresetInfo: boolean;
  timescaleData: TimescaleItem[];
  settingsTabs: {
    selected: "time" | "font" | "column" | "mappoints";
    columns: ColumnInfo | null;
    columnSelected: string | null;
    geologicalTopStages: GeologicalStages;
    geologicalBaseStages: GeologicalStages;
    columnHashMap: Map<string, ColumnInfo>;
  };
  mapState: {
    mapInfo: MapInfo;
    mapHierarchy: MapHierarchy;
    currentFaciesOptions: FaciesOptions;
    selectedMap: string | null;
    isLegendOpen: boolean;
    isMapViewerOpen: boolean;
    isFacies: boolean;
    facies: Facies;
    selectedMapAgeRange: {
      minAge: number,
      maxAge: number
    }
    mapHistory: MapHistory
  };
  config: {
    datapacks: string[], // the datapacks used on the server
    settingsPath: string // the path to the settings file on the server
  };
  presets: Presets;
  datapackIndex: DatapackIndex;
  mapPackIndex: MapPackIndex;
  selectedPreset: ChartConfig | null;
  chartPath: string;
  chartHash: string;
  settingsXML: string;
  settingsJSON: any;
  settings: {
    selectedStage: string;
    topStageAge: number;
    topStageKey: string;
    baseStageAge: number;
    baseStageKey: string;
    unitsPerMY: number;
    useDatapackSuggestedAge: boolean;
    selectedBaseStage: string;
    selectedTopStage: string;
  };
  useCache: boolean;
  usePreset: boolean;
  openSnackbar: boolean;
};

export const state = observable<State>({
  chartLoading: false,
  madeChart: false,
  tab: 0,
  showAllTabs: true,
  showPresetInfo: false,
  timescaleData: [],
  // loading: true,
  settingsTabs: {
    selected: "time",
    columns: null,
    columnSelected: null,
    geologicalTopStages: {},
    geologicalBaseStages: {},
    columnHashMap: new Map<string, ColumnInfo>(),
  },
  mapState: {
    mapInfo: {},
    mapHierarchy: {},
    currentFaciesOptions: {
      faciesAge: 0,
      dotSize: 1
    },
    selectedMap: null,
    isLegendOpen: false,
    isMapViewerOpen: false,
    isFacies: false,
    facies: {
      locations: {},
      minAge: 0,
      maxAge: 0,
      aliases: {}
    },
    selectedMapAgeRange: {
      minAge: 0,
      maxAge: 0
    },
    mapHistory: {
      savedHistory: {},
      accessHistory: []
    } 
  },
  config: {
    datapacks: [],
    settingsPath: ""
  },
  presets: {},
  datapackIndex: {},
  mapPackIndex: {},
  selectedPreset: null,
  chartPath: "",
  chartHash: "",
  settingsXML: "",
  settingsJSON: {},
  settings: {
    topStageAge: 0,
    topStageKey: "",
    baseStageAge: 0,
    baseStageKey: "",
    unitsPerMY: 2,
    useDatapackSuggestedAge: false,
    selectedStage: "",
    selectedBaseStage: "",
    selectedTopStage: ""

  },
  useCache: true,
  usePreset: true,
  openSnackbar: false,
});
