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
import FileSaver from "file-saver";
import { Typography } from "@mui/material";

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
  async function loadSettings(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) {
      actions.pushSnackbar("failed to load settings: no files uploaded", "info");
      return;
    }
    const file = e.target.files[0];
    const data = await file.text();
    try {
      actions.applySettings(xmlToJson(data));
    } catch (e) {
      actions.pushSnackbar("Failed to load settings: file content is in wrong format", "info");
    }
    actions.pushSnackbar("successfully loaded settings!", "success");
  }

  function saveSettings() {
    if (!state.settingsTabs.columns) {
      actions.pushSnackbar("Column Root is not set, try again after selecting a datapack", "info");
      return;
    }
    if (state.settingsTabs.columns.children.length === 0) {
      actions.pushSnackbar("No columns are set, proceeding...", "info");
    }
    const columnCopy: ColumnInfo = cloneDeep(state.settingsTabs.columns!);
    const settingsCopy: ChartSettings = cloneDeep(state.settings);
    const blob = new Blob([jsonToXml(columnCopy, settingsCopy)], { type: "text/plain;charset=utf-8" });
    FileSaver.saveAs(blob, "settings.tsc");
    actions.pushSnackbar("successfully saved settings!", "success");
  }

  const SettingsHeader = () => {
    return (
      <div
        style={{
          display: "flex",
          marginBottom: "1vh",
          justifyContent: "space-evenly",
          width: "100%"
        }}>
        {/* spacer for aligning items */}
        <div style={{ flex: "1", textAlign: "left" }} />
        <Typography style={{ flex: "1", textAlign: "center", fontSize: 48, marginBottom: "1vh", marginTop: "1vh" }}>
          Settings
        </Typography>
        <div style={{ flex: "1", textAlign: "right", marginTop: "5vh" }}>
          <InputFileUpload startIcon={<FileUploadIcon />} text={"load"} onChange={(e) => loadSettings(e)} />
          <TSCButton startIcon={<DownloadIcon />} onClick={saveSettings}>
            save
          </TSCButton>
        </div>
      </div>
    );
  };
  return (
    <div style={{ background: theme.palette.settings.light, overflow: "auto" }}>
      <SettingsHeader />
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
