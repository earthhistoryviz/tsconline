import { Box, TextField } from "@mui/material";
import { observer } from "mobx-react-lite";
import { FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import { TSCCheckbox } from "../components";
import FormGroup from "@mui/material/FormGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import { useContext } from "react";
import { context } from "../state/index";
import "./Time.css";
import { ErrorCodes } from "../util/error-codes";

export const Time = observer(function Time() {
  const { state, actions } = useContext(context);

  return (
    <div>
      <Box className="Box">
        <FormControl className="FormControlTop">
          <InputLabel htmlFor="top-age-selector">Top Age/Stage Name</InputLabel>
          <Select
            className="SelectTop"
            inputProps={{ id: "top-age-selector" }}
            name="top-age-stage-name"
            label="Top Age/Stage Name"
            value={state.settings.topStageKey}
            onChange={(event) => {
              const selectedValue = event.target.value;
              const selectedAgeItem = state.geologicalTopStageAges.find((item) => item.key === selectedValue);
              const selectedAge = selectedAgeItem?.value || 0;
              if (selectedAgeItem) {
                actions.setSelectedTopStage(selectedValue);
              }
              actions.setTopStageAge(selectedAge);
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
            value={state.settings.topStageAge}
            onChange={(event) => {
              const age = parseFloat(event.target.value);
              if (!isNaN(age)) {
                actions.setTopStageAge(age);
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
            value={state.settings.baseStageKey}
            onChange={(event) => {
              const selectedValue = event.target.value;
              const selectedAgeItem = state.geologicalBaseStageAges.find((item) => item.key === selectedValue);
              const selectedAge = selectedAgeItem?.value || 0;
              actions.setBaseStageAge(selectedAge);
            }}>
            {state.geologicalBaseStageAges
              .filter((item) => item.value >= state.settings.topStageAge)
              .map((item) => (
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
            value={state.settings.baseStageAge}
            onChange={(event) => {
              const age = parseFloat(event.target.value);
              actions.setBaseStageAge(age);
            }}
          />
        </FormControl>
        <TextField
          className="VerticalScale"
          label="Vertical Scale (cm/unit)"
          type="number"
          name="vertical-scale-text-field"
          value={state.settings.unitsPerMY}
          onChange={(event) => actions.setUnitsPerMY(parseFloat(event.target.value))}
        />
      </Box>

      <div style={{ display: "flex", justifyContent: "center", marginTop: "20px" }}>
        <FormGroup>
          <FormControlLabel
            name="skip-empty-columns"
            control={
              <TSCCheckbox
                onChange={(e) => actions.setSkipEmptyColumns(e.target.checked)}
                checked={state.settings.skipEmptyColumns}
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
            control={<TSCCheckbox onChange={(e) => actions.setuseDatapackSuggestedAge(!e.target.checked)} />}
            label="Do not use the Data-Pack's suggested age span"
          />
        </FormGroup>
      </div>
    </div>
  );
});
