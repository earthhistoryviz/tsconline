import { useContext, useRef, useState } from "react";
import { observer } from "mobx-react-lite";
import AppBar from "@mui/material/AppBar";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Toolbar from "@mui/material/Toolbar";
import { useTheme } from "@mui/material/styles";
import HomeIcon from "@mui/icons-material/Home";
import { IconButton, MenuItem, Tab } from "@mui/material";
import { context } from "./state";
import { TSCButton, TSCTabs } from "./components";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import "./NavBar.css";
import '@szhsin/react-menu/dist/index.css';
import '@szhsin/react-menu/dist/transitions/slide.css';
import { ControlledMenu, useHover, useMenuState } from "@szhsin/react-menu";
import { settingsTabs } from "./constants";

export const NavBar = observer(function Navbar() {
  const theme = useTheme();
  const { state, actions } = useContext(context);
  const navigate = useNavigate();
  const settingsRef = useRef(null);
  const [settingsMenuState, settingsMenuToggle] = useMenuState({ transition: true})
  const { anchorProps, hoverProps } = useHover(settingsMenuState.state, settingsMenuToggle);

  const location = useLocation();
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
            value={0}
            onClick={() => {
              actions.setTab(0);
              actions.setUseCache(true);
            }}>
            <HomeIcon />
          </IconButton>
        </Link>
        {
          <>
            <TSCTabs
              value={state.tab !== 0 ? state.tab : false}
              onChange={(_e, value) => {
                actions.setTab(value);
              }}
              //override the TSCTabs since it has the dark navbar
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
              <Tab value={2} label="Settings" to="/settings" component={Link} ref={settingsRef} {...anchorProps} />
              <Tab value={3} label="Help" to="/help" component={Link} />
              <Tab value={4} label="About" to="/about" component={Link} />
            </TSCTabs>
            <ControlledMenu
            {...hoverProps}
            {...settingsMenuState}
            anchorRef={settingsRef}
            onClose={() => settingsMenuToggle(false)}
            >
              {settingsTabs.map((tab) => (
                <MenuItem key={tab} onClick={() => actions.setSettingsTabsSelected(tab)}>
                {tab}
                </MenuItem>))}
            </ControlledMenu>
          </>
        }
        <div style={{ flexGrow: 1 }} />
        <TSCButton onClick={() => actions.initiateChartGeneration(navigate, location.pathname)}>
          Generate Chart
        </TSCButton>
        {state.isLoggedIn ? (
          <Tab
            className="login-tab"
            value={5}
            label="Sign out"
            icon={<AccountCircleIcon />}
            onClick={() => actions.logout()}
            sx={{
              color: theme.palette.primary.main,
              "&:hover": {
                color: theme.palette.selection.light
              }
            }}
          />
        ) : (
          <Tab
            className="login-tab"
            value={5}
            label="Sign in"
            icon={<AccountCircleIcon />}
            to="/login"
            component={Link}
            sx={{
              color: theme.palette.primary.main,
              "&:hover": {
                color: theme.palette.selection.light
              }
            }}
          />
        )}
      </Toolbar>
    </AppBar>
  );
});
