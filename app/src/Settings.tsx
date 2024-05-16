import React, { useContext } from "react";
import { context } from "./state";
import { observer } from "mobx-react-lite";
import { Column } from "./settings_tabs/Column";
import { Time } from "./settings_tabs/Time";
import { Font } from "./settings_tabs/Font";
import { MapPoints } from "./settings_tabs/map_points/MapPoints";
import { Datapacks } from "./settings_tabs/Datapack";
import { useTheme } from "@mui/material/styles";
import { TSCTabs, TSCTab, InputFileUpload, TSCButton } from "./components";
import DownloadIcon from "@mui/icons-material/Download";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import { jsonToXml, xmlToJson } from "./state/parse-settings";
import { cloneDeep } from "lodash";
import { ColumnInfo } from "@tsconline/shared";
import { ChartSettings } from "./types";
import FileSaver from 'file-saver';


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
      actions.pushSnackbar("failed to load settings: no files uploaded", "warning");
      return;
    }
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.readAsText(file);
    if (reader.result && typeof reader.result === "string") {
      try {
        actions.applySettings(xmlToJson(reader.result));
      } catch (e) {
        actions.pushSnackbar("Failed to load settings: file content is in wrong format", "warning");
      }
    } else {
      actions.pushSnackbar("Falied to load settings: file content is not a string", "warning");
    }
  }
function saveSettings() {
  if (!state.settingsTabs.columns || state.settingsTabs.columns.children.length === 0) {
    actions.pushSnackbar("Failed to save settings: columns are empty", "warning");
    return;
  }
  const columnCopy:ColumnInfo = cloneDeep(state.settingsTabs.columns!);
  const settingsCopy:ChartSettings = cloneDeep(state.settings)
  let blob = new Blob([jsonToXml(columnCopy, state.settings)], {type: "text/plain;charset=utf-8"});
  FileSaver.saveAs(blob, "settings.tsc");
}
  return (
    <div style={{ background: theme.palette.settings.light, overflow: "auto" }}>
      <InputFileUpload startIcon={<FileUploadIcon />} text={"load"} onChange={(e) => loadSettings(e)} />
      <TSCButton startIcon={<DownloadIcon />} onClick={saveSettings}>save</TSCButton>
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
