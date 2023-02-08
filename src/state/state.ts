import { observable } from 'mobx';

export type State = {
  tab: number,
  chart: number,
};

export const state = observable<State>({
  tab: 0,
  chart: 0,
});
