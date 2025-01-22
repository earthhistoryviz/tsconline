import { Box, Typography } from "@mui/material";
import { observer } from "mobx-react-lite";
import styles from "./CrossplotSettings.module.css";
import { CrossplotSettingsTabs } from "../types";
import { context } from "../state";
import { useContext } from "react";
import { CustomTabs } from "../components/TSCCustomTabs";
import { Column } from "../settings_tabs/Column";
import { CrossplotTime } from "./CrossplotTime";

export const CrossplotSettings = observer(() => {
  const { state, actions } = useContext(context);
  const tabs = Object.values(CrossplotSettingsTabs).map((val) => ({ id: val, tab: val }));
  const tabKeys = Object.keys(CrossplotSettingsTabs);
  const tabIndex = tabKeys.indexOf(state.crossplotSettingsTabs.selected);
  return (
    <Box className={styles.crossplotSettingsContainer}>
      <Box className={styles.crossplotSettingsHeader}>
        <Typography variant="h3" className={styles.crossplotSettingsTitle}>
          Crossplot Settings
        </Typography>
      </Box>
      <CustomTabs
        tabs={tabs}
        value={tabIndex}
        onChange={actions.setCrossplotSettingsTabsSelected}
        tabIndicatorLength={70}
        centered
        className="main-settings-tabs"
      />
      <SettingsTab tab={state.crossplotSettingsTabs.selected} />
    </Box>
  );
});

const SettingsTab = observer(function SettingsTab({ tab }: { tab: CrossplotSettingsTabs }) {
  const { state, actions } = useContext(context);
  switch (tab) {
    case "xAxis":
      return (
        <CrossplotTime
          settings={state.crossplotSettingsTabs.chartXTimeSettings}
          column={state.crossplotSettingsTabs.chartX}
          setTimeSettings={actions.setCrossplotChartXTimeSettings}
          setCrossplotChart={actions.setCrossplotChartX}
        />
      );
    case "yAxis":
      return (
        <CrossplotTime
          settings={state.crossplotSettingsTabs.chartYTimeSettings}
          column={state.crossplotSettingsTabs.chartY}
          setTimeSettings={actions.setCrossplotChartYTimeSettings}
          setCrossplotChart={actions.setCrossplotChartY}
        />
      );
    case "column":
      return <Column />;
  }
  return <></>;
});
