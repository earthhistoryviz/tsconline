import { Box, Button, TextField } from "@mui/material";
import { observer } from "mobx-react-lite";
import { actions, state } from "../state";
import ForwardIcon from "@mui/icons-material/Forward";
import { useNavigate } from "react-router-dom";
import { FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import { TSCCheckbox } from '../components'
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import { useContext } from "react";
import { context } from "../state/index";
import "./Time.css";
import theme from "../theme";

export const Time = observer(function Time() {
  const navigate = useNavigate();
  const { state } = useContext(context);
  
    const handleButtonClick = () => {
        actions.setTab(1);
        // actions.setAllTabs(true);
      
        actions.updateSettings(); 
      
        actions.generateChart();
      
        navigate('/chart');
      };

    return (
      <div>
        <Box className="Box">
        <FormControl className="FormControlTop">
        <InputLabel htmlFor="top-age-selector">Top Age/Stage Name</InputLabel>
        <Select
          className="SelectTop"
          inputProps={{ id: 'top-age-selector' }}
          name="top-age-stage-name"
          label="Top Age/Stage Name"
          value={state.settings.topStageKey}
          onChange={(event) => {
            const selectedValue = event.target.value;
            const selectedAgeItem = state.settings.geologicalTopStageAges.find(item => item.key === selectedValue);
            const selectedAge = selectedAgeItem?.value?.toString() || '0';
            const selectedAgeNumber = parseFloat(selectedAge);
            if (selectedAgeNumber >= 0 && selectedAgeNumber <= state.settings.baseStageAge) {
              actions.setSelectedTopStage(selectedValue);
              actions.setTopStageAge(selectedAgeNumber);
            }
          }}
        >
          {state.settings.geologicalTopStageAges.map(item => (
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
              actions.setSelectedTopStage(age.toString());
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
          inputProps={{ id: 'base-age-selector' }}
          name="base-age-stage-name"
          value={state.settings.baseStageKey}
          onChange={(event) => {
            const selectedValue = event.target.value;
            const selectedAgeItem = state.settings.geologicalBaseStageAges.find(item => item.key === selectedValue);
            const selectedAge = selectedAgeItem?.value?.toString() || '0';
            const selectedAgeNumber = parseFloat(selectedAge);
            if (selectedAgeNumber >= 0 && selectedAgeNumber >= state.settings.topStageAge) { 
              actions.setSelectedBaseStage(selectedValue);
              actions.setBaseStageAge(selectedAgeNumber);
            }
          }}
        >
          {state.settings.geologicalBaseStageAges.map(item => (
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
              actions.setSelectedBaseStage(age.toString());
              actions.setBaseStageAge(age);
            }
          }}
        />
        </FormControl>
        <TextField className="VerticalScale"
          label="Vertical Scale (cm/Ma)"
          type="number"
          name="vertical-scale-text-field"
          value={state.settings.unitsPerMY}
          onChange={(event) =>
            actions.setUnitsPerMY(parseFloat(event.target.value))
          }
        />
        <Button
          className="Button"
          sx={{
            backgroundColor: theme.palette.button.main,
          }}
          onClick={handleButtonClick}
          variant="contained"
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
                  actions.setuseDatapackSuggestedAge(e.target.checked)
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
