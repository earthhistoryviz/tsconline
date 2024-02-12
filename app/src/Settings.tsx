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

  const handleTabClick = (selectedTab) => {
    actions.setTab(1);
    actions.setAllTabs(true);
    actions.setSettingsTabsSelected(selectedTab);

    actions.updateSettings();
    actions.generateChart();

    navigate("/chart");
  };

  const selectedTabIndex = actions.translateTabToIndex(
    state.settingsTabs.selected
  );

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
        <TSCTab label="Time" onClick={() => handleTabClick("time")} />
        <TSCTab label="Column" onClick={() => handleTabClick("column")} />
        <TSCTab label="Font" onClick={() => handleTabClick("font")} />
        <TSCTab label="Map Points" onClick={() => handleTabClick("mappoints")} />
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
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div onClick={() => handleTabClick("time")}>Time</div>
          <div onClick={() => handleTabClick("column")}>Column</div>
          <div onClick={() => handleTabClick("font")}>Font</div>
          <div onClick={() => handleTabClick("mappoints")}>Map Points</div>
        </div>
      )}
    </div>
  );
});
