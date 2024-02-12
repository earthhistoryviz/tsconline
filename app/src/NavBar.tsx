import React, { useContext, useState } from "react";
import { context } from "./state";
import { observer } from "mobx-react-lite";
import { Link, useNavigate } from "react-router-dom";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import { useTheme } from "@mui/material/styles";
import Popover from "@mui/material/Popover";
import Button from "@mui/material/Button";
import TSCreatorLogo from "./assets/TSCreatorLogo.png";
import HomeIcon from "@mui/icons-material/Home";
import { Tab } from "@mui/material";
import { TSCTabs } from "./components";

import "./NavBar.css";

export const NavBar = observer(function Navbar() {
  const theme = useTheme();
  const { state, actions } = useContext(context);
  const navigate = useNavigate();
  const [isSettingsHovered, setIsSettingsHovered] = useState(false);

  const handleSettingsMouseEnter = () => {
    setIsSettingsHovered(true);
  };

  const handleSettingsMouseLeave = () => {
    setIsSettingsHovered(false);
  };

  const handleTabClick = (tabName) => {
    // Implement specific actions based on the clicked tab
    switch (tabName) {
      case "Time":
        // Execute Time-related logic
        actions.setTimeLogic();
        break;
      case "Column":
        // Execute Column-related logic
        actions.setColumnLogic();
        break;
      // Add cases for other tabs as needed

      default:
        break;
    }

    // Close the popover and perform any other necessary actions
    setIsSettingsHovered(false);

    // Navigate to the corresponding route if needed
    if (tabName === "Chart") {
      navigate("/chart");
    } else if (tabName === "Settings") {
      navigate("/settings");
    } else if (tabName === "Datapack") {
      navigate("/datapack");
    } else if (tabName === "Help") {
      navigate("/help");
    } else if (tabName === "About") {
      navigate("/about");
    }
  };

  return (
    <AppBar position="fixed" sx={{ background: theme.palette.navbar.dark, display: "flex" }}>
      <Toolbar>
        {/* Home Icon and Link */}
        <Link to="/">
          <Button
            size="large"
            sx={{
              color: theme.palette.selection.main,
              "&:hover": {
                color: theme.palette.selection.light,
                opacity: 1,
              },
            }}
            value={0}
            onClick={() => {
              actions.setTab(0);
              actions.setUseCache(true);
            }}
          >
            <HomeIcon />
          </Button>
        </Link>

        {/* Settings Tab with Hoverable Content */}
        <Button
          id="settings-button"
          size="large"
          sx={{
            color: isSettingsHovered ? theme.palette.selection.light : theme.palette.selection.main,
            "&:hover": {
              color: theme.palette.selection.light,
            },
          }}
          onMouseEnter={handleSettingsMouseEnter}
          onMouseLeave={handleSettingsMouseLeave}
        >
          Settings
        </Button>

        {/* Popover with Settings Content */}
        <Popover
          open={isSettingsHovered}
          anchorEl={document.getElementById("settings-button")}
          onClose={handleSettingsMouseLeave}
          sx={{ pointerEvents: "none" }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              padding: "10px",
            }}
            onMouseEnter={handleSettingsMouseEnter}
            onMouseLeave={handleSettingsMouseLeave}
          >
            {/* Add your Settings content components here */}
            <Tab label="Time" onClick={() => handleTabClick("Time")} />
            <Tab label="Column" onClick={() => handleTabClick("Column")} />
            <Tab label="Font" onClick={() => handleTabClick("Font")} />
            <Tab label="Map Points" onClick={() => handleTabClick("MapPoints")} />
          </div>
        </Popover>

        {/* Other Tabs */}
        <TSCTabs
          value={state.tab !== 0 ? state.tab : false}
          onChange={(_e, value) => {
            actions.setTab(value);
          }}
          // Additional styling for tabs
          sx={{
            "& .MuiTab-root": {
              color: theme.palette.primary.main,
              "&:hover": {
                color: theme.palette.selection.light,
              },
            },
            "& .Mui-selected": {
              color: theme.palette.selection.main,
            },
          }}
        >
          <Tab value={1} label="Chart" onClick={() => handleTabClick("Chart")} />
          <Tab value={2} label="Settings" onClick={() => handleTabClick("Settings")} />
          <Tab value={3} label="Datapack" onClick={() => handleTabClick("Datapack")} />
          <Tab value={4} label="Help" onClick={() => handleTabClick("Help")} />
          <Tab value={5} label="About" onClick={() => handleTabClick("About")} />
        </TSCTabs>

        {/* Logo */}
        <div style={{ flexGrow: 1 }} />
        <img src={TSCreatorLogo} alt="TSCreator Logo" width="4%" height="4%" />
      </Toolbar>
    </AppBar>
  );
});
