import { Box, Button, TextField } from "@mui/material";
import { observer } from "mobx-react-lite";
import React, { useState, useEffect } from "react";
import { actions, state } from "../state";
import { primary_dark } from "../constant";
import ForwardIcon from '@mui/icons-material/Forward';
import { useNavigate } from "react-router-dom";
import { FormControl, InputLabel, Select, MenuItem } from "@mui/material";

import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import fetchTimescaleData from "../state/timeParser"

//const geologicalStages = ["Gelasian (1.8 Ma top)", "Piacenzian (2.58 Ma top)", "Zanclean (3.6 Ma top)", "Messinian (5.335 Ma top)", "Tortonian (7.25 Ma top)", "Serravallian (11.63 Ma top)", "Langhian (13.82 Ma top)", "Burdigalian (15.99 Ma top)"];

export const Time = observer(function Time() {
    const navigate = useNavigate();
    const [timescaleData, setTimescaleData] = useState<string[]>([]);

    useEffect(() => {
      const loadTimescaleData = async () => {
        const data = await fetchTimescaleData();
        setTimescaleData(data);
      };

      loadTimescaleData();
    }, []);

    const handleButtonClick = () => {
        actions.setTab(1);
        actions.setAllTabs(true);
      
        // Validate the user input
        if (isNaN(state.settings.topAge) || isNaN(state.settings.baseAge) || isNaN(state.settings.unitsPerMY)) {
          // Handle invalid input, show error message, etc.
          return;
        }
    
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
        <TextField
          label="Top Age (Ma)"
          type="number"
          value={state.settings.topAge}
          onChange={(event) => actions.setTopAge(parseFloat(event.target.value))}
          style={{ marginBottom: '10px', width: '100%' }}
        />
        <FormControl style={{ marginBottom: '10px', width: '100%' }}>
        <InputLabel>Stage Name</InputLabel> 
        <Select
          label="Stage Name"
          type="string"
          value={state.settings.selectedStage} 
          onChange={(event) => actions.setSelectedStage(event.target.value as string)}
          style={{ marginBottom: '10px', width: '100%' }}
        >
          {timescaleData.map((stage) => (
            <MenuItem key={stage} value={stage}>
              {stage}
            </MenuItem>
          ))}
        </Select>
        </FormControl>
        <TextField
          label="Base Age (Ma)"
          type="number"
          value={state.settings.baseAge}
          onChange={(event) => actions.setBaseAge(parseFloat(event.target.value))}
          style={{ marginBottom: '10px', width: '100%' }}
        />
        <TextField
          label="Vertical Scale (cm/Ma)"
          type="number"
          value={state.settings.unitsPerMY}
          onChange={(event) => actions.setUnitsPerMY(parseFloat(event.target.value))}
          style={{ marginBottom: '20px', width: '100%' }}
        />
        { /* 
        {settingOptions.map(({ name, label, stateName }) => (
            {() => (
              <FormControlLabel
                control={<Checkbox checked={state.settingsJSON[stateName]} onChange={(event) => actions.updateCheckboxSetting(stateName, event.target.checked)} />}
                label={label}
                style={{ marginBottom: '10px' }}
              />
            )}
        ))} */ }
        <Button
          sx={{ backgroundColor: primary_dark, color: '#FFFFFF', marginTop: '10px' }}
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
          <FormControlLabel control={<Checkbox />} label="Add MouseOver info (popups)" />
          <FormControlLabel control={<Checkbox />} label="Enabled Global Priority Filtering for block columns" />
          <FormControlLabel control={<Checkbox />} label="Enabled stage background for event columns" />
          <FormControlLabel control={<Checkbox />} label="Enable legend for the chart" />
          <FormControlLabel control={<Checkbox />} label="Do not auto-indent lithology patterns" />
          <FormControlLabel control={<Checkbox />} label="Conserve Chart Space in Family Tree Plotting" />
          <FormControlLabel control={<Checkbox />} label="Hide block labels based on priority" />
        </FormGroup>
      </div>
      </div>
      
    )
    
}


)