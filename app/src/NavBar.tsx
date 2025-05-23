import { useContext, useRef } from "react";
import { observer } from "mobx-react-lite";
import AppBar from "@mui/material/AppBar";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
import {
  Menu as MenuIcon,
  TableChart,
  Dataset,
  Help,
  Campaign,
  School,
  AccountCircle,
  AutoAwesome
} from "@mui/icons-material";
import { ControlledMenu, Menu, MenuDivider, MenuHeader, useHover, useMenuState } from "@szhsin/react-menu";
import "./NavBar.css";
import "@szhsin/react-menu/dist/index.css";
import "@szhsin/react-menu/dist/transitions/slide.css";
import { SettingsMenuOptionLabels, assertSettingsTabs } from "./types";
import Color from "color";
import { AccountMenu } from "./account_settings/AccountMenu";
import { toJS } from "mobx";
import i18next from "i18next";
import { useTranslation } from "react-i18next";
import React from "react";
import languageList from "@tsconline/shared/translations/available-languages.json";
import Switch from "@mui/material/Switch";
import { CustomFormControlLabel } from "./components/TSCComponents";
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
  const location = useLocation();
  const settingsRef = useRef(null);
  const [settingsMenuState, settingsMenuToggle] = useMenuState({ transition: true });
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { anchorProps, hoverProps } = useHover(settingsMenuState.state, settingsMenuToggle);
  const [menuDrawerOpen, setMenuDrawerOpen] = React.useState(false);
  const { t } = useTranslation();
  const menuItems = [
    { label: t("navBar.presets"), path: "/presets", icon: <Dataset />, className: "qsg-presets" },
    { label: t("navBar.datapacks"), path: "/datapacks", icon: <Dataset />, className: "qsg-datapacks" },
    { label: t("navBar.chart"), path: "/chart", icon: <TableChart />, className: "qsg-chart" },
    {
      label: t("navBar.settings"),
      path: "/settings",
      ref: settingsRef,
      anchorProps,
      icon: <AccountCircle />,
      className: "qsg-settings"
    },
    { label: t("navBar.help"), path: "/help", icon: <Help />, className: "qsg-help" },
    { label: t("navBar.workshops"), path: "/workshops", icon: <School />, className: "qsg-workshops" },
    { label: t("navBar.about"), path: "/about", icon: <Campaign />, className: "qsg-about" }
  ];
  const onButtonClick = (path: string) => {
    navigate(path);
    setMenuDrawerOpen(false);
  };
  return (
    <StyledAppBar position="sticky" className="nav-bar">
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
              value={state.tab || false}
              onChange={(_e, value) => {
                if (value === 4) settingsMenuToggle(false);
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
                  value={index + 1}
                  disableRipple
                  label={menuItem.label}
                  to={menuItem.path}
                  component={Link}
                  ref={menuItem.ref}
                  className={menuItem.className}
                  {...menuItem.anchorProps}
                />
              ))}
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
              {Object.entries(SettingsMenuOptionLabels).map(([key, val]) => (
                <TSCMenuItem
                  key={key}
                  className="settings-sub-menu-item"
                  onClick={() => {
                    assertSettingsTabs(key);
                    actions.setTab(4);
                    actions.setSettingsTabsSelected(key);
                    navigate("/settings");
                    settingsMenuToggle(false);
                  }}>
                  <Typography>{t(`settingsTabs.${val.label}`)}</Typography>
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
            </Drawer>
          </>
        )}
        <div style={{ flexGrow: 1 }} />
        <TSCButton
          buttonType="gradient"
          disabled={state.loadingDatapacks}
          startIcon={<AutoAwesome />}
          onClick={async () => {
            if (location.pathname !== "/crossplot") {
              await actions.processDatapackConfig(toJS(state.unsavedDatapackConfig));
              actions.initiateChartGeneration(navigate, location.pathname);
            } else {
              await actions.generateConvertedCrossPlotChart(navigate);
            }
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
        <NonUserSettings />
      </Toolbar>
    </StyledAppBar>
  );
});
const NonUserSettings: React.FC = () => {
  const { state, actions } = useContext(context);
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <Menu
      menuButton={
        <IconButton>
          <SettingsIcon />
        </IconButton>
      }
      menuStyle={{
        color: theme.palette.dark.contrastText,
        backgroundColor: theme.palette.dark.light,
        border: `1px solid ${theme.palette.divider}`
      }}>
      <TSCMenuItem>
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
      </TSCMenuItem>
      <MenuDivider style={{ backgroundColor: theme.palette.dark.divider }} />
      <MenuHeader style={{ color: theme.palette.dark.contrastText }}>{t(`languages`)}</MenuHeader>
      <MenuDivider style={{ backgroundColor: theme.palette.dark.divider }} />
      {Object.entries(languageList).map(([key, value]) => (
        <TSCMenuItem
          key={key}
          type="checkbox"
          checked={i18next.language === value}
          onClick={() => {
            i18next.changeLanguage(value);
          }}>
          <Typography>{t(`languageNames.${value}`)}</Typography>
        </TSCMenuItem>
      ))}
    </Menu>
  );
};
