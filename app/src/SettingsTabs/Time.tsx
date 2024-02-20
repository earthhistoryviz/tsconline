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
import fetchTimescaleData from "../state/TimeParser"
import { initialize } from "../state/initialize";
import { TimescaleItem } from '@tsconline/shared';

import "./Time.css";
import theme from "../theme";
import { fetchTimescaleDataAction } from "../state/actions";

export const Time = observer(function Time() {
  const navigate = useNavigate();
  const [GeologicalTopStageAges, setGeologicalTopStageAges] = useState<TimescaleItem[]>([]);
  const [GeologicalBaseStageAges, setGeologicalBaseStageAges] = useState<TimescaleItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  
  useEffect(() => {
    const fetchData = async () => {
        const { GeologicalTopStageAges, GeologicalBaseStageAges, loading } = await fetchTimescaleDataAction();
        setGeologicalTopStageAges(GeologicalTopStageAges);
        setGeologicalBaseStageAges(GeologicalBaseStageAges);
        setLoading(loading);
    };

    fetchData();
}, []);
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
        <Select className="SelectTop"
            inputProps={{ id: 'top-age-selector' }}
            name="top-age-stage-name"
            label="Top Age/Stage Name"
            value={state.settings.topStageKey} 
            onChange={(event) => {
              const selectedValue = event.target.value;
              const selectedAgeItem = GeologicalTopStageAges.find(item => item.key === selectedValue);
              const selectedAge = selectedAgeItem?.value?.toString() || '0';
              const selectedAgeNumber = parseFloat(selectedAge);
              if (selectedAgeNumber >= 0 && selectedAge <= state.settings.baseStageKey)
              actions.setSelectedTopStage(selectedValue);
              actions.setTopStageAge(parseFloat(selectedAge));
            }}
          >
          {GeologicalTopStageAges.map(item => (
              <MenuItem key={item.key} value={item.key}>
                  {item.key} ({item.value} Ma)
              </MenuItem>
          ))}
        </Select>
        <TextField className="TopAgeTextField"
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
          style={{ marginBottom: '20px', width: '100%' }} // Not working
        />
          </FormControl>
        <FormControl className="FormControlBaseAgeStageName">
        <InputLabel htmlFor="base-age-selector">Base Age/Stage Name</InputLabel> 
        <Select className="SelectBase"
          label="Base Age/Stage Name"
          inputProps={{ id: 'base-age-selector' }}
          name="base-age-stage-name"
          type="string"
          value={state.settings.baseStageKey}
          onChange={(event) => {
            const selectedValue = event.target.value;
            const selectedAgeItem = GeologicalBaseStageAges.find(item => item.key === selectedValue);
            const selectedAge = selectedAgeItem?.value?.toString() || '0';
            const selectedAgeNumber = parseFloat(selectedAge);
            if (selectedAgeNumber >= 0 && selectedAge >= state.settings.topStageKey) {
              actions.setSelectedBaseStage(selectedValue);
              actions.setBaseStageAge(isNaN(parseInt(selectedAge)) ? 0 : parseInt(selectedAge));
            }
          }}
        >
          {GeologicalBaseStageAges.map(item => (
            <MenuItem key={item.key} value={item.value}>
              {item.key} ({item.value} Ma)
            </MenuItem>
          ))}
        </Select>
        <TextField className="BaseAgeTextField"
          label="Base Age"
          type="number"
          name="vertical-scale-text-field"
          value={state.settings.baseStageKey ? state.settings.baseStageKey : state.settings.baseStageAge.toString()}
          onChange={(event) => {
            const age = parseFloat(event.target.value)
            if (age >= 0 && state.settings.topStageAge <= age) {
              actions.setSelectedBaseStage(event.target.value);
              actions.setBaseStageAge(age)
            }
          }}
          style={{ marginBottom: '20px', width: '100%' }} // Not working
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
          style={{ marginBottom: "20px", width: "100%" }} // Not working
        />
        <Button
          className="Button"
          sx={{
            backgroundColor: theme.palette.button.main,
            // color: "#FFFFFF",
            // marginTop: "10px",
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
