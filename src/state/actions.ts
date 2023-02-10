import { action } from 'mobx';
import { state, State } from './state';

export const setTab = action('setTab', (newval: number) => {
  state.tab = newval;
});

export const setChart= action('setChart', (newval: number) => {
  state.chart = state.charts[newval]!;
});
