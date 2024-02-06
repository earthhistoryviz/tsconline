import { Box, Button, TextField } from "@mui/material";
import { observer } from "mobx-react-lite";
import React, { useState, useEffect } from "react";
import { actions, state } from "../state";
import { primary_dark } from "../constant";
import ForwardIcon from '@mui/icons-material/Forward';
import { useNavigate } from "react-router-dom";
import { FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import { useTheme } from '@mui/material/styles';
import { TSCCheckbox, TSCButton } from '../components'
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import fetchTimescaleData from "../state/timeParser"
import theme from "../theme";

export interface TimescaleItem {
  key: string;
  value: number;
}

//const geologicalStages = ["Gelasian (1.8 Ma top)", "Piacenzian (2.58 Ma top)", "Zanclean (3.6 Ma top)", "Messinian (5.335 Ma top)", "Tortonian (7.25 Ma top)", "Serravallian (11.63 Ma top)", "Langhian (13.82 Ma top)", "Burdigalian (15.99 Ma top)"];

export const Time = observer(function Time() {
  const navigate = useNavigate();
  const [timescaleData, setTimescaleData] = useState<TimescaleItem[]>([]); // Put into state.ts
  const [loading, setLoading] = useState(true);

  // Importcontexts and map time scale to the state

  useEffect(() => {
    const loadTimescaleData = async () => {
      try {
        const data = await fetchTimescaleData();
        setTimescaleData(data.stages || []);
        setLoading(false);
      } catch (error) {
        console.error('Error loading timescale data:', error);
        setLoading(false);
      }
    };
    loadTimescaleData();
  }, []);

    const handleButtonClick = () => {
        actions.setTab(1);
        actions.setAllTabs(true);
      
    
        actions.updateSettings(); 
      
        actions.generateChart();
      
        navigate('/chart');
      };
      // const transformedTimescaleData: TimescaleItem[] = timescaleData.map((item) => ({
      //   key: item,
      //   value: parseFloat(item) || 0,
      // }));
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
          value={state.settings.selectedStage || ''} 
          onChange={(event) => actions.setSelectedStage(event.target.value as string)}
          style={{ marginBottom: '10px', width: '100%' }}
        >
          {timescaleData.map(item => (
            <MenuItem key={item.key} value={item.value}>
              {item.key} ({item.value} Ma)
            </MenuItem>
          ))}
        </Select>
        <TextField
          label="Top Age"
          type="number"
          name="vertical-scale-text-field"
          value={state.settings.topStageAge}
          onChange={(event) => {
            const age = parseFloat(event.target.value)
            if (age >= 0 && age <= state.settings.baseStageAge) {
              actions.setTopStageAge(age)
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
          value={state.settings.selectedStage || ''} 
          onChange={(event) => actions.setSelectedStage(event.target.value as string)}
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
          value={state.settings.baseStageAge}
          onChange={(event) => {
            const age = parseFloat(event.target.value)
            if (age >= 0 && state.settings.topStageAge <= age) {
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
          onChange={(event) => actions.setUnitsPerMY(parseFloat(event.target.value))}
          style={{ marginBottom: '20px', width: '100%' }}
        />
        <Button
          sx={{ backgroundColor: theme.palette.button.main, color: '#FFFFFF', marginTop: '10px' }}
          onClick={handleButtonClick}
          variant="contained"
          style={{ width: '100%', height: '75px' }}
          endIcon={<ForwardIcon />}
        >
          Make your own chart
        </Button>
      </Box>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
        <FormGroup>
          <FormControlLabel 
          name="mouse-over-info-checkbox"
          control={<TSCCheckbox />} 
          label="Add MouseOver info (popups)" />
          <FormControlLabel
          name="global-priority-checkbox"
          control={<TSCCheckbox />}
          label="Enabled Global Priority Filtering for block columns" />
          <FormControlLabel
          name="stage-background-checkbox"
          control={<TSCCheckbox />} 
          label="Enabled stage background for event columns" />
          <FormControlLabel 
          name="enable-legend-checkbox"
          control={<TSCCheckbox />} 
          label="Enable legend for the chart" />
          <FormControlLabel 
          control={<TSCCheckbox />} 
          name="lithology-auto-indent-checkbox"
          label="Do not auto-indent lithology patterns" />
          <FormControlLabel 
          name="conserve-chart-checkbox"
          control={<TSCCheckbox />} 
          label="Conserve Chart Space in Family Tree Plotting" />
          <FormControlLabel 
          name="hide-block-labels-checkbox"
          control={<TSCCheckbox />} 
          label="Hide block labels based on priority" />
          <FormControlLabel
          name="use-suggested-age-spans"
          control={<TSCCheckbox onChange={(e) => actions.setuseDatapackSuggestedAge(e.target.checked)}/>}
          label="Do not use the Data-Pack's suggested age span" />
        </FormGroup>
      </div>
      </div>
      
    )
    
}


)