import { useContext } from "react";
import { context } from "./state";
import { observer } from "mobx-react-lite";
import { Column, ColumnContext } from "./settings_tabs/Column";
import { Time } from "./settings_tabs/Time";
import { Font } from "./settings_tabs/Font";
import { MapPoints } from "./settings_tabs/map_points/MapPoints";
import { Datapacks } from "./settings_tabs/Datapack";
import { useTheme } from "@mui/material/styles";
import { Box, Typography } from "@mui/material";
import "./Settings.css";
import { SettingsMenuOptionLabels, SettingsTabs } from "./types";
import { Search } from "./settings_tabs/Search";
import { Preferences } from "./settings_tabs/Preferences";
import { TabWrapper, TabsWrapper } from "./components";
import LoadSettings from "./settings_tabs/LoadSettings";
import SaveSettings from "./settings_tabs/SaveSettings";
import { useTranslation } from "react-i18next";
import type { TFunction, i18n as I18n } from "i18next";

const getSettingsTabLabel = (id: string, t: TFunction, i18n: I18n) => {
  const special: Record<string, string> = {
    mappoints: "Map Points",
    datapacks: "Datapacks"
  };

  const getDefaultNamespace = (i18nInstance: I18n): string => {
    const ns = i18nInstance.options.defaultNS ?? "translation";
    return Array.isArray(ns) ? ns[0] : (ns as string);
  };

  const ns = getDefaultNamespace(i18n);

  const hasKeyInCurrentLang = (key: string) => Boolean(i18n.getResource(i18n.language, ns, key));

  const keyLower = `settingsTabs.${id}`;
  if (hasKeyInCurrentLang(keyLower)) {
    return t(keyLower);
  }

  if (special[id]) {
    const keySpecial = `settingsTabs.${special[id]}`;
    if (hasKeyInCurrentLang(keySpecial)) {
      return t(keySpecial);
    }
  }

  const cap = id.charAt(0).toUpperCase() + id.slice(1);
  const keyCap = `settingsTabs.${cap}`;
  if (hasKeyInCurrentLang(keyCap)) {
    return t(keyCap);
  }

  return t(keyLower);
};

export const Settings = observer(function Settings() {
  const { state, actions } = useContext(context);
  const theme = useTheme();
  const { t, i18n } = useTranslation();
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
        <Box>
          <Typography className="settings-header-title" variant="h5" paddingTop="10px" paddingBottom="10px">
            {t("settings.header")}
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
                  label={getSettingsTabLabel(tab.id, t, i18n)}
                  setting-tour={`setting-tour-${tab.tab}-tab`}
                  icon={<tab.icon />}
                  iconPosition="start"
                />
              );
            })}
          </TabsWrapper>
        </Box>
        <Box className="load-save-settings-sidebar">
          <LoadSettings />
          <SaveSettings />
        </Box>
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
              columns: state.settingsTabs.renderColumns,
              columnHashMap: state.settingsTabs.columnHashMap,
              columnSearchTerm: state.settingsTabs.columnSearchTerm,
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
  }
});
