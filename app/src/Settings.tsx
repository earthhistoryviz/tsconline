import React, { useContext } from 'react';
import { Button, TextField, Box, FormControlLabel, Checkbox, Tabs, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ForwardIcon from '@mui/icons-material/Forward';
import { context } from './state';
import { primary_dark } from './constant';
import { settingOptions, updateCheckboxSetting } from './state/actions';
import { observer } from 'mobx-react-lite';
import Tab from '@mui/material/Tab';
import { Column } from './SettingsTabs/Column';
import { Time } from './SettingsTabs/Time';
import { Font } from './SettingsTabs/Font';
import { MapPoint } from './SettingsTabs/MapPoint';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
}

export const Settings = observer(function Settings() {
  const { state, actions } = useContext(context);
  const navigate = useNavigate();
  const [value, setValue] = React.useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };
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
  
console.log('RENDER: state = ', state.settings);

  return (
    <div>
      <Tabs value={value} onChange={handleChange}>
        <Tab label="Time" />
        <Tab label="Column"/>
        <Tab label="Font"/>
        <Tab label="Map Points"/>
      </Tabs>
      <CustomTabPanel value={value} index={0}>
        <Time></Time>
      </CustomTabPanel>
      <CustomTabPanel value={value} index={1}>
      <Column></Column>
      </CustomTabPanel>
      <CustomTabPanel value={value} index={2}>
        <Font></Font>
      </CustomTabPanel>
      <CustomTabPanel value={value} index={3}>
        <MapPoint></MapPoint>
      </CustomTabPanel>
      <div></div>
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
    </div>
  );
});
