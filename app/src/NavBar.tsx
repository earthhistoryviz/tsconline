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
import { Column } from "./SettingsTabs/Column";
import { Time } from "./SettingsTabs/Time";
import { Font } from "./SettingsTabs/Font";
import { MapPoints } from "./SettingsTabs/MapPoints";


// ... (imports)

export const NavBar = observer(function Navbar() {
  const theme = useTheme();
  const { state, actions } = useContext(context);
  const navigate = useNavigate();
  const settingsTabRef = React.useRef(null);

  // State to control the dropdown menu
  const [isSettingsMenuOpen, setSettingsMenuOpen] = useState(false);

  // Function to handle click on the Settings tab
  const handleSettingsTabClick = (event) => {
    setSettingsMenuOpen(!isSettingsMenuOpen);
    // Prevent the default behavior of the event to avoid unwanted navigation
    event.preventDefault();
  };

  // Function to handle click on a menu item in the dropdown
  const handleMenuItemClick = (tabName) => {
    // Execute logic based on the clicked tab
    switch (tabName) {
      case "Time":
        return <Time />;
      
        break;
      case "Column":
        navigate("./SettingsTabs/Column")
        break;
      case "Font":
        navigate("./SettingsTabs/Column")
        break;
      case "MapPoints":
        navigate("./SettingsTabs/MapPoints")
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
    <AppBar position="fixed" sx={{ background: theme.palette.navbar.dark, display: "flex" }}>
      <Toolbar>
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
          {/* Settings Tab with Custom Dropdown Menu */}
          <Tab
            value={2}
            label="Settings"
            onClick={(event) => {
              handleSettingsTabClick(event);
              navigate("/settings"); // Navigate to the "/settings" route
            }}
            ref={settingsTabRef}
          />
          <Tab value={3} label="Datapack" onClick={() => navigate("/datapack")} />
          <Tab value={4} label="Help" onClick={() => navigate("/help")} />
          <Tab value={5} label="About" onClick={() => navigate("/about")} />
        </TSCTabs>

        {/* Render the dropdown menu conditionally */}
        {isSettingsMenuOpen && (
          <Popover
            open={isSettingsMenuOpen}
            anchorEl={settingsTabRef.current}
            onClose={() => setSettingsMenuOpen(false)}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "left", // Adjusted to "right" to be at the top right of the tab
            }}
            transformOrigin={{
              vertical: "top",
              horizontal: "left", // Adjusted to "left" to be at the top left of the dropdown menu
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
        

        {/* Logo */}
        <div style={{ flexGrow: 1 }} />
        <img src={TSCreatorLogo} alt="TSCreator Logo" width="4%" height="4%" />
      </Toolbar>
    </AppBar>
  );
});
