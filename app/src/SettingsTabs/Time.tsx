import { Box, Button, TextField } from "@mui/material";
import { observer } from "mobx-react-lite";
import { actions, state } from "../state";
import ForwardIcon from "@mui/icons-material/Forward";
import { useNavigate } from "react-router-dom";
import { FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { TSCCheckbox } from "../components";
import FormGroup from "@mui/material/FormGroup";
import FormControlLabel from "@mui/material/FormControlLabel";

export const Time = observer(function Time() {
  const theme = useTheme();
  const navigate = useNavigate();

  const handleButtonClick = () => {
    actions.setTab(1);

    actions.updateSettings();

    actions.generateChart();

    navigate("/chart");
  };
  return (
    <div>
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        p={2}
        border={1}
        borderRadius={4}
        borderColor="gray"
        maxWidth="600px"
        margin="0 auto"
        marginTop="50px"
      >
        {/* <TextField
          label="Top Age (Ma)"
          type="number"
          value={state.settings.topAge}
          onChange={(event) => actions.setTopAge(parseFloat(event.target.value))}
          style={{ marginBottom: '10px', width: '100%' }}
        /> */}
        <FormControl style={{ marginBottom: "10px", width: "100%" }}>
          <InputLabel htmlFor="top-age-selector">Top Age/Stage Name</InputLabel>
          <Select
            inputProps={{ id: "top-age-selector" }}
            name="top-age-stage-name"
            label="Top Age/Stage Name"
            type="string"
            value={state.settings.topStageKey}
            onChange={(event) => {
              // console.log("event.target.value: " , event.target.value)
              actions.setTopStageKey(event.target.value);
              actions.updateSettings();
            }}
            style={{ marginBottom: "10px", width: "100%" }}
          >
            {Object.keys(state.settingsTabs.geologicalTopStages).length > 1 &&
              Object.keys(state.settingsTabs.geologicalTopStages).map((key) => (
                <MenuItem value={key} key={key}>
                  {`${key} (${state.settingsTabs.geologicalTopStages[key]} Ma top)`}
                </MenuItem>
              ))}
          </Select>
          <TextField
            label="Top Age"
            type="number"
            name="vertical-scale-text-field"
            value={state.settings.topStageAge}
            onChange={(event) => {
              const age = parseFloat(event.target.value);
              if (age >= 0 && age <= state.settings.baseStageAge) {
                actions.setTopStageAge(age);
              }
            }}
            style={{ marginBottom: "20px", width: "100%" }}
          />
        </FormControl>
        <FormControl style={{ marginBottom: "10px", width: "100%" }}>
          <InputLabel htmlFor="base-age-selector">
            Base Age/Stage Name
          </InputLabel>
          <Select
            label="Base Age/Stage Name"
            inputProps={{ id: "base-age-selector" }}
            name="base-age-stage-name"
            type="string"
            value={state.settings.baseStageKey}
            onChange={(event) => {
              // console.log("event.target.value: " , event.target.value)
              actions.setBaseStageKey(event.target.value);
            }}
            style={{ marginBottom: "10px", width: "100%" }}
          >
            {state.settingsTabs.geologicalTopStages &&
              Object.keys(state.settingsTabs.geologicalBaseStages).map(
                (key) => (
                  <MenuItem value={key} key={key}>
                    {`${key} (${state.settingsTabs.geologicalBaseStages[key]} Ma base)`}
                  </MenuItem>
                )
              )}
          </Select>
          <TextField
            label="Base Age"
            type="number"
            name="vertical-scale-text-field"
            value={state.settings.baseStageAge}
            onChange={(event) => {
              const age = parseFloat(event.target.value);
              if (age >= 0 && state.settings.topStageAge <= age) {
                actions.setBaseStageAge(age);
              }
            }}
            style={{ marginBottom: "20px", width: "100%" }}
          />
        </FormControl>
        <TextField
          label="Vertical Scale (cm/Ma)"
          type="number"
          name="vertical-scale-text-field"
          value={state.settings.unitsPerMY}
          onChange={(event) =>
            actions.setUnitsPerMY(parseFloat(event.target.value))
          }
          style={{ marginBottom: "20px", width: "100%" }}
        />
        <Button
          sx={{
            backgroundColor: theme.palette.button.main,
            color: "#FFFFFF",
            marginTop: "10px",
          }}
          onClick={handleButtonClick}
          variant="contained"
          style={{ width: "100%", height: "75px" }}
          endIcon={<ForwardIcon />}
        >
          Make your own chart
        </Button>
      </Box>

      <div
        style={{ display: "flex", justifyContent: "center", marginTop: "20px" }}
      >
        <FormGroup>
          <FormControlLabel
            name="mouse-over-info-checkbox"
            control={<TSCCheckbox />}
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
            control={
              <TSCCheckbox
                onChange={(e) =>
                  actions.setUseSuggestedAge(!e.target.checked)
                }
              />
            }
            label="Do not use the Data-Pack's suggested age span"
          />
        </FormGroup>
      </div>
    </div>
  );
});
