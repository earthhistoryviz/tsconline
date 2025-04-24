import { useContext } from "react";
import { context } from "./state";
import { observer } from "mobx-react-lite";
import { Column, ColumnContext } from "./settings_tabs/Column";
import { Time } from "./settings_tabs/Time";
import { Font } from "./settings_tabs/Font";
import { MapPoints } from "./settings_tabs/map_points/MapPoints";
import { Datapacks } from "./settings_tabs/Datapack";
import { useTheme } from "@mui/material/styles";
import { Typography } from "@mui/material";
import "./Settings.css";
import { CustomTabs } from "./components/TSCCustomTabs";
import { SettingsMenuOptionLabels, SettingsTabs } from "./types";
import { Search } from "./settings_tabs/Search";
import { useTranslation } from "react-i18next";
import { Preferences } from "./settings_tabs/Preferences";
import LoadSave from "./settings_tabs/LoadSave";

export const Settings = observer(function Settings() {
  const { state, actions } = useContext(context);
  const theme = useTheme();
  const SettingsHeader = () => {
    const { t } = useTranslation();
    return (
      <div className="settings-header">
        <Typography className="settings-header-title" variant="h3">
          {t("title.settings")}
        </Typography>
      </div>
    );
  };
  const tabs = Object.values(SettingsMenuOptionLabels).map((val) => ({ id: val, tab: val }));
  const tabKeys = Object.keys(SettingsMenuOptionLabels);
  const tabIndex = tabKeys.indexOf(state.settingsTabs.selected);

  return (
    <div className="settings-container" style={{ background: theme.palette.backgroundColor.main }}>
      <SettingsHeader />
      <CustomTabs
        tabs={tabs}
        value={tabIndex}
        onChange={actions.setSettingsTabsSelected}
        tabIndicatorLength={70}
        centered
        className="main-settings-tabs"
      />
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
              columnSearchTerm: "",
              columnSelected: "",
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
