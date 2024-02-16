import React, { useContext, useState } from "react";
import { context } from "./state";
import { observer } from "mobx-react-lite";
import { Link, useNavigate } from "react-router-dom";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import { useTheme } from "@mui/material/styles";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Popover from "@mui/material/Popover";
import TSCreatorLogo from "./assets/TSCreatorLogo.png";
import HomeIcon from "@mui/icons-material/Home";
import { Tab } from "@mui/material";
import { TSCTabs } from "./components";

import "./NavBar.css";

// Updated NavBar
export const NavBar = observer(function Navbar() {
  const theme = useTheme();
  const { state, actions } = useContext(context);
  const navigate = useNavigate();
  const settingsTabRef = React.useRef(null);

  return (
    <AppBar position="fixed" sx={{ background: theme.palette.navbar.dark, display: "flex" }}>
      <Toolbar>
        {/* ... (existing code) */}

        {/* Settings Tab with Custom Dropdown Menu */}
        <Settings settingsTabRef={settingsTabRef} />

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
          <Tab value={1} label="Chart" onClick={() => navigate("/chart")} />
          <Tab value={2} label="Settings" onClick={() => navigate("/settings")} />
          <Tab value={3} label="Datapack" onClick={() => navigate("/datapack")} />
          <Tab value={4} label="Help" onClick={() => navigate("/help")} />
          <Tab value={5} label="About" onClick={() => navigate("/about")} />
        </TSCTabs>

        {/* Logo */}
        <div style={{ flexGrow: 1 }} />
        <img src={TSCreatorLogo} alt="TSCreator Logo" width="4%" height="4%" />
      </Toolbar>
    </AppBar>
  );
});

// Updated Settings
export const Settings = observer(function Settings({ settingsTabRef }) {
  const { state, actions } = useContext(context);
  const theme = useTheme();
  const navigate = useNavigate();
  const [isSettingsMenuOpen, setSettingsMenuOpen] = useState(false);

  const handleSettingsTabClick = () => {
    setSettingsMenuOpen(!isSettingsMenuOpen);
  };

  const handleMenuItemClick = (tabName) => {
    // Execute logic based on the clicked tab
    switch (tabName) {
      case "Time":
        actions.setTimeLogic();
        break;
      case "Column":
        actions.setColumnLogic();
        break;
      case "Font":
        actions.setFontLogic();
        break;
      case "MapPoints":
        actions.setMapPointsLogic();
        break;
      default:
        break;
    }

    setSettingsMenuOpen(false); // Close the custom dropdown menu

    // Navigate to the corresponding route if needed
    if (tabName === "Chart") {
      navigate("/chart");
    } else if (tabName === "Settings") {
      // Do nothing when the "Settings" menu item is clicked
    } else if (tabName === "Datapack") {
      navigate("/datapack");
    } else if (tabName === "Help") {
      navigate("/help");
    } else if (tabName === "About") {
      navigate("/about");
    }
  };

  return (
    <>
      <Button
        id="settings-tab"
        size="large"
        ref={settingsTabRef}
        sx={{
          color: isSettingsMenuOpen ? theme.palette.selection.light : theme.palette.selection.main,
          "&:hover": {
            color: theme.palette.selection.light,
          },
        }}
        onClick={handleSettingsTabClick}
      >
        Settings
      </Button>

      {isSettingsMenuOpen && (
        <Popover
          open={isSettingsMenuOpen}
          anchorEl={settingsTabRef.current}
          onClose={() => setSettingsMenuOpen(false)}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "left",
          }}
          transformOrigin={{
            vertical: "top",
            horizontal: "left",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              padding: "10px",
            }}
          >
            {/* Add your Settings content components here */}
            <MenuItem onClick={() => handleMenuItemClick("Time")}>Time</MenuItem>
            <MenuItem onClick={() => handleMenuItemClick("Column")}>Column</MenuItem>
            <MenuItem onClick={() => handleMenuItemClick("Font")}>Font</MenuItem>
            <MenuItem onClick={() => handleMenuItemClick("MapPoints")}>Map Points</MenuItem>
          </div>
        </Popover>
      )}
    </>
  );
});
