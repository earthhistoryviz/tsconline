import { useContext, useRef } from "react";
import { observer } from "mobx-react-lite";
import AppBar from "@mui/material/AppBar";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Toolbar from "@mui/material/Toolbar";
import { styled, useTheme } from "@mui/material/styles";
import HomeIcon from "@mui/icons-material/Home";
import { IconButton, Tab, Tabs, Typography } from "@mui/material";
import { context } from "./state";
import { TSCMenuItem, TSCButton } from "./components";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import { ControlledMenu, useHover, useMenuState } from "@szhsin/react-menu";
import "./NavBar.css";
import "@szhsin/react-menu/dist/index.css";
import "@szhsin/react-menu/dist/transitions/slide.css";
import { SettingsMenuOptionLabels, assertSettingsTabs } from "./types";
import Color from "color";
import { AccountMenu } from "./account_settings/AccountMenu";
import { toJS } from "mobx";
import LanguageIcon from "@mui/icons-material/Language";
import i18next from "i18next";
import { useTranslation } from "react-i18next";
import Button from "@mui/material/Button";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import PopupState, { bindTrigger, bindMenu } from "material-ui-popup-state";
import React from "react";
import languageList from "../translation/avaliable-language.json";

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
  const { t } = useTranslation();
  const currentLanguage = i18next.language;
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
                if (value === 3) settingsMenuToggle(false);
                actions.setTab(value);
              }}
              //override the TSCTabs since it has the dark navbar
              sx={{
                "& .MuiTab-root": {
                  color: "dark.contrastText",
                  fontWeight: 600,
                  "&:hover:not(.Mui-selected)": {
                    color: "button.main"
                  }
                },
                "& .MuiTab-root.Mui-selected": {
                  color: "button.light"
                }
              }}
              TabIndicatorProps={{ sx: { bgcolor: "button.light" } }}>
              <Tab value={1} disableRipple label={t("navBar.datapacks")} to="/datapacks" component={Link} />
              <Tab value={2} disableRipple label={t("navBar.chart")} to="/chart" component={Link} />
              <Tab
                value={3}
                disableRipple
                label={t("navBar.settings")}
                to="/settings"
                component={Link}
                ref={settingsRef}
                {...anchorProps}
              />
              <Tab value={4} disableRipple label={t("navBar.help")} to="/help" component={Link} />
              <Tab value={6} disableRipple label={t("navBar.about")} to="/about" component={Link} />
              <PopupState variant="popover" popupId="demo-popup-menu">
                {(popupState) => (
                  <React.Fragment>
                    <Button variant="text" {...bindTrigger(popupState)}>
                      <LanguageIcon />
                      <Typography>{t(`language-names.${currentLanguage}`)}</Typography>
                    </Button>
                    <Menu {...bindMenu(popupState)}>
                      {Object.entries(languageList).map(([key, value]) => (
                        <MenuItem
                          key={key}
                          className="settings-sub-menu-item"
                          onClick={() => {
                            i18next.changeLanguage(value);
                          }}>
                          <Typography>{t(`language-names.${value}`)}</Typography>
                        </MenuItem>
                      ))}
                    </Menu>
                  </React.Fragment>
                )}
              </PopupState>
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
                    actions.setTab(3);
                    actions.setSettingsTabsSelected(key);
                    navigate("/settings");
                    settingsMenuToggle(false);
                  }}>
                  <Typography>{t(`settingsTabs.${label}`)}</Typography>
                </TSCMenuItem>
              ))}
            </ControlledMenu>
          </>
        }
        <div style={{ flexGrow: 1 }} />
        <TSCButton
          buttonType="gradient"
          onClick={async () => {
            await actions.processDatapackConfig(toJS(state.unsavedDatapackConfig), "");
            actions.initiateChartGeneration(navigate, location.pathname);
          }}>
          {t("button.generate-chart")}
        </TSCButton>

        {state.isLoggedIn ? (
          <AccountMenu />
        ) : (
          <Tab
            className="login-tab"
            value={7}
            label={t("login.signin")}
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
