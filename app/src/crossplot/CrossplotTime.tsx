import { observer } from "mobx-react-lite";
import { TimeSettings } from "../types";
import { Button, MenuItem, Select, TextField } from "@mui/material";
import { context } from "../state";
import { useContext } from "react";
import { useTranslation } from "react-i18next";
import styles from "./CrossplotTime.module.css";

type CrossplotTimeSelectorProps = {
  unit: string | undefined;
  settings: TimeSettings[string] | undefined;
};
export const CrossplotTimeSelector = observer(function CrossplotTime({ unit, settings }: CrossplotTimeSelectorProps) {
  const { actions } = useContext(context);
  const { t } = useTranslation();
  const checkAgeRange = () => settings && settings.topStageAge > settings.baseStageAge;
  const pleaseSelectAUnit = "Please select a unit";
  return (
    <>
      <TextField
        size="small"
        className="UnitTextField"
        disabled={!settings}
        label={`${unit || pleaseSelectAUnit}`}
        type="number"
        value={!settings || isNaN(settings.topStageAge) ? "" : settings.topStageAge}
        onChange={(event) => {
          if (!settings || !unit) return;
          actions.setTopStageAge(parseFloat(event.target.value), unit);
        }}
        error={checkAgeRange()}
        helperText={checkAgeRange() ? t("settings.time.interval.helper-text") : ""}
        FormHelperTextProps={{ style: { fontSize: "13px" } }}
      />
      <TextField
        size="small"
        className="UnitTextField"
        label={`${unit || pleaseSelectAUnit}`}
        type="number"
        disabled={!settings}
        value={!settings || isNaN(settings.baseStageAge) ? "" : settings.baseStageAge}
        onChange={(event) => {
          if (!settings || !unit) return;
          actions.setBaseStageAge(parseFloat(event.target.value), unit);
        }}
        error={checkAgeRange()}
        helperText={checkAgeRange() ? t("settings.time.interval.helper-text") : ""}
        FormHelperTextProps={{ style: { fontSize: "13px" } }}
      />
      <TextField
        className="VerticalScale"
        label={`${unit ? t("settings.time.interval.vertical-scale") + unit + "):" : pleaseSelectAUnit}`}
        type="number"
        size="small"
        disabled={!settings}
        value={settings?.unitsPerMY || ""}
        onChange={(event) => {
          if (!settings || !unit) return;
          actions.setUnitsPerMY(parseFloat(event.target.value), unit);
        }}
      />
    </>
  );
});

export const CrossplotTime = observer(function CrossplotTime() {
  const { state, actions } = useContext(context);
  return (
    <div className={styles.timeSettingsContainer}>
      <Button onClick={() => { actions.setCrossplotChartX(undefined)}}>Clear</Button>
      <Select

        value={state.crossplotSettingsTabs.chartX?.units || 0}
        onChange={(evt) => {
          const col = state.settingsTabs.columns?.children.find((col) => col.units === evt.target.value);
          if (!col) return;
          actions.setCrossplotChartX(col);
        }}>
        {state.settingsTabs.columns &&
          Object.entries(state.settingsTabs.columns.children).map(([index, column]) => (
            <MenuItem key={index} value={column.units}>
              {`${column.name} (${column.units})`}
            </MenuItem>
          ))}
          <MenuItem value={0}>
            <em>None</em>
          </MenuItem>
      </Select>
      <CrossplotTimeSelector
        unit={state.crossplotSettingsTabs.chartX?.units}
        settings={state.settings.timeSettings[state.crossplotSettingsTabs.chartX?.units || ""]}
      />
      <Select
        value={state.crossplotSettingsTabs.chartY?.units || 0}
        onChange={(evt) => {
          const col = state.settingsTabs.columns?.children.find((col) => col.units === evt.target.value);
          if (!col) return;
          actions.setCrossplotChartY(col);
        }}>
        {state.settingsTabs.columns &&
          Object.entries(state.settingsTabs.columns.children).map(([index, column]) => (
            <MenuItem key={index} value={column.units}>
              {`${column.name} (${column.units})`}
            </MenuItem>
          ))}
          <MenuItem value={0}>
            <em>None</em>
          </MenuItem>
      </Select>
    </div>
  );
});
