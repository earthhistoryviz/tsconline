import React, { useContext, useState, useRef } from "react";
import { context } from "./state";
import { observer } from "mobx-react-lite";
import { Link, useNavigate } from "react-router-dom";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import { useTheme } from "@mui/material/styles";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Menu from "@mui/material/Menu";
import TSCreatorLogo from "./assets/TSCreatorLogo.png";
import { Tab } from "@mui/material";
import { TSCTabs } from "./components";
import { Column } from "./SettingsTabs/Column";
import { Time } from "./SettingsTabs/Time";
import { Font } from "./SettingsTabs/Font";
import { MapPoints } from "./SettingsTabs/MapPoints";
import HomeIcon from "@mui/icons-material/Home";


export const NavBar = observer(function Navbar() {
  const theme = useTheme();
  const { state, actions } = useContext(context);
  const navigate = useNavigate();

  const [isSettingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const menuRef = useRef(null);

  const handleSettingsTabEnter = (event: SyntheticEvent) => {
    setAnchorEl(event.currentTarget);
    setSettingsMenuOpen(true);
    console.log(event.currentTarget);
  };


  const handleSettingsTabLeave = () => {
    setAnchorEl(null);
    setSettingsMenuOpen(false);
  };

  const handleMenuEnter = () => {

    setSettingsMenuOpen(true);
  };

  const handleMenuLeave = () => {
    setAnchorEl(null);
    setSettingsMenuOpen(false);
  };

  const handleHomeClick = () => {
    // Add logic for Home button click
    console.log("Home button clicked");
  };

  // New handleClick function
  const handleClick = (tabName: string) => {
    // Perform actions specific to each tab
    actions.setSettingsTabsSelected(tabName);
    setSettingsMenuOpen(false)

    // Common action for all tabs (e.g., navigate to the tab-specific route)
    navigate("/settings")
  };

  return (
    <AppBar position="fixed" sx={{ background: theme.palette.navbar.dark, display: "flex" }}>
      <Toolbar>
        <Tab
          label={<HomeIcon />}
          onClick={handleHomeClick}
          sx={{ color: theme.palette.primary.main }}
          style={{ marginRight: "1px" }} 
        />
        {/* Other Tabs */}
        <TSCTabs
          value={state.tab !== 0 ? state.tab : false}
          onChange={(_e, value) => {
            actions.setTab(value);
          }}
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
          <Tab
            value={2}
            label="Settings"
            onMouseEnter={handleSettingsTabEnter}
            //onMouseLeave={handleSettingsTabLeave}
          />
          <Tab value={3} label="Datapack" onClick={() => navigate("/datapack")} />
          <Tab value={4} label="Help" onClick={() => navigate("/help")} />
          <Tab value={5} label="About" onClick={() => navigate("/about")} />
        </TSCTabs>

        {(
          <Menu
            MenuListProps={{onMouseLeave: handleSettingsTabLeave, onMouseEnter: handleMenuEnter}}
            open={isSettingsMenuOpen}
            onClose={handleMenuLeave}
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "left",
            }}
            transformOrigin={{
              vertical: "top",
              horizontal: "left",
            }}
            //onMouseOver={handleMenuEnter} 
            onMouseLeave={handleMenuLeave}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "5px",
              }}
            >
              <MenuItem onClick={() => handleClick("time")}>
                Time
              </MenuItem>
              <MenuItem onClick={() => handleClick("column")}>
                Column
              </MenuItem>
              <MenuItem onClick={() => handleClick("font")}>
                Font
              </MenuItem>
              <MenuItem onClick={() => handleClick("mappoints")}>
                Map Points
              </MenuItem>
            </div>
          </Menu>
        )}
        {/* Logo */}
        <div style={{ flexGrow: 1 }} />
        <img src={TSCreatorLogo} alt="TSCreator Logo" width="4%" height="4%" />
      </Toolbar>
    </AppBar>
  );
});
