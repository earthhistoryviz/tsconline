import React, { useContext, useRef } from "react";
import { observer } from "mobx-react-lite";
import { useNavigate } from "react-router-dom";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import { useTheme } from "@mui/material/styles";
import HomeIcon from "@mui/icons-material/Home";
import { ControlledMenu, MenuItem, useHover, useMenuState } from '@szhsin/react-menu';
import '@szhsin/react-menu/dist/index.css';
import '@szhsin/react-menu/dist/transitions/slide.css';

export const NavBar = observer(function Navbar() {
  const theme = useTheme();
  const navigate = useNavigate();
  const ref = useRef(null);
  const [menuState, toggle] = useMenuState({ transition: true });
  const { anchorProps, hoverProps } = useHover(menuState.state, toggle);

  const handleHomeClick = () => {
    console.log("Home button clicked");
  };
  const handleClick = (tabName) => {
    actions.setSettingsTabsSelected(tabName);
    setSettingsMenuOpen(false);
    navigate("/settings");
  };

  return (
    <AppBar position="fixed" sx={{ background: theme.palette.navbar.dark, display: "flex" }}>
      <Toolbar>
        <Button
          onClick={handleHomeClick}
          sx={{ color: theme.palette.primary.main, marginRight: "5px" }}
        >
          <HomeIcon />
        </Button>
        <Tabs
          value={state.tab !== 0 ? state.tab : false}
          onChange={(_e, value) => {
            // Assuming actions.setTab is defined
            // actions.setTab(value);
          }}
          sx={{
            "& .MuiButton-root": {
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
          <Tab label="Chart" onClick={() => navigate("/chart")} />
          <div {...hoverProps} ref={ref} sx={{ "&:hover": { color: theme.palette.selection.light } }}>
            <Tab label="Settings" />
          </div>
          <ControlledMenu
            {...hoverProps}
            {...menuState}
            anchorRef={ref}
            onClose={() => toggle(false)}
          >
            <MenuItem onClick={() => handleClick("time")}>Time</MenuItem>
            <MenuItem onClick={() => handleClick("font")}>Font</MenuItem>
            <MenuItem onClick={() => handleClick("column")}>Columns</MenuItem>
            <MenuItem onClick={() => handleClick("mappoints")}>Map Points</MenuItem>
          </ControlledMenu>
          <Tab label="Datapack" onClick={() => navigate("/datapack")} />
          <Tab label="Help" onClick={() => navigate("/help")} />
          <Tab label="About" onClick={() => navigate("/about")} />
        </Tabs>
        <div style={{ flexGrow: 1 }} />
        {/* Assuming TSCreatorLogo is an image */}
        <img src={TSCreatorLogo} alt="TSCreator Logo" width="4%" height="4%" />
      </Toolbar>
    </AppBar>
  );
});
