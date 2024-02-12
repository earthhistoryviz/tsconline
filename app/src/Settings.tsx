import React, { useContext, useState } from "react";
import { context } from "./state";
import { observer } from "mobx-react-lite";
import { Column } from "./SettingsTabs/Column";
import { Time } from "./SettingsTabs/Time";
import { Font } from "./SettingsTabs/Font";
import { MapPoints } from "./SettingsTabs/MapPoints";
import { useTheme } from "@mui/material/styles";

export const Settings = observer(function Settings() {
  const { state, actions } = useContext(context);
  const theme = useTheme();
  const [isHovered, setIsHovered] = useState(false);

  const handleTabClick = (selectedTab) => {
    actions.setTab(1);
    actions.setAllTabs(true);
    actions.setSettingsTabsSelected(selectedTab);

    actions.updateSettings();
    actions.generateChart();

    // For demonstration purposes, navigating to "/chart" when a tab is clicked
    // You may want to adjust this behavior according to your needs
    // navigate("/chart");
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
          <Time onClick={() => handleTabClick("time")} />
          <Column onClick={() => handleTabClick("column")} />
          <Font onClick={() => handleTabClick("font")} />
          <MapPoints onClick={() => handleTabClick("mappoints")} />
        </div>
      )}
    </div>
  );
});
