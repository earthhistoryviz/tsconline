import { observable } from 'mobx';

export type State = {
  tab: number,
};

export const state = observable<State>({
  tab: 0,
});
