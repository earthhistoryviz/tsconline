import { observable } from 'mobx';

import type { ChartConfig } from '@tsconline/shared';

export type State = {
  tab: number,
  showAllTabs: boolean,
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
