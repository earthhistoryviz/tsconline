import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { context } from "./state";
import { observer } from "mobx-react-lite";
import { Column } from "./SettingsTabs/Column";
import { Time } from "./SettingsTabs/Time";
import { Font } from "./SettingsTabs/Font";
import { MapPoint } from "./SettingsTabs/MapPoint";
import Color from 'color';
import { styled } from '@mui/material/styles';
import { useTheme } from '@mui/material/styles';
import { TSCTabs, TSCTab } from './components';

export const Settings = observer(function Settings() {
  const { state, actions } = useContext(context);
  const theme = useTheme();
  const navigate = useNavigate();

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    actions.setSettingsTabsSelected(newValue);
  };

  const handleButtonClick = () => {
    actions.setTab(1);
    actions.setAllTabs(true);


    actions.updateSettings();

    actions.generateChart();

    navigate("/chart");
  };

  const selectedTabIndex = actions.translateTabToIndex(
    state.settingsTabs.selected
  );

  function displayChosenTab() {
    switch (state.settingsTabs.selected) {
      case "time":
        return <Time />;
      case "column":
        return <Column />;
      case "font":
        return <Font />;
      case "mappoints":
        return <MapPoint />;
    }
  }


  return (
    <div style={{background: theme.palette.settings.light}}>
      <TSCTabs value={selectedTabIndex} onChange={handleChange} centered>
        <TSCTab label="Time" />
        <TSCTab label="Column" />
        <TSCTab label="Font" />
        <TSCTab label="Map Points" />
      </TSCTabs>
      {displayChosenTab()}
    </div>
  );
});
