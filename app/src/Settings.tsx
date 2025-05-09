import { useContext } from "react";
import { context } from "./state";
import { observer } from "mobx-react-lite";
import { Column, ColumnContext } from "./settings_tabs/Column";
import { Time } from "./settings_tabs/Time";
import { Font } from "./settings_tabs/Font";
import { MapPoints } from "./settings_tabs/map_points/MapPoints";
import { Datapacks } from "./settings_tabs/Datapack";
import { styled, useTheme } from "@mui/material/styles";
import { Box, Tab, Tabs, Typography } from "@mui/material";
import "./Settings.css";
import { SettingsMenuOptionLabels, SettingsTabs } from "./types";
import { Search } from "./settings_tabs/Search";
import { Preferences } from "./settings_tabs/Preferences";
import LoadSave from "./settings_tabs/LoadSave";
import Color from "color";

const TabWrapper = styled(Tab, { shouldForwardProp: (prop) => prop !== "showIndicator" })<{ showIndicator?: boolean }>(
  ({ theme, showIndicator }) => ({
    textTransform: "none",
    minHeight: "auto",
    justifyContent: "flex-start",
    borderRadius: "10px",
    marginLeft: "5px",
    "&.Mui-selected": {
      backgroundColor: Color(theme.palette.button.main).alpha(0.15).string(),
      transition: "background-color 0.3s"
    },
    ...(showIndicator && {
      "&::before": {
        content: '""',
        position: "absolute",
        bottom: "10px",
        left: 0,
        width: "1px",
        height: "22px",
        backgroundColor: theme.palette.button.main,
        transition: "width 0.3s ease"
      }
    }),
    "&:hover:not(.Mui-selected)": {
      backgroundColor: Color(theme.palette.button.light).alpha(0.1).string(),
      transition: "background-color 0.3s"
    }
  })
);
const TabsWrapper = styled(Tabs)(() => ({
  width: "180px",
  justifyContent: "flex-start",
  "& .MuiTabs-indicator": {
    display: "none"
  }
}));
export const Settings = observer(function Settings() {
  const { state, actions } = useContext(context);
  const theme = useTheme();
  const tabs = Object.entries(SettingsMenuOptionLabels).map(([key, val]) => ({
    id: key,
    tab: val.label,
    icon: val.icon
  }));
  const tabKeys = Object.keys(SettingsMenuOptionLabels);
  const tabIndex = tabKeys.indexOf(state.settingsTabs.selected);

  return (
    <div className="settings-container" style={{ background: theme.palette.backgroundColor.main }}>
      <Box bgcolor="dark.main" className="settings-tabs-side-bar">
        <Typography className="settings-header-title" variant="h5" paddingTop="10px" paddingBottom="10px">
          Settings
        </Typography>
        <TabsWrapper
          onChange={(_, val) => {
            actions.setSettingsTabsSelected(tabKeys[val] as SettingsTabs);
          }}
          value={tabIndex}
          orientation="vertical">
          {tabs.map((tab) => {
            return (
              <TabWrapper
                showIndicator={state.settingsTabs.selected === tab.id}
                key={tab.id}
                label={tab.tab}
                icon={<tab.icon />}
                iconPosition="start"
              />
            );
          })}
        </TabsWrapper>
      </Box>
      <SettingsTab tab={state.settingsTabs.selected} />
    </div>
  );
});

const SettingsTab = observer(function SettingsTab({ tab }: { tab: SettingsTabs }) {
  const { state, actions } = useContext(context);
  switch (tab) {
    case "time":
      return <Time />;
    case "preferences":
      return <Preferences />;
    case "column":
      return (
        <ColumnContext.Provider
          value={{
            state: {
              columns: state.settingsTabs.columns,
              columnSearchTerm: state.settingsTabs.columnSearchTerm,
              columnSelected: state.columnMenu.columnSelected,
              timeSettings: state.settings.timeSettings
            },
            actions: {
              setColumnSelected: actions.setColumnSelected,
              toggleSettingsTabColumn: actions.toggleSettingsTabColumn
            }
          }}>
          <Column />
        </ColumnContext.Provider>
      );
    case "search":
      return <Search />;
    case "font":
      return <Font />;
    case "mappoints":
      return <MapPoints />;
    case "datapacks":
      return <Datapacks />;
    case "loadsave":
      return <LoadSave />;
  }
});
