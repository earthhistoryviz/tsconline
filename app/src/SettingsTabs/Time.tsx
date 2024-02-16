import { Box, Button, TextField } from "@mui/material";
import { observer } from "mobx-react-lite";
import React, { useState, useEffect } from "react";
import { actions, state } from "../state";
import ForwardIcon from "@mui/icons-material/Forward";
import { useNavigate } from "react-router-dom";
import { FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import { useTheme } from '@mui/material/styles';
import { TSCCheckbox, TSCButton } from '../components'
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import fetchTimescaleData from "../state/timeParser"
import { initialize } from "../state/initialize";
import { TimescaleItem } from '../state/state';

import theme from "../theme";

// export interface TimescaleItem {
//   key: string;
//   value: number;
// }

export const Time = observer(function Time() {
  const navigate = useNavigate();
  const [timescaleData, setTimescaleData] = useState<TimescaleItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [previousValues, setPreviousValues] = useState<Record<string, number | null>>({});
  useEffect(() => {
    async function fetchData() {
      const { timescaleData, loading, previousValues } = await initialize();
      setTimescaleData(timescaleData);
      setLoading(loading);
      setPreviousValues(previousValues);
    }

    fetchData();
  }, []);

    const handleButtonClick = () => {
        actions.setTab(1);
        actions.setAllTabs(true);
      
    
        actions.updateSettings(); 
      
        actions.generateChart();
      
        navigate('/chart');
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
        <FormControl style={{ marginBottom: '10px', width: '100%' }}>
        <InputLabel htmlFor="top-age-selector">Top Age/Stage Name</InputLabel> 
        <Select
          inputProps={{ id: 'top-age-selector' }}
          name="top-age-stage-name"
          label="Top Age/Stage Name"
          type="string"
          value={state.settings.selectedTopStage || ''} 
          onChange={(event) => {
            const selectedValue = event.target.value;
            const previousValue = previousValues[selectedValue];
            const selectedAge = previousValue !== undefined && previousValue !== null ? previousValue.toString() : '0.000';
            actions.setSelectedTopStage(selectedValue);
            actions.setTopStageAge(isNaN(parseFloat(selectedAge)) ? 0 : parseFloat(selectedAge));
          }}
          style={{ marginBottom: '10px', width: '100%' }}
        >
          {timescaleData.map(item => (
              <MenuItem key={item.key} value={item.value}>
                {item.key} ({previousValues[item.key] !== null ? previousValues[item.key] : '0.000'} Ma)
            </MenuItem>
          ))}
        </Select>
        <TextField
          label="Top Age"
          type="number"
          name="vertical-scale-text-field"
          value={state.settings.selectedTopStage ? state.settings.selectedTopStage : state.settings.topStageAge.toString()}
          onChange={(event) => {
            const age = parseFloat(event.target.value)
            if (age >= 0 && age <= state.settings.baseStageAge) {
              actions.setSelectedTopStage(event.target.value);
              actions.setTopStageAge(age);
            }
          }}
          style={{ marginBottom: '20px', width: '100%' }}
        />
        </FormControl>
        <FormControl style={{ marginBottom: '10px', width: '100%' }}>
        <InputLabel htmlFor="base-age-selector">Base Age/Stage Name</InputLabel> 
        <Select
          label="Base Age/Stage Name"
          inputProps={{ id: 'base-age-selector' }}
          name="base-age-stage-name"
          type="string"
          value={state.settings.selectedBaseStage || ''}
          onChange={(event) => {
            const selectedValue = event.target.value;
            const selectedAge = (timescaleData.find(item => item.key === selectedValue)?.value || '0').toString();
            actions.setSelectedBaseStage(selectedValue);
            actions.setBaseStageAge(isNaN(parseInt(selectedAge)) ? 0 : parseInt(selectedAge));
          }}
          style={{ marginBottom: '10px', width: '100%' }}
        >
          {timescaleData.map(item => (
            <MenuItem key={item.key} value={item.value}>
              {item.key} ({item.value} Ma)
            </MenuItem>
          ))}
        </Select>
        <TextField
          label="Base Age"
          type="number"
          name="vertical-scale-text-field"
          value={state.settings.selectedBaseStage ? state.settings.selectedBaseStage : state.settings.baseStageAge.toString()}
          onChange={(event) => {
            const age = parseFloat(event.target.value)
            if (age >= 0 && state.settings.topStageAge <= age) {
              actions.setSelectedBaseStage(event.target.value);
              actions.setBaseStageAge(age)
            }
          }}
          style={{ marginBottom: '20px', width: '100%' }}
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
