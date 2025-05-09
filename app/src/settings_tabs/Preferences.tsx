import { Box, FormGroup, FormControlLabel } from "@mui/material";
import { observer } from "mobx-react-lite";
import { useContext } from "react";
import { context } from "../state/index";
import { useTranslation } from "react-i18next";
import { TSCCheckbox } from "../components";
import "./Preferences.css";

export const Preferences = observer(function Preferences() {
  const { state, actions } = useContext(context);
  const units = Object.keys(state.settings.timeSettings)[0];
  const { t } = useTranslation();

  if (!units || !state.settings.timeSettings[units]) {
    throw new Error("Invalid unit provided or unit not found in timeSettings");
  }

  return (
    <div className="preferences-container">
      <Box className="preferences-settings-container">
        <FormGroup>
          <FormControlLabel
            name="skip-empty-columns"
            control={
              <TSCCheckbox
                className="preferences-checkbox"
                onChange={(e) => actions.setSkipEmptyColumns(e.target.checked, units)}
                checked={state.settings.timeSettings[units]?.skipEmptyColumns || false}
              />
            }
            label={t("settings.preferences.checkboxs.skip-empty-columns")}
          />
          <FormControlLabel
            name="mouse-over-info-checkbox"
            control={
              <TSCCheckbox
                className="preferences-checkbox"
                onChange={(e) => actions.setMouseOverPopupsEnabled(e.target.checked)}
                checked={state.settings.mouseOverPopupsEnabled}
              />
            }
            label={t("settings.preferences.checkboxs.mouse-over-info")}
          />
          <FormControlLabel
            name="global-priority-checkbox"
            control={
              <TSCCheckbox
                className="preferences-checkbox"
                onChange={(e) => actions.setEnablePriority(e.target.checked)}
                checked={state.settings.enablePriority}
              />
            }
            label={t("settings.preferences.checkboxs.global-priority")}
          />
          <FormControlLabel
            name="stage-background-checkbox"
            control={
              <TSCCheckbox
                className="preferences-checkbox"
                onChange={(e) => actions.setEnableColumnBackground(e.target.checked)}
                checked={state.settings.enableColumnBackground}
              />
            }
            label={t("settings.preferences.checkboxs.stage-background")}
          />
          <FormControlLabel
            name="enable-legend-checkbox"
            control={
              <TSCCheckbox
                className="preferences-checkbox"
                onChange={(e) => actions.setEnableChartLegend(e.target.checked)}
                checked={state.settings.enableChartLegend}
              />
            }
            label={t("settings.preferences.checkboxs.enable-legend")}
          />
          <FormControlLabel
            control={
              <TSCCheckbox
                className="preferences-checkbox"
                onChange={(e) => actions.setNoIndentPattern(e.target.checked)}
                checked={state.settings.noIndentPattern}
              />
            }
            name="lithology-auto-indent-checkbox"
            label={t("settings.preferences.checkboxs.lithology-auto-indent")}
          />
          <FormControlLabel
            name="conserve-chart-checkbox"
            control={<TSCCheckbox className="preferences-checkbox" />}
            label={t("settings.preferences.checkboxs.conserve-chart")}
          />
          <FormControlLabel
            name="hide-block-labels-checkbox"
            control={
              <TSCCheckbox
                className="preferences-checkbox"
                onChange={(e) => actions.setEnableHideBlockLabel(e.target.checked)}
                checked={state.settings.enableHideBlockLabel}
              />
            }
            label={t("settings.preferences.checkboxs.hide-block-labels")}
          />
        </FormGroup>
      </Box>
    </div>
  );
});
