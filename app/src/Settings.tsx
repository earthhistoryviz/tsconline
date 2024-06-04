import React, { useContext } from "react";
import { context } from "./state";
import { observer } from "mobx-react-lite";
import { Column } from "./settings_tabs/Column";
import { Time } from "./settings_tabs/Time";
import { Font } from "./settings_tabs/Font";
import { MapPoints } from "./settings_tabs/map_points/MapPoints";
import { Datapacks } from "./settings_tabs/Datapack";
import { useTheme } from "@mui/material/styles";
import { TSCTabs, TSCTab } from "./components";
import { Typography } from "@mui/material";
import SaveSettings from "./settings_tabs/SaveSettings";
import LoadSettings from "./settings_tabs/LoadSettings";
import "./Settings.css";

export const Settings = observer(function Settings() {
  const { state, actions } = useContext(context);
  const theme = useTheme();

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    actions.setSettingsTabsSelected(newValue);
  };

  const selectedTabIndex = actions.translateTabToIndex(state.settingsTabs.selected);

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
      case "datapacks":
        return <Datapacks />;
    }
  }

  const SettingsHeader = () => {
    return (
      <div className="settings-header">
        <LoadSettings />
        <Typography className="settings-header-title" variant="h3">
          Settings
        </Typography>
        <SaveSettings />
      </div>
    );
  };
  return (
    <div style={{ background: theme.palette.settings.light, overflowY: "auto", overflowX: "hidden", wordSpacing: "1" }}>
      <SettingsHeader />
      <TSCTabs value={selectedTabIndex} onChange={handleChange} centered>
        <TSCTab label="Time" onClick={() => actions.setSettingsTabsSelected("time")} />
        <TSCTab label="Column" onClick={() => actions.setSettingsTabsSelected("column")} />
        <TSCTab label="Font" onClick={() => actions.setSettingsTabsSelected("font")} />
        <TSCTab label="Map Points" onClick={() => actions.setSettingsTabsSelected("mappoints")} />
        <TSCTab label="Datapacks" onClick={() => actions.setSettingsTabsSelected("datapacks")} />
      </TSCTabs>
      {displayChosenTab()}
    </div>
  );
});
