import { useContext, useRef } from "react";
import { observer } from "mobx-react-lite";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import HomeIcon from "@mui/icons-material/Home";
import Tab from "@mui/material/Tab";
import { useTheme } from "@mui/material/styles";
import TSCreatorLogo from "./assets/TSCreatorLogo.png";
import { Link } from "react-router-dom";
import { useMenuState, ControlledMenu, MenuItem, useHover } from "@szhsin/react-menu";
import { context } from "./state";
import { TSCTabs } from "./components";

export const NavBar = observer(function Navbar() {
  const { state, actions } = useContext(context);
  const theme = useTheme();
  const menuRef = useRef(null);
  const [menuState, toggle] = useMenuState({ transition: true });
  const { hoverProps, anchorProps } = useHover(menuState.state, toggle);

  const handleMenuItemClick = (settingTab: string) => {
    actions.setSettingsTabsSelected(settingTab);
    toggle(false);
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
          <Tab label="Chart" component={Link} to="/chart" />
          <Tab label="Settings" component={Link} to="/settings" ref={menuRef} {...anchorProps} />
          <Tab label="Datapack" component={Link} to="/datapack" />
          <Tab label="Help" component={Link} to="/help" />
          <Tab label="About" component={Link} to="/about" />
        </TSCTabs>
        <div style={{ flexGrow: 1 }} />
        <img src={TSCreatorLogo} width="40" height="40" alt="TSCreator Logo" />
        <ControlledMenu {...hoverProps} {...menuState} anchorRef={menuRef} onClose={() => toggle(false)}>
          <MenuItem onClick={() => handleMenuItemClick("time")}>Time</MenuItem>
          <MenuItem onClick={() => handleMenuItemClick("column")}>Columns</MenuItem>
          <MenuItem onClick={() => handleMenuItemClick("font")}>Font</MenuItem>
          <MenuItem onClick={() => handleMenuItemClick("mappoints")}>Map Points</MenuItem>
        </ControlledMenu>
      </Toolbar>
    </AppBar>
  );
});
