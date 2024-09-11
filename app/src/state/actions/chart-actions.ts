import { action } from "mobx";
import { state } from "../state";
import { chartState } from "../chart-state";

export const setChartHeight = action((height: number) => {
  chartState.height = height;
});

export const setChartWidth = action((width: number) => {
  chartState.width = width;
});

export const setBackgroundColor = action((color: string) => {
  chartState.backgroundColor = color;
});
