import React, { useContext } from 'react';
import { Button, TextField, Box, FormControlLabel, Checkbox, Tabs, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
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
      
    </div>
  );
});
