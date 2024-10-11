import { useContext, useRef } from "react";
import { observer } from "mobx-react-lite";
import AppBar from "@mui/material/AppBar";
import { Link, useNavigate } from "react-router-dom";
import Toolbar from "@mui/material/Toolbar";
import { styled, useTheme } from "@mui/material/styles";
import HomeIcon from "@mui/icons-material/Home";
import {
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tab,
  Tabs,
  Typography,
  useMediaQuery
} from "@mui/material";
import { context } from "./state";
import { TSCMenuItem, TSCButton } from "./components";
import { Menu as MenuIcon, AccountCircle, TableChart, Dataset, Help, Campaign, School } from "@mui/icons-material";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import { ControlledMenu, useHover, useMenuState } from "@szhsin/react-menu";
import "./NavBar.css";
import "@szhsin/react-menu/dist/index.css";
import "@szhsin/react-menu/dist/transitions/slide.css";
import { SettingsMenuOptionLabels, assertSettingsTabs } from "./types";
import Color from "color";
import { AccountMenu } from "./account_settings/AccountMenu";
import { toJS } from "mobx";
import i18next from "i18next";
import { useTranslation } from "react-i18next";
import Button from "@mui/material/Button";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import PopupState, { bindTrigger, bindMenu } from "material-ui-popup-state";
import React from "react";
import languageList from "../translation/avaliable-language.json";
import Switch from "@mui/material/Switch";
import { CustomFormControlLabel } from "/home/sbal/tsconline/app/src/components/TSCComponents";
import SettingsIcon from "@mui/icons-material/Settings";

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
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { anchorProps, hoverProps } = useHover(settingsMenuState.state, settingsMenuToggle);
  const [menuDrawerOpen, setMenuDrawerOpen] = React.useState(false);
  const { t } = useTranslation();
  const menuItems = [
    { label: t("navBar.datapacks"), path: "/datapacks", icon: <Dataset /> },
    { label: t("navBar.chart"), path: "/chart", icon: <TableChart /> },
    { label: t("navBar.settings"), path: "/settings", ref: settingsRef, anchorProps, icon: <AccountCircleIcon /> },
    { label: t("navBar.help"), path: "/help", icon: <Help /> },
    { label: t("navBar.workshops"), path: "/workshops", icon: <School /> },
    { label: t("navBar.about"), path: "/about", icon: <Campaign /> }
  ];
  const onButtonClick = (path: string) => {
    navigate(path);
    setMenuDrawerOpen(false);
  };
  return (
    <StyledAppBar position="fixed">
      <Toolbar>
        {!isMobile && (
          <>
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
              {menuItems.map((menuItem, index) => (
                <Tab
                  key={index}
                  value={index}
                  disableRipple
                  label={menuItem.label}
                  to={menuItem.path}
                  component={Link}
                  ref={menuItem.ref}
                  {...menuItem.anchorProps}
                />
              ))}
              <LanguageMenu />
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
        )}
        {isMobile && (
          <>
            <IconButton onClick={() => setMenuDrawerOpen(true)}>
              <MenuIcon />
            </IconButton>
            <Drawer
              anchor="left"
              PaperProps={{
                sx: {
                  borderRight: "2px solid",
                  borderColor: "divider",
                  bgcolor: theme.palette.dark.main,
                  backgroundImage: "linear-gradient(rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.15))"
                }
              }}
              open={menuDrawerOpen}
              onClose={() => setMenuDrawerOpen(false)}>
              <List className="nav-bar-menu-mobile">
                <ListItem key={-1} className="nav-bar-menu-list-item">
                  <ListItemButton onClick={() => onButtonClick("/")}>
                    <ListItemIcon sx={{ color: "dark.contrastText" }}>
                      <HomeIcon />
                    </ListItemIcon>
                    <ListItemText primary={t("navBar.home")} sx={{ color: "dark.contrastText" }} />
                  </ListItemButton>
                </ListItem>
                {menuItems.map((menuItem, index) => (
                  <ListItem key={index} className="nav-bar-menu-list-item" onClick={() => onButtonClick(menuItem.path)}>
                    <ListItemButton>
                      <ListItemIcon sx={{ color: "dark.contrastText" }}>{menuItem.icon}</ListItemIcon>
                      <ListItemText primary={menuItem.label} sx={{ color: "dark.contrastText" }} />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
              <LanguageMenu />
            </Drawer>
          </>
        )}
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
            value={8}
            label={t("login.signin")}
            icon={<AccountCircle />}
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

        <PopupState variant="popover" popupId="demo-popup-menu">
          {(popupState) => (
            <React.Fragment>
              <Button variant="text" {...bindTrigger(popupState)}>
                <SettingsIcon />
                <Typography>{t(`Preferences`)}</Typography>
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

                <MenuItem className="settings-sub-menu-item" onClick={() => {}}>
                  <Typography>{t(``)}</Typography>

                  <CustomFormControlLabel
                    width={120}
                    control={
                      <Switch
                        checked={state.user.settings.darkMode}
                        size="medium"
                        color="default"
                        onChange={() => actions.setDarkMode(!state.user.settings.darkMode)}
                      />
                    }
                    label={t("login.dark-mode")}
                  />
                </MenuItem>
              </Menu>
            </React.Fragment>
          )}
        </PopupState>
      </Toolbar>
    </StyledAppBar>
  );
});

const LanguageMenu = observer(function LanguageMenu() {
  const { t } = useTranslation();
  const currentLanguage = i18next.language;
  return (
    <PopupState variant="popover" popupId="demo-popup-menu">
      {(popupState) => (
        <React.Fragment>
          <Button variant="text" {...bindTrigger(popupState)}>
            <LanguageIcon />
            <Typography>{t(`language-names.${currentLanguage}`)}</Typography>
          </Button>
          <Menu
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "center"
            }}
            transformOrigin={{
              vertical: "top",
              horizontal: "center"
            }}
            {...bindMenu(popupState)}>
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
  );
});
