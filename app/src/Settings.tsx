import { useContext } from "react";
import { context } from "./state";
import { observer } from "mobx-react-lite";
import { Column } from "./settings_tabs/Column";
import { Time } from "./settings_tabs/Time";
import { Font } from "./settings_tabs/Font";
import { MapPoints } from "./settings_tabs/map_points/MapPoints";
import { Datapacks } from "./settings_tabs/Datapack";
import { useTheme } from "@mui/material/styles";
import { Typography } from "@mui/material";
import SaveSettings from "./settings_tabs/SaveSettings";
import LoadSettings from "./settings_tabs/LoadSettings";
import "./Settings.css";
import { CustomTabs } from "./components/TSCCustomTabs";
import { SettingsMenuOptionLabels, SettingsTabs } from "./types";
import { Search } from "./settings_tabs/Search";
import { useTranslation } from "react-i18next";
import { toJS } from "mobx";
import { TSCButton } from "./components";
import { useNavigate, useLocation } from "react-router-dom";
import "./NavBar.css";

export const Settings = observer(function Settings() {
  const { state, actions } = useContext(context);
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const SettingsHeader = () => {
    return (
      <div className="settings-header">
        <LoadSettings />
        <Typography className="settings-header-title" variant="h3">
          {t("title.settings")}
        </Typography>
        <SaveSettings />
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
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "10px" }}>
        <TSCButton
          buttonType="gradient"
          style={{
            width: "auto",
            height: "auto",
            fontSize: "0.85rem"
          }}
          onClick={async () => {
            await actions.processDatapackConfig(toJS(state.unsavedDatapackConfig), "");
            actions.initiateChartGeneration(navigate, location.pathname);
          }}>
          {t("button.generate")}
        </TSCButton>
      </div>
    </div>
  );
});

const SettingsTab = observer(function SettingsTab({ tab }: { tab: SettingsTabs }) {
  switch (tab) {
    case "time":
      return <Time />;
    case "column":
      return <Column />;
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
