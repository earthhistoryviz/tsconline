import React, { useContext } from 'react';
import { Tabs } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { context } from './state';
import { observer } from 'mobx-react-lite';
import Tab from '@mui/material/Tab';
import { Column } from './SettingsTabs/Column';
import { Time } from './SettingsTabs/Time';
import { Font } from './SettingsTabs/Font';
import { MapPoint } from './SettingsTabs/MapPoint';
import { ColumnSetting } from './state/state';

export const Settings = observer(function Settings() {
  const { state, actions } = useContext(context);
  const navigate = useNavigate();

  //temporary code to test recursive functionality in column
  //doesn't work if it's put in the column section
  let temp: ColumnSetting = {
    "MA": { on: false, children: null, parents: [] },
      "Standard Chronostratigraphy": { on: false, children: null, parents: [] },
      "Planetary Time Scale": { on: false, children: null, parents: [] },
      "Regional Stages": { on: false, children: null, parents: [] },
      "Geomagnetic Polarity": { on: false, children: null, parents: [] },
      "Marine Macrofossils": { on: false, children: null, parents: [] },
      "Microfossils": { on: false, children: null, parents: [] },
  };
  let i = 0;
  for (const name in temp) {
    temp[name].children = { [i]: { on: false, children: null, parents:[name] } };
    console.log(temp[name]);
    i++;
  }
  actions.setSettingsColumns(temp)


  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    actions.setSettingTabsSelected(newValue);
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

  const selectedTabIndex = actions.translateTabToIndex(state.settingsTabs.selected);
  function displayChosenTab() {
    switch(state.settingsTabs.selected) {
           case 'time': return <Time/>;
         case 'column': return <Column/>;
           case 'font': return <Font/>;
      case 'mappoints': return <MapPoint/>;
    }
  }

  return (
    <div>
      <Tabs value={selectedTabIndex} onChange={handleChange}>
        <Tab label="Time" />
        <Tab label="Column"/>
        <Tab label="Font"/>
        <Tab label="Map Points"/>
      </Tabs>
      {displayChosenTab()}
    </div>
  );
});
