import { Box, Button, TextField } from "@mui/material";
import { observer } from "mobx-react-lite";
import React from "react";
import { actions, state } from "../state";
import { primary_dark } from "../constant";
import ForwardIcon from '@mui/icons-material/Forward';
import { useNavigate } from "react-router-dom";
import { FormControl, InputLabel, Select, MenuItem } from "@mui/material";

import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';

export const Time = observer(function Time() {
    const navigate = useNavigate();

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
        {/* <TextField
          label="Top Age (Ma)"
          type="number"
          value={state.settings.topAge}
          onChange={(event) => actions.setTopAge(parseFloat(event.target.value))}
          style={{ marginBottom: '10px', width: '100%' }}
        /> */}
        <FormControl style={{ marginBottom: '10px', width: '100%' }}>
        <InputLabel>Base Age/Stage Name</InputLabel> 
        <Select
          label="Base Age/Stage Name"
          type="string"
          value={state.settings.baseStageName} 
          onChange={(event) => {
            // console.log("event.target.value: " , event.target.value)
            actions.setBaseStageName(event.target.value)
            actions.setBaseStageAge(state.settingsTabs.geologicalStages[event.target.value])
          }}
          style={{ marginBottom: '10px', width: '100%' }}
        >
          {Object.keys(state.settingsTabs.geologicalStages).map((key) => (
            <MenuItem value={key} key={key}>
              {`${key} (${state.settingsTabs.geologicalStages[key]} Ma base)`}
            </MenuItem>
          ))}
        </Select>
        </FormControl>
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