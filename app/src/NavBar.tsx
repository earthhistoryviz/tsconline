import React, { useContext, useState } from "react";
import { context } from "./state";
import { observer } from "mobx-react-lite";
import { Link } from "react-router-dom";
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
  const [isSettingsHovered, setIsSettingsHovered] = useState(false);
  const [isSettingsContentVisible, setIsSettingsContentVisible] = useState(false);

  const handleSettingsMouseEnter = () => {
    setIsSettingsHovered(true);
  };

  const handleSettingsMouseLeave = () => {
    setIsSettingsHovered(false);
  };

  const handleSettingsContentMouseEnter = () => {
    setIsSettingsContentVisible(true);
  };

  const handleSettingsContentMouseLeave = () => {
    setIsSettingsContentVisible(false);
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
              opacity: 1,
            },
          }}
          onMouseEnter={handleSettingsMouseEnter}
          onMouseLeave={handleSettingsMouseLeave}
        >
          Settings
        </Button>

        {/* Popover with Settings Content */}
        <Popover
          open={isSettingsContentVisible}
          anchorEl={document.getElementById("settings-button")}
          onClose={handleSettingsMouseLeave}
          onMouseEnter={handleSettingsContentMouseEnter}
          onMouseLeave={handleSettingsContentMouseLeave}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              padding: "10px",
            }}
          >
            {/* Add your Settings content components here */}
            <Tab label="Time" to="/settings/time" component={Link} />
            <Tab label="Column" to="/settings/column" component={Link} />
            <Tab label="Font" to="/settings/font" component={Link} />
            <Tab label="Map Points" to="/settings/mappoints" component={Link} />
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
          <Tab value={1} label="Chart" to="/chart" component={Link} />
          <Tab value={2} label="Settings" to="/settings" component={Link} />
          <Tab value={3} label="Datapack" to="/datapack" component={Link} />
          <Tab value={4} label="Help" to="/help" component={Link} />
          <Tab value={5} label="About" to="/about" component={Link} />
        </TSCTabs>

        {/* Logo */}
        <div style={{ flexGrow: 1 }} />
        <img src={TSCreatorLogo} alt="TSCreator Logo" width="4%" height="4%" />

      </Toolbar>
    </AppBar>
  );
});
