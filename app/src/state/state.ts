import { observable } from 'mobx';

import type { ChartConfig } from '@tsconline/shared';


export type ColumnSetting = {
  [name: string]: {
     on: boolean,
    children: ColumnSetting | null,
  },
};

export type State = {
  tab: number,
  showAllTabs: boolean,
  settingsTabs: {
    selected: 'time' | 'font' | 'column' | 'mappoints',
    columns:  ColumnSetting,
  },
  chart: ChartConfig | null,
  presets: ChartConfig[],
  chartPath: string,
  settingsXML: string,
  settingsJSON: any, 
  settings: {
    topAge: number,
    baseAge: number,
    unitsPerMY: number,
  },
};

export const state = observable<State>({
  tab: 0,
  showAllTabs: false,
  settingsTabs: {
    selected: 'time',
    columns: {
      'MA': { on: false, children: null },
      'Standard Chronostratigraphy': { on: false, children: null },
      'Planetary Time Scale': { on: false, children: null },
      'Regional Stages': { on: false, children: null },
      'Geomagnetic Polarity': { on: false, children: null },
      'Marine Macrofossils': { on: false, children: null },
      'Microfossils': { on: false, children: null },
    },
  },
  chart: null,
  presets: [],
  chartPath: '',
  settingsXML: '',
  settingsJSON: {}, 
  settings: {
    topAge: 0,
    baseAge: 20,
    unitsPerMY: 2,
  },
});
