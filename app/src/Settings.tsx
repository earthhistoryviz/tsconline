import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { context } from "./state";
import { observer } from "mobx-react-lite";
import { Column } from "./SettingsTabs/Column";
import { Time } from "./SettingsTabs/Time";
import { Font } from "./SettingsTabs/Font";
import { MapPoints } from "./SettingsTabs/MapPoints";
import { useTheme } from "@mui/material/styles";
import { TSCTabs, TSCTab } from "./components";

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

  const displayChosenTab = () => {
    switch (state.settingsTabs.selected) {
      case "time":
        return <Time />;
      case "column":
        return <Column />;
      case "font":
        return <Font />;
      case "mappoints":
        return <MapPoints />;
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        position: "relative",
        background: theme.palette.settings.light,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <TSCTabs value={selectedTabIndex} onChange={handleChange} centered>
        <TSCTab label="Time" />
        <TSCTab label="Column" />
        <TSCTab label="Font" />
        <TSCTab label="Map Points" />
      </TSCTabs>
      {isHovered && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            zIndex: 100,
            background: "white",
            boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)",
            padding: "10px",
          }}
        >
          {displayChosenTab()}
        </div>
      )}
    </div>
  );
});
