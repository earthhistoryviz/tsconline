import { useContext, useRef } from "react";
import { observer } from "mobx-react-lite";
import AppBar from "@mui/material/AppBar";
import { Link } from "react-router-dom";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import HomeIcon from "@mui/icons-material/Home";
import Tab from "@mui/material/Tab";
import { useTheme } from "@mui/material/styles";
import TSCreatorLogo from "./assets/TSCreatorLogo.png";
import { useMenuState, ControlledMenu, MenuItem, useHover } from "@szhsin/react-menu";
import { context } from "./state";
import { TSCTabs } from "./components";

import "@szhsin/react-menu/dist/index.css";
import "@szhsin/react-menu/dist/transitions/slide.css";
import "./NavBar.css";

export const NavBar = observer(function Navbar() {
  const theme = useTheme();
  const { state, actions } = useContext(context);
  const menuRef = useRef(null);
  const [menuState, toggle] = useMenuState({ transition: true });
  const { anchorProps, hoverProps } = useHover(menuState.state, toggle);

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
          onChange={(_e, value) => {
            actions.setTab(value);
          }}
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
          <Tab value={1} label="Chart" to="/chart" component={Link} />
          <Tab value={2} label="Settings" to="/settings" component={Link} ref={menuRef} {...anchorProps} />
          <Tab value={3} label="Datapack" to="/datapack" component={Link} />
          <Tab value={4} label="Help" to="/help" component={Link} />
          <Tab value={5} label="About" to="/about" component={Link} />
        </TSCTabs>
        <div style={{ flexGrow: 1 }} />
        <img src={TSCreatorLogo} width="4%" height="4%" alt="TSCreator Logo" />
        <ControlledMenu
          {...hoverProps}
          {...menuState}
          anchorRef={menuRef}
          onClose={() => toggle(false)}
          className="controlled-menu">
          <MenuItem className="menu-item" onClick={() => actions.setSettingsTabsSelected("time")}>
            {" "}
            Time
          </MenuItem>
          <MenuItem className="menu-item" onClick={() => actions.setSettingsTabsSelected("column")}>
            Columns
          </MenuItem>
          <MenuItem className="menu-item" onClick={() => actions.setSettingsTabsSelected("font")}>
            Font
          </MenuItem>
          <MenuItem className="menu-item" onClick={() => actions.setSettingsTabsSelected("map points")}>
            Map Points
          </MenuItem>
        </ControlledMenu>
      </Toolbar>
    </AppBar>
  );
});
