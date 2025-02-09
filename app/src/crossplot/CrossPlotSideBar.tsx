import { observer } from "mobx-react-lite";
import { forwardRef, useContext, useEffect, useRef, useState } from "react";
import { context } from "../state";
import styles from "./CrossPlotSideBar.module.css";
import { Box, FormControl, FormControlLabel, MenuItem, Select, TextField, Typography, useTheme } from "@mui/material";
import Color from "color";
import { ColumnDisplay } from "../settings_tabs/Column";
import { AccessTimeRounded, BookmarkRounded, TableChartRounded } from "@mui/icons-material";
import { CrossPlotTimeSettings } from "../types";
import { ColumnInfo } from "@tsconline/shared";
import { useTranslation } from "react-i18next";
import { FormLabel } from "react-bootstrap";
import { CustomDivider, NotImplemented } from "../components";

export const CrossPlotSideBar = observer(
  forwardRef<HTMLDivElement, {}>((_, ref) => {
    const [tabIndex, setTabIndex] = useState(0);
    const [sidebarWidth, setSidebarWidth] = useState("300px"); // this is so the sidebar retains the width when resized
    const theme = useTheme();
    useEffect(() => {
      if (typeof ref === "function") return;
      const sidebar = ref?.current;
      if (!sidebar) return;

      const observer = new ResizeObserver(() => {
        setSidebarWidth(`${sidebar.offsetWidth}px`); // Save width when resized
      });

      observer.observe(sidebar);
      return () => observer.disconnect();
    }, [ref]);
    const tabs = [
      { tabName: "Time", Icon: AccessTimeRounded, component: <Time /> },
      {
        tabName: "Columns",
        Icon: TableChartRounded,
        component: <ColumnDisplay />
      },
      { tabName: "Markers", Icon: BookmarkRounded, component: <NotImplemented size="medium" /> }
    ];
    return (
      <Box
        className={styles.crossPlotSideBar}
        sx={{ width: sidebarWidth }}
        ref={ref}
        bgcolor="backgroundColor.main"
        borderRight="1px solid"
        borderColor="divider">
        <Box className={styles.tabs} bgcolor={Color(theme.palette.dark.main).alpha(0.9).toString()}>
          {tabs.map((tab, index) => {
            const sx = {
              color: index === tabIndex ? theme.palette.button.main : theme.palette.dark.contrastText
            };
            return (
              <Box
                className={styles.tab}
                key={index}
                sx={{
                  "&:hover": {
                    // make the background color of the tab lighter when hovered
                    backgroundColor:
                      index === tabIndex
                        ? Color(theme.palette.button.main).alpha(0.1).toString()
                        : Color("gray").alpha(0.1).toString()
                  }
                }}
                onClick={() => setTabIndex(index)}>
                <tab.Icon sx={sx} />
                <Typography
                  className={styles.tabText}
                  sx={sx}
                  color="dark.contrastText"
                  onClick={() => setTabIndex(index)}>
                  {tab.tabName}
                </Typography>
              </Box>
            );
          })}
        </Box>
        <Box className={styles.tabContent}>{tabs[tabIndex].component}</Box>
      </Box>
    );
  })
);

const Time: React.FC = () => {
  const { state, actions } = useContext(context);
  const { t } = useTranslation();
  return (
    <Box display="flex" flexDirection="column" padding="30px" gap="30px">
      <CrossPlotTimeSettingsForm
        formLabel={t("crossPlot.time.xAxis")}
        disabled
        settings={state.crossplotSettingsTabs.chartXTimeSettings}
        column={state.crossplotSettingsTabs.chartX}
        setTimeSettings={actions.setCrossPlotChartXTimeSettings}
        setCrossPlotChart={actions.setCrossPlotChartX}
      />
      <CustomDivider />
      <CrossPlotTimeSettingsForm
        formLabel={t("crossPlot.time.yAxis")}
        settings={state.crossplotSettingsTabs.chartYTimeSettings}
        column={state.crossplotSettingsTabs.chartY}
        setTimeSettings={actions.setCrossPlotChartYTimeSettings}
        setCrossPlotChart={actions.setCrossPlotChartY}
      />
    </Box>
  );
};

type CrossPlotTimeProps = {
  settings: CrossPlotTimeSettings;
  column: ColumnInfo | undefined;
  setTimeSettings: (crossPlotSettings: Partial<CrossPlotTimeSettings>) => void;
  setCrossPlotChart: (crossPlotSettings: ColumnInfo | undefined) => void;
  formLabel: string;
  disabled?: boolean;
};
const CrossPlotTimeSettingsForm: React.FC<CrossPlotTimeProps> = ({
  column,
  settings,
  formLabel,
  setTimeSettings,
  setCrossPlotChart,
  disabled
}) => {
  const { t } = useTranslation();
  const { state } = useContext(context);
  const checkAgeRange = () => settings && settings.topStageAge > settings.baseStageAge;
  const pleaseSelectAUnit = t("crossPlot.time.select-unit");
  return (
    <Box display="flex" flexDirection="column" gap="15px">
      <Box display="flex" flexDirection="row" justifyContent="space-between">
        <Typography className={styles.timeLabel} fontWeight="700">
          {formLabel}
        </Typography>
        <Typography className={styles.unitLabel} fontWeight="700">
          {column?.units || t("crossPlot.time.no-unit-selected")}
        </Typography>
      </Box>
      <Select
        disabled={disabled || !column}
        value={column?.units || 0}
        onChange={(evt) => {
          const col = state.settingsTabs.columns?.children.find((col) => col.units === evt.target.value);
          if (!col) return;
          setCrossPlotChart(col);
        }}
        className={styles.unitSelect}>
        {state.settingsTabs.columns &&
          Object.entries(state.settingsTabs.columns.children).map(([index, column]) => (
            <MenuItem key={index} value={column.units}>
              {`${column.name} (${column.units})`}
            </MenuItem>
          ))}
        {!column && (
          <MenuItem value={0}>
            <em>{t("crossPlot.time.no-chart-units-available")}</em>
          </MenuItem>
        )}
      </Select>
      <Box display="flex" flexDirection="column" gap="15px" paddingLeft="13px">
        <FormControl className={styles.timeIntervalForm}>
          <FormLabel className={styles.timeIntervalLabel}>{t("settings.time.interval.top")}</FormLabel>
          <TextField
            size="small"
            disabled={!column?.units}
            label={`${column?.units || pleaseSelectAUnit}`}
            type="number"
            value={column?.units ? settings.topStageAge : ""}
            onChange={(event) => {
              if (!settings || !column?.units) return;
              setTimeSettings({ topStageAge: parseFloat(event.target.value) });
            }}
            error={checkAgeRange()}
            helperText={checkAgeRange() ? t("settings.time.interval.helper-text") : ""}
            FormHelperTextProps={{ style: { fontSize: "13px" } }}
          />
        </FormControl>
        <FormControl className={styles.timeIntervalForm}>
          <FormLabel className={styles.timeIntervalLabel}>{t("settings.time.interval.base")}</FormLabel>
          <TextField
            size="small"
            disabled={!column?.units}
            label={`${column?.units || pleaseSelectAUnit}`}
            type="number"
            value={column?.units ? settings.baseStageAge : ""}
            onChange={(event) => {
              if (!settings || !column?.units) return;
              setTimeSettings({ baseStageAge: parseFloat(event.target.value) });
            }}
            error={checkAgeRange()}
            helperText={checkAgeRange() ? t("settings.time.interval.helper-text") : ""}
            FormHelperTextProps={{ style: { fontSize: "13px" } }}
          />
        </FormControl>
        <FormControl className={styles.timeIntervalForm}>
          <FormLabel className={styles.timeIntervalLabel}>
            {t("settings.time.interval.vertical-scale-header")}
          </FormLabel>
          <TextField
            size="small"
            disabled={!column?.units}
            label={`${column?.units || pleaseSelectAUnit}`}
            type="number"
            value={column?.units ? settings.unitsPerMY : ""}
            onChange={(event) => {
              if (!settings || !column?.units) return;
              setTimeSettings({ unitsPerMY: parseFloat(event.target.value) });
            }}
            error={checkAgeRange()}
            helperText={checkAgeRange() ? t("settings.time.interval.helper-text") : ""}
            FormHelperTextProps={{ style: { fontSize: "13px" } }}
          />
        </FormControl>
      </Box>
    </Box>
  );
};
