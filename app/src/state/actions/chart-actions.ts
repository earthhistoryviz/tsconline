import { action } from "mobx";
import { state } from "../state";

export const setChartHeight = action((height: number) => {
  state.chart.height = height;
});

export const setChartWidth = action((width: number) => {
  state.chart.width = width;
});

export const setChartTitle = action((title: string) => {
  state.chart.title = title;
});

export const setBackgroundColor = action((color: string) => {
  state.chart.backgroundColor = color;
});
