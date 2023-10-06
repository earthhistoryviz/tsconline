import { observable } from 'mobx';

import type { ChartConfig } from '@tsconline/shared';

export type State = {
  tab: number,
  showAllTabs: boolean,
  settingsTabs: {
    selected: 'time' | 'font' | 'column' | 'mappoints',
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
