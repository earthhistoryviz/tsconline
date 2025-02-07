import { Box, Typography } from "@mui/material";
import { observer } from "mobx-react-lite";
import styles from "./CrossPlotSettings.module.css";
import { CrossPlotSettingsTabs } from "../types";
import { context } from "../state";
import { useContext } from "react";
import { CustomTabs } from "../components/TSCCustomTabs";
import { Column } from "../settings_tabs/Column";
import { CrossPlotTime } from "./CrossPlotTime";
import { TSCButton } from "../components";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export const CrossPlotSettings = observer(() => {
  const { state, actions } = useContext(context);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const tabs = Object.values(CrossPlotSettingsTabs).map((val) => ({ id: val, tab: val }));
  const tabKeys = Object.keys(CrossPlotSettingsTabs);
  const tabIndex = tabKeys.indexOf(state.crossplotSettingsTabs.selected);
  return (
    <Box className={styles.crossplotSettingsContainer}>
      <Box className={styles.crossplotSettingsHeader}>
        <Typography variant="h3" className={styles.crossplotSettingsTitle}>
          CrossPlot Settings
        </Typography>
      </Box>
      <CustomTabs
        tabs={tabs}
        value={tabIndex}
        onChange={actions.setCrossPlotSettingsTabsSelected}
        tabIndicatorLength={100}
        width={130}
        centered
        className="main-settings-tabs"
      />
      <SettingsTab tab={state.crossplotSettingsTabs.selected} />
      <TSCButton
        onClick={() => actions.compileCrossPlotChartRequest(navigate)}
        buttonType="gradient"
        className={styles.crossPlotGenerateButton}>
        {t("button.generate-cross-plot")}
      </TSCButton>
    </Box>
  );
});

const SettingsTab = observer(function SettingsTab({ tab }: { tab: CrossPlotSettingsTabs }) {
  const { state, actions } = useContext(context);
  switch (tab) {
    case "xAxis":
      return (
        <CrossPlotTime
          disabled
          settings={state.crossplotSettingsTabs.chartXTimeSettings}
          column={state.crossplotSettingsTabs.chartX}
          setTimeSettings={actions.setCrossPlotChartXTimeSettings}
          setCrossPlotChart={actions.setCrossPlotChartX}
        />
      );
    case "yAxis":
      return (
        <CrossPlotTime
          settings={state.crossplotSettingsTabs.chartYTimeSettings}
          column={state.crossplotSettingsTabs.chartY}
          setTimeSettings={actions.setCrossPlotChartYTimeSettings}
          setCrossPlotChart={actions.setCrossPlotChartY}
        />
      );
    case "column":
      return <Column />;
  }
  return <></>;
});
