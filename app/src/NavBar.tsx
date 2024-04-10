import { useContext, useRef } from "react";
import { observer } from "mobx-react-lite";
import { useNavigate } from "react-router-dom"; // Import useNavigate from React Router
import AppBar from "@mui/material/AppBar";
import { Link } from "react-router-dom";
import Toolbar from "@mui/material/Toolbar";
import { useTheme } from "@mui/material/styles";
import TSCreatorLogo from "./assets/TSCreatorLogo.png";
import HomeIcon from "@mui/icons-material/Home";
import { IconButton } from "@mui/material";
import { context } from "./state";
import { TSCTabs } from "./components";
import { ControlledMenu, MenuItem, useMenuState, useHover } from "@szhsin/react-menu";
import { Tab } from "@mui/material";
import "@szhsin/react-menu/dist/index.css";
import "@szhsin/react-menu/dist/transitions/slide.css";

import "./NavBar.css";

export const NavBar = observer(function Navbar() {
  const navigate = useNavigate(); // Hook from React Router for navigation
  const theme = useTheme();
  const { state, actions } = useContext(context);
  const menuRef = useRef(null);
  const [menuState, toggleMenu] = useMenuState({ transition: true });
  const { hoverProps } = useHover(menuState.state, toggleMenu);

  // Function to handle menu item click
  const handleMenuItemClick = (selectedTab: string) => {
    if (
      selectedTab === "time" ||
      selectedTab === "font" ||
      selectedTab === "column" ||
      selectedTab === "mappoints" ||
      selectedTab === "datapacks"
    ) {
      actions.setSettingsTabsSelected(selectedTab);
      navigate("/settings");
    } else {
      console.error("Invalid tab selected");
    }
  };

  return (
    <AppBar position="fixed" sx={{ background: theme.palette.navbar.main, display: "flex" }}>
      <Toolbar>
        <Link to="/">
          <IconButton
            size="large"
            sx={{
              color: theme.palette.selection.main,
              "&:hover": {
                color: theme.palette.selection.light,
                opacity: 1
              }
            }}
            onClick={() => {
              actions.setTab(0);
              actions.setUseCache(true);
            }}>
            <HomeIcon />
          </IconButton>
        </Link>
        <TSCTabs
          value={state.tab !== 0 ? state.tab : false}
          onChange={(_e, value) => actions.setTab(value)}
          sx={{
            "& .MuiTab-root": {
              color: theme.palette.primary.main,
              "&:hover": {
                color: theme.palette.selection.light
              }
            },
            "& .Mui-selected": {
              color: theme.palette.selection.main
            }
          }}>
          <Tab label="Chart" value={1} component={Link} to="/chart" />
          <Tab label="Settings" value={2} component={Link} to="/settings" ref={menuRef} {...hoverProps} />
          <Tab label="Datapack" value={3} component={Link} to="/datapack" />
          <Tab label="Help" value={4} component={Link} to="/help" />
          <Tab label="About" value={5} component={Link} to="/about" />
        </TSCTabs>
        <div style={{ flexGrow: 1 }} />
        <img src={TSCreatorLogo} alt="TSCreator Logo" width="4%" height="4%" />
        <ControlledMenu {...hoverProps} anchorRef={menuRef} onClose={() => toggleMenu(false)}>
          <MenuItem onClick={() => handleMenuItemClick("time")}>Time</MenuItem>
          <MenuItem onClick={() => handleMenuItemClick("font")}>Font</MenuItem>
          <MenuItem onClick={() => handleMenuItemClick("column")}>Columns</MenuItem>
          <MenuItem onClick={() => handleMenuItemClick("mappoints")}>Map Points</MenuItem>
        </ControlledMenu>
      </Toolbar>
    </AppBar>
  );
});
