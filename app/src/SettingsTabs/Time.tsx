import { Box, Button, TextField } from "@mui/material";
import { observer } from "mobx-react-lite";
import React from "react";
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

export const Time = observer(function Time() {
    const theme = useTheme();
    const navigate = useNavigate();

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
        <InputLabel>Top Age/Stage Name</InputLabel> 
        <Select
          label="Top Age/Stage Name"
          type="string"
          value={state.settings.topStageKey} 
          onChange={(event) => {
            // console.log("event.target.value: " , event.target.value)
            actions.setTopStageKey(event.target.value)
            actions.updateSettings()
          }}
          style={{ marginBottom: '10px', width: '100%' }}
        >
          {Object.keys(state.settingsTabs.geologicalTopStages).length > 1 && Object.keys(state.settingsTabs.geologicalTopStages).map((key) => (
            <MenuItem value={key} key={key}>
              {`${key} (${state.settingsTabs.geologicalTopStages[key]} Ma top)`}
            </MenuItem>
          ))}
        </Select>
        </FormControl>
        <FormControl style={{ marginBottom: '10px', width: '100%' }}>
        <InputLabel>Base Age/Stage Name</InputLabel> 
        <Select
          label="Base Age/Stage Name"
          type="string"
          value={state.settings.baseStageKey} 
          onChange={(event) => {
            // console.log("event.target.value: " , event.target.value)
            actions.setBaseStageKey(event.target.value)
            actions.updateSettings()
          }}
          style={{ marginBottom: '10px', width: '100%' }}
        >
          {state.settingsTabs.geologicalTopStages && Object.keys(state.settingsTabs.geologicalBaseStages).map((key) => (
            <MenuItem value={key} key={key}>
              {`${key} (${state.settingsTabs.geologicalBaseStages[key]} Ma base)`}
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
          <FormControlLabel control={<TSCCheckbox />} label="Add MouseOver info (popups)" />
          <FormControlLabel control={<TSCCheckbox />} label="Enabled Global Priority Filtering for block columns" />
          <FormControlLabel control={<TSCCheckbox />} label="Enabled stage background for event columns" />
          <FormControlLabel control={<TSCCheckbox />} label="Enable legend for the chart" />
          <FormControlLabel control={<TSCCheckbox />} label="Do not auto-indent lithology patterns" />
          <FormControlLabel control={<TSCCheckbox />} label="Conserve Chart Space in Family Tree Plotting" />
          <FormControlLabel control={<TSCCheckbox />} label="Hide block labels based on priority" />
        </FormGroup>
      </div>
      </div>
      
    )
    
}


)