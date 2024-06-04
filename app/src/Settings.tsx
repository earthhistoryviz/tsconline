import React, { useContext } from "react";
import { context } from "./state";
import { observer } from "mobx-react-lite";
import { Column } from "./settings_tabs/Column";
import { Time } from "./settings_tabs/Time";
import { Font } from "./settings_tabs/Font";
import { MapPoints } from "./settings_tabs/map_points/MapPoints";
import { Datapacks } from "./settings_tabs/Datapack";
import { useTheme } from "@mui/material/styles";
import { Typography } from "@mui/material";
import SaveSettings from "./settings_tabs/SaveSettings";
import LoadSettings from "./settings_tabs/LoadSettings";
import "./Settings.css";
import { CustomTabs } from "./components/TSCCustomTabs";
import { SettingsMenuOptionLabels, SettingsTabs } from "./types";

export const Settings = observer(function Settings() {
  const { state, actions } = useContext(context);
  const theme = useTheme();
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
  const tabs = Object.values(SettingsMenuOptionLabels);
  const tabKeys = Object.keys(SettingsMenuOptionLabels);
  const tabIndex = tabKeys.indexOf(state.settingsTabs.selected);
  return (
    <div className="settings-container" style={{ background: theme.palette.settings.light }}>
      <SettingsHeader />
      <CustomTabs
        tabs={tabs}
        value={tabIndex}
        onChange={actions.setSettingsTabsSelected}
        tabIndicatorLength={70}
        centered
        className="main-settings-tabs"
      />
      <SettingsTab tab={state.settingsTabs.selected} />
    </div>
  );
});

const SettingsTab = observer(function SettingsTab({ tab }: { tab: SettingsTabs }) {
  switch (tab) {
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
});
