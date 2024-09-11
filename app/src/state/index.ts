import { createContext } from "react";
import { state } from "./state";
import * as actions from "./actions";
import { initialize } from "./initialize";
import { ChartState, chartState } from "./chart-state";

export type State = typeof state;
export type Actions = typeof actions;
export { state, actions };

export type Context = {
  state: State;
  actions: Actions;
  chartState: ChartState;
};
export const initialContext = { state, actions, chartState };
export const context = createContext<Context>(initialContext);

if (initialize) initialize(); // returns a promise, but we won't wait for it
