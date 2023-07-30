import React, { useContext, useState } from 'react';
import { Button, TextField, Box, FormControlLabel, Checkbox } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ForwardIcon from '@mui/icons-material/Forward';
import { context } from './state';
import { primary_dark } from './constant';
import { settingOptions, updateCheckboxSetting } from './state/actions';

export function Settings() {
  const { state, actions } = useContext(context);
  const navigate = useNavigate();

  const [topAge, setTopAge] = useState(state.settings.topAge);
  const [baseAge, setBaseAge] = useState(state.settings.baseAge);
  const [verticalScale, setVerticalScale] = useState(state.settings.verticalScale);

  const handleButtonClick = () => {
    actions.setTab(1);
    actions.setAllTabs(true);

    // Validate the user input
    if (isNaN(topAge) || isNaN(baseAge) || isNaN(verticalScale)) {
      // Handle invalid input, show error message, etc.
      return;
    }

    actions.updateSettings();

    actions.generateChart();

    navigate('/chart');
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      p={2}
      border={1}
      borderRadius={4}
      borderColor="gray"
      maxWidth="600px" // Adjust the maxWidth here
      margin="0 auto"
      marginTop="50px"
    >
      <TextField
        label="Top Age (Ma)"
        type="number"
        value={topAge}
        onChange={(event) => setTopAge(parseFloat(event.target.value))}
        style={{ marginBottom: '10px', width: '100%' }}
      />
      <TextField
        label="Base Age (Ma)"
        type="number"
        value={baseAge}
        onChange={(event) => setBaseAge(parseFloat(event.target.value))}
        style={{ marginBottom: '10px', width: '100%' }}
      />
      <TextField
        label="Vertical Scale (cm/Ma)"
        type="number"
        value={verticalScale}
        onChange={(event) => setVerticalScale(parseFloat(event.target.value))}
        style={{ marginBottom: '20px', width: '100%' }}
      />
      {settingOptions.map(({ name, label, stateName }) => (
        <FormControlLabel
          key={name}
          control={<Checkbox checked={state.settingsJSON[stateName]} onChange={(event) => updateCheckboxSetting(stateName, event.target.checked)} />}
          label={label}
          style={{ marginBottom: '10px' }} 
        />
      ))}
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
  );
}
