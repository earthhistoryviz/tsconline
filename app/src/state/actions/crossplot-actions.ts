import { action } from "mobx";
import { CrossplotTimeSettings } from "../../types";
import { state } from "../state";

export const setCrossplotChartXTimeSettings = action((timeSettings: Partial<CrossplotTimeSettings>) => {
  state.crossplotSettingsTabs.chartXTimeSettings = {
    ...state.crossplotSettingsTabs.chartXTimeSettings,
    ...timeSettings
  };
});
export const setCrossplotChartYTimeSettings = action((timeSettings: Partial<CrossplotTimeSettings>) => {
  state.crossplotSettingsTabs.chartYTimeSettings = {
    ...state.crossplotSettingsTabs.chartYTimeSettings,
    ...timeSettings
  };
});
