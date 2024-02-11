import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { context } from "./state";
import { observer } from "mobx-react-lite";
import { Column } from "./SettingsTabs/Column";
import { Time } from "./SettingsTabs/Time";
import { Font } from "./SettingsTabs/Font";
import { MapPoints } from "./SettingsTabs/MapPoints";
import { useTheme } from '@mui/material/styles';
import { TSCTabs, TSCTab } from './components';

export const Settings = observer(function Settings() {
  const { state, actions } = useContext(context);
  const theme = useTheme();
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

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
        return <MapPoints />;
    }
  }

  return (
    <div
      style={{ background: theme.palette.settings.light }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isHovered && (
        <TSCTabs value={selectedTabIndex} onChange={handleChange} centered>
          <TSCTab label="Time" onClick={() => actions.setSettingsTabsSelected("time")} />
          <TSCTab label="Column" onClick={() => actions.setSettingsTabsSelected("column")} />
          <TSCTab label="Font" onClick={() => actions.setSettingsTabsSelected("font")} />
          <TSCTab label="Map Points" onClick={() => actions.setSettingsTabsSelected("mappoints")} />
        </TSCTabs>
      )}
      {displayChosenTab()}
    </div>
  );
});
