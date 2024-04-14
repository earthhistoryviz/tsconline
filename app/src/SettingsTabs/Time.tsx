import { Box, TextField, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { observer } from "mobx-react-lite";
import { FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import { TSCCheckbox } from "../components";
import FormGroup from "@mui/material/FormGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import { useContext, useState } from "react";
import { context } from "../state/index";
import "./Time.css";
import { ErrorCodes } from "../util/error-codes";

export const Time = observer(function Time() {
  const { state, actions } = useContext(context);
  const [units, setUnits] = useState<string>(Array.from(state.config.unitsUsed)[0]);
  if (!units) {
    throw new Error("There must be a unit used in the config");
  }
  return (
    <div>
      <ToggleButtonGroup
        value={units}
        exclusive
        onChange={(_event: React.MouseEvent<HTMLElement>, value: string) => {
          if (value === null) {
            return;
          }
          setUnits(value);
        }}
        className="ToggleButtonGroup"
        aria-label="Units">
        {Array.from(state.config.unitsUsed).map((unit) => (
          <ToggleButton key={unit} value={unit} disableRipple>
            {unit}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      <Box className="Box">
        <FormControl className="FormControlTop">
          <InputLabel htmlFor="top-age-selector">Top Age/Stage Name</InputLabel>
          <Select
            className="SelectTop"
            inputProps={{ id: "top-age-selector" }}
            name="top-age-stage-name"
            label="Top Age/Stage Name"
            value={state.settings.timeSettings[units].topStageKey}
            onChange={(event) => {
              const selectedValue = event.target.value;
              const selectedAgeItem = state.geologicalTopStageAges.find((item) => item.key === selectedValue);
              const selectedAge = selectedAgeItem?.value || 0;
              if (selectedAge >= 0 && selectedAge <= state.settings.timeSettings[units].baseStageAge) {
                actions.setTopStageKey(selectedValue, units);
                actions.setTopStageAge(selectedAge, units);
                actions.removeError(ErrorCodes.TOP_STAGE_AGE_INVALID);
              } else {
                actions.pushError(ErrorCodes.TOP_STAGE_AGE_INVALID);
              }
            }}>
            {state.geologicalTopStageAges.map((item) => (
              <MenuItem key={item.key} value={item.key}>
                {item.key} ({item.value} Ma)
              </MenuItem>
            ))}
          </Select>
          <TextField
            className="TopAgeTextField"
            label="Top Age"
            type="number"
            name="vertical-scale-text-field"
            value={state.settings.timeSettings[units].topStageAge}
            onChange={(event) => {
              const age = parseFloat(event.target.value);
              if (!isNaN(age) && age >= 0 && age <= state.settings.timeSettings[units].baseStageAge) {
                actions.setTopStageKey("", units);
                actions.setTopStageAge(age, units);
                actions.removeError(ErrorCodes.TOP_STAGE_AGE_INVALID);
              } else {
                actions.pushError(ErrorCodes.TOP_STAGE_AGE_INVALID);
              }
            }}
          />
        </FormControl>
        <FormControl className="FormControlBaseAgeStageName">
          <InputLabel htmlFor="base-age-selector">Base Age/Stage Name</InputLabel>
          <Select
            className="SelectBase"
            label="Base Age/Stage Name"
            inputProps={{ id: "base-age-selector" }}
            name="base-age-stage-name"
            value={state.settings.timeSettings[units].baseStageKey}
            onChange={(event) => {
              const selectedValue = event.target.value;
              const selectedAgeItem = state.geologicalBaseStageAges.find((item) => item.key === selectedValue);
              const selectedAge = selectedAgeItem?.value || 0;
              if (selectedAge >= 0 && selectedAge >= state.settings.timeSettings[units].topStageAge) {
                actions.setBaseStageKey(selectedValue, units);
                actions.setBaseStageAge(selectedAge, units);
                actions.removeError(ErrorCodes.BASE_STAGE_AGE_INVALID);
              } else {
                actions.pushError(ErrorCodes.BASE_STAGE_AGE_INVALID);
              }
            }}>
            {state.geologicalBaseStageAges.map((item) => (
              <MenuItem key={item.key} value={item.key}>
                {item.key} ({item.value} Ma)
              </MenuItem>
            ))}
          </Select>
          <TextField
            className="BaseAgeTextField"
            label="Base Age"
            type="number"
            name="vertical-scale-text-field"
            value={state.settings.timeSettings[units].baseStageAge}
            onChange={(event) => {
              const age = parseFloat(event.target.value);
              if (!isNaN(age) && age >= 0 && state.settings.timeSettings[units].topStageAge <= age) {
                actions.setBaseStageKey("", units);
                actions.setBaseStageAge(age, units);
                actions.removeError(ErrorCodes.BASE_STAGE_AGE_INVALID);
              } else {
                actions.pushError(ErrorCodes.BASE_STAGE_AGE_INVALID);
              }
            }}
          />
        </FormControl>
        <TextField
          className="VerticalScale"
          label="Vertical Scale (cm/unit)"
          type="number"
          name="vertical-scale-text-field"
          value={state.settings.timeSettings[units].unitsPerMY}
          onChange={(event) => actions.setUnitsPerMY(parseFloat(event.target.value), units)}
        />
      </Box>
      <div style={{ display: "flex", justifyContent: "center", marginTop: "20px" }}>
        <FormGroup>
          <FormControlLabel
            name="skip-empty-columns"
            control={
              <TSCCheckbox
                onChange={(e) => actions.setSkipEmptyColumns(e.target.checked, units)}
                checked={state.settings.timeSettings[units].skipEmptyColumns}
              />
            }
            label="Gray out (and do not draw) columns which do not have data on the selected time interval"
          />
          <FormControlLabel
            name="mouse-over-info-checkbox"
            control={
              <TSCCheckbox
                onChange={(e) => actions.setMouseOverPopupsEnabled(e.target.checked)}
                checked={state.settings.mouseOverPopupsEnabled}
              />
            }
            label="Add MouseOver info (popups)"
          />
          <FormControlLabel
            name="global-priority-checkbox"
            control={
              <TSCCheckbox
                onChange={(e) => actions.setEnablePriority(e.target.checked)}
                checked={state.settings.enablePriority}
              />
            }
            label="Enabled Global Priority Filtering for block columns"
          />
          <FormControlLabel
            name="stage-background-checkbox"
            control={
              <TSCCheckbox
                onChange={(e) => actions.setEnableColumnBackground(e.target.checked)}
                checked={state.settings.enableColumnBackground}
              />
            }
            label="Enabled stage background for event columns"
          />
          <FormControlLabel
            name="enable-legend-checkbox"
            control={
              <TSCCheckbox
                onChange={(e) => actions.setEnableChartLegend(e.target.checked)}
                checked={state.settings.enableChartLegend}
              />
            }
            label="Enable legend for the chart"
          />
          <FormControlLabel
            control={
              <TSCCheckbox
                onChange={(e) => actions.setNoIndentPattern(e.target.checked)}
                checked={state.settings.noIndentPattern}
              />
            }
            name="lithology-auto-indent-checkbox"
            label="Do not auto-indent lithology patterns"
          />
          <FormControlLabel
            name="conserve-chart-checkbox"
            control={<TSCCheckbox />}
            label="Conserve Chart Space in Family Tree Plotting (Not implemented)"
          />
          <FormControlLabel
            name="hide-block-labels-checkbox"
            control={
              <TSCCheckbox
                onChange={(e) => actions.setEnableHideBlockLabel(e.target.checked)}
                checked={state.settings.enableHideBlockLabel}
              />
            }
            label="Hide block labels based on priority"
          />
          <FormControlLabel
            name="use-suggested-age-spans"
            control={
              <TSCCheckbox
                onChange={(e) => actions.setuseDatapackSuggestedAge(!e.target.checked)}
                checked={!state.settings.useDatapackSuggestedAge}
              />
            }
            label="Do not use the Data-Pack's suggested age span"
          />
        </FormGroup>
      </div>
    </div>
  );
});
