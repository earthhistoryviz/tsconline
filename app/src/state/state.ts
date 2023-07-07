import { observable } from 'mobx';

import type { ChartConfig } from '@tsconline/shared';

export type State = {
  tab: number,
  showAllTabs: boolean,
  chart: ChartConfig | null,
  presets: ChartConfig[],
  chartPath: string,
  settingsXML: string,
  settings: {
    topAge: number,
    baseAge: number,
    verticalScale: number,
  },
};

export const state = observable<State>({
  tab: 0,
  showAllTabs: false,
  chart: null,
  presets: [],
  chartPath: '',
  settingsXML: '',
  settings: {
    topAge: 0,
    baseAge: 30,
    verticalScale: 2,
  },
});
