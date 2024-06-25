import { useContext, useRef } from "react";
import { observer } from "mobx-react-lite";
import AppBar from "@mui/material/AppBar";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Toolbar from "@mui/material/Toolbar";
import { styled, useTheme } from "@mui/material/styles";
import HomeIcon from "@mui/icons-material/Home";
import { IconButton, Tab, Tabs, Typography } from "@mui/material";
import { context } from "./state";
import { TSCMenuItem, TSCButton, TSCAccountMenu } from "./components";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import { ControlledMenu, useHover, useMenuState } from "@szhsin/react-menu";
import "./NavBar.css";
import "./Profile.css";
import "@szhsin/react-menu/dist/index.css";
import "@szhsin/react-menu/dist/transitions/slide.css";
import { SettingsMenuOptionLabels, assertSettingsTabs } from "./types";
import Color from "color";

const StyledAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: Color(theme.palette.dark.main).alpha(0.9).string(),
  borderBottom: `0.5px solid ${theme.palette.divider}`,
  backgroundImage: "none",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)"
}));

export const NavBar = observer(function Navbar() {
  const theme = useTheme();
  const { state, actions } = useContext(context);
  const navigate = useNavigate();
  const settingsRef = useRef(null);
  const [settingsMenuState, settingsMenuToggle] = useMenuState({ transition: true });
  const { anchorProps, hoverProps } = useHover(settingsMenuState.state, settingsMenuToggle);

  const location = useLocation();
  return (
    <StyledAppBar position="fixed">
      <Toolbar>
        <Link to="/">
          <IconButton
            size="large"
            sx={{
              "&:hover": {
                opacity: 0.9
              }
            }}
            value={0}
            onClick={() => {
              actions.setTab(0);
              actions.setUseCache(true);
            }}>
            <HomeIcon sx={{ color: "button.light" }} />
          </IconButton>
        </Link>
        {
          <>
            <Tabs
              value={state.tab !== 0 ? state.tab : false}
              onChange={(_e, value) => {
                if (value === 2) settingsMenuToggle(false);
                actions.setTab(value);
              }}
              //override the TSCTabs since it has the dark navbar
              sx={{
                "& .MuiTab-root": {
                  color: "dark.contrastText",
                  "&:hover:not(.Mui-selected)": {
                    color: "button.main"
                  }
                },
                "& .MuiTab-root.Mui-selected": {
                  color: "button.light"
                }
              }}
              TabIndicatorProps={{ sx: { bgcolor: "button.light" } }}>
              <Tab value={1} disableRipple label="Chart" to="/chart" component={Link} />
              <Tab
                value={2}
                disableRipple
                label="Settings"
                to="/settings"
                component={Link}
                ref={settingsRef}
                {...anchorProps}
              />
              <Tab value={3} disableRipple label="Help" to="/help" component={Link} />
              <Tab value={4} disableRipple label="About" to="/about" component={Link} />
            </Tabs>
            <ControlledMenu
              {...hoverProps}
              {...settingsMenuState}
              anchorRef={settingsRef}
              className="settings-sub-menu"
              align="center"
              menuStyle={{
                color: theme.palette.dark.contrastText,
                backgroundColor: theme.palette.dark.light,
                border: `1px solid ${theme.palette.divider}`
              }}
              gap={-2}
              onClose={() => settingsMenuToggle(false)}>
              {Object.entries(SettingsMenuOptionLabels).map(([key, label]) => (
                <TSCMenuItem
                  key={key}
                  className="settings-sub-menu-item"
                  onClick={() => {
                    assertSettingsTabs(key);
                    actions.setTab(2);
                    actions.setSettingsTabsSelected(key);
                    navigate("/settings");
                    settingsMenuToggle(false);
                  }}>
                  <Typography>{label}</Typography>
                </TSCMenuItem>
              ))}
            </ControlledMenu>
          </>
        }
        <div style={{ flexGrow: 1 }} />
        <TSCButton buttonType="gradient" onClick={() => actions.initiateChartGeneration(navigate, location.pathname)}>
          Generate Chart
        </TSCButton>
        {!state.isLoggedIn ? (
          <TSCAccountMenu />
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
    </StyledAppBar>
  );
});
