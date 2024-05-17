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
import SaveSettings from "./SettingsTabs/SaveSettings";
import LoadSettings from "./SettingsTabs/LoadSettings";

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
      <div
        style={{
          display: "flex",
          marginBottom: "1vh",
          justifyContent: "space-evenly",
          width: "100%"
        }}>
        {/* spacer for aligning items */}
        <div style={{ flex: "1", textAlign: "left" }} />
        <Typography style={{ flex: "1", textAlign: "center", fontSize: 48, marginBottom: "1vh", marginTop: "1vh" }}>
          Settings
        </Typography>
        <div style={{ flex: "1", textAlign: "right", marginTop: "5vh" }}>
          <LoadSettings />
          <SaveSettings />
        </div>
      </div>
    );
  };
  return (
    <div style={{ background: theme.palette.settings.light, overflow: "auto", wordSpacing: "1" }}>
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
