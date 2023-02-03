import { action } from 'mobx';
import { state, State } from './state';

export const setTab = action('setTab', (newval: number) => {
  state.tab = newval;
});
