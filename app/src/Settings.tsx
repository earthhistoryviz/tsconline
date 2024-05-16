import React, { useContext } from "react";
import { context } from "./state";
import { observer } from "mobx-react-lite";
import { Column } from "./settings_tabs/Column";
import { Time } from "./settings_tabs/Time";
import { Font } from "./settings_tabs/Font";
import { MapPoints } from "./settings_tabs/map_points/MapPoints";
import { Datapacks } from "./settings_tabs/Datapack";
import { useTheme } from "@mui/material/styles";
import { TSCTabs, TSCTab, InputFileUpload } from "./components";
import DownloadIcon from "@mui/icons-material/Download";
import { applySettings, pushSnackbar } from "./state/actions";
import { xmlToJson } from "./state/parse-settings";

export const Settings = observer(function Settings() {
  const { state, actions } = useContext(context);
  const theme = useTheme();

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    actions.setSettingsTabsSelected(newValue);
  };

  const selectedTabIndex = actions.translateTabToIndex(state.settingsTabs.selected);

  function displayChosenTab() {
    switch (state.settingsTabs.selected) {
      case "time":
        return <Time />;
      case "column":
        return <Column />;
      case "font":
        return <Font />;
      case "mappoints":
        return <MapPoints />;
      case "datapacks":
        return <Datapacks />;
    }
  }

  function loadSettings(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) {
      pushSnackbar("failed to load settings: no files uploaded", "warning");
      return;
    }
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.readAsText(file);
    if (reader.result && typeof reader.result === "string") {
      try {
        applySettings(xmlToJson(reader.result));
      } catch (e) {
        pushSnackbar("Failed to load settings: file content is in wrong format", "warning");
      }
    } else {
      pushSnackbar("Falied to load settings: file content is not a string", "warning");
    }
  }

  return (
    <div style={{ background: theme.palette.settings.light, overflow: "auto" }}>
      <InputFileUpload startIcon={<DownloadIcon />} text={"load"} onChange={(e) => loadSettings(e)} />
      <TSCTabs value={selectedTabIndex} onChange={handleChange} centered>
        <TSCTab label="Time" onClick={() => actions.setSettingsTabsSelected("time")} />
        <TSCTab label="Column" onClick={() => actions.setSettingsTabsSelected("column")} />
        <TSCTab label="Font" onClick={() => actions.setSettingsTabsSelected("font")} />
        <TSCTab label="Map Points" onClick={() => actions.setSettingsTabsSelected("mappoints")} />
        <TSCTab label="Datapacks" onClick={() => actions.setSettingsTabsSelected("datapacks")} />
      </TSCTabs>
      {displayChosenTab()}
    </div>
  );
});
