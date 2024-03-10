import { Box, Button, TextField } from "@mui/material";
import { observer } from "mobx-react-lite";
import ForwardIcon from "@mui/icons-material/Forward";
import { useNavigate } from "react-router-dom";
import { FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import { TSCCheckbox } from "../components";
import FormGroup from "@mui/material/FormGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import { useTheme } from "@mui/material/styles";
import { useContext } from "react";
import { context } from "../state/index";
import "./Time.css";

export const Time = observer(function Time() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { state, actions } = useContext(context);

  const handleButtonClick = () => {
    actions.setTab(1);
    actions.fetchChartFromServer(navigate);
  };

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
              if (selectedAge >= 0 && selectedAge <= state.settings.baseStageAge) {
                actions.setSelectedTopStage(selectedValue);
                actions.setTopStageAge(selectedAge);
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
            value={state.settings.topStageAge.toString()}
            onChange={(event) => {
              const age = parseFloat(event.target.value);
              if (!isNaN(age) && age >= 0 && age <= state.settings.baseStageAge) {
                actions.setSelectedTopStage("N/A");
                actions.setTopStageAge(age);
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
              if (selectedAge >= 0 && selectedAge >= state.settings.topStageAge) {
                actions.setSelectedBaseStage(selectedValue);
                actions.setBaseStageAge(selectedAge);
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
            value={state.settings.baseStageAge.toString()}
            onChange={(event) => {
              const age = parseFloat(event.target.value);
              if (!isNaN(age) && age >= 0 && state.settings.topStageAge <= age) {
                actions.setSelectedBaseStage("N/A");
                actions.setBaseStageAge(age);
              }
            }}
          />
        </FormControl>
        <TextField
          className="VerticalScale"
          label="Vertical Scale (cm/Ma)"
          type="number"
          name="vertical-scale-text-field"
          value={state.settings.unitsPerMY}
          onChange={(event) => actions.setUnitsPerMY(parseFloat(event.target.value))}
        />
        <Button
          className="Button"
          sx={{
            backgroundColor: theme.palette.button.main
          }}
          onClick={handleButtonClick}
          variant="contained"
          endIcon={<ForwardIcon />}>
          Make your own chart
        </Button>
      </Box>

      <div style={{ display: "flex", justifyContent: "center", marginTop: "20px" }}>
        <FormGroup>
          <FormControlLabel
            name="mouse-over-info-checkbox"
            control={<TSCCheckbox onChange={(e) => actions.setMouseOverPopupsEnabled(e.target.checked)} />}
            label="Add MouseOver info (popups)"
          />
          <FormControlLabel
            name="global-priority-checkbox"
            control={<TSCCheckbox />}
            label="Enabled Global Priority Filtering for block columns"
          />
          <FormControlLabel
            name="stage-background-checkbox"
            control={<TSCCheckbox />}
            label="Enabled stage background for event columns"
          />
          <FormControlLabel
            name="enable-legend-checkbox"
            control={<TSCCheckbox />}
            label="Enable legend for the chart"
          />
          <FormControlLabel
            control={<TSCCheckbox />}
            name="lithology-auto-indent-checkbox"
            label="Do not auto-indent lithology patterns"
          />
          <FormControlLabel
            name="conserve-chart-checkbox"
            control={<TSCCheckbox />}
            label="Conserve Chart Space in Family Tree Plotting"
          />
          <FormControlLabel
            name="hide-block-labels-checkbox"
            control={<TSCCheckbox />}
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
