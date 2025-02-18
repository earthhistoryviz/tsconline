import { observer } from "mobx-react-lite";
import React, { forwardRef, useContext, useEffect, useState } from "react";
import { context } from "../state";
import styles from "./CrossPlotSideBar.module.css";
import { Box, FormControl, MenuItem, Select, TextField, Typography, useTheme } from "@mui/material";
import Color from "color";
import { ColumnDisplay } from "../settings_tabs/Column";
import { AccessTimeRounded, BookmarkRounded, TableChartRounded } from "@mui/icons-material";
import { CrossPlotTimeSettings, Marker } from "../types";
import { ColumnInfo } from "@tsconline/shared";
import { useTranslation } from "react-i18next";
import { FormLabel } from "react-bootstrap";
import { CustomDivider, TSCButton, TSCCheckbox } from "../components";
import { useNavigate } from "react-router";
import TSCColorPicker from "../components/TSCColorPicker";

export const CrossPlotSideBar = observer(
  forwardRef<HTMLDivElement>(function CrossPlotSidebar(_, ref) {
    const [tabIndex, setTabIndex] = useState(0);
    const [sidebarWidth, setSidebarWidth] = useState("300px"); // this is so the sidebar retains the width when resized
    const { state, actions } = useContext(context);
    const navigate = useNavigate();
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
      {
        tabName: "Markers",
        Icon: BookmarkRounded,
        component: <Markers markers={state.crossPlot.markers} />
      }
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
        <Box className={styles.tabContent}>
          <TSCButton className={styles.generate} onClick={() => actions.compileAndSendCrossPlotChartRequest(navigate)}>
            Generate Cross Plot
          </TSCButton>
          {tabs[tabIndex].component}
        </Box>
      </Box>
    );
  })
);

const Time: React.FC = observer(() => {
  const { state, actions } = useContext(context);
  const { t } = useTranslation();
  return (
    <Box className={styles.timeComponent}>
      <CrossPlotTimeSettingsForm
        possibleCharts={state.settingsTabs.columns?.children}
        formLabel={t("crossPlot.time.xAxis")}
        disabled
        settings={state.crossPlot.chartXTimeSettings}
        column={state.crossPlot.chartX}
        setTimeSettings={actions.setCrossPlotChartXTimeSettings}
        setCrossPlotChart={actions.setCrossPlotChartX}
      />
      <CustomDivider />
      <CrossPlotTimeSettingsForm
        possibleCharts={state.settingsTabs.columns?.children}
        formLabel={t("crossPlot.time.yAxis")}
        settings={state.crossPlot.chartYTimeSettings}
        column={state.crossPlot.chartY}
        setTimeSettings={actions.setCrossPlotChartYTimeSettings}
        setCrossPlotChart={actions.setCrossPlotChartY}
      />
    </Box>
  );
});

type CrossPlotTimeProps = {
  possibleCharts: ColumnInfo[] | undefined;
  settings: CrossPlotTimeSettings;
  column: ColumnInfo | undefined;
  setTimeSettings: (crossPlotSettings: Partial<CrossPlotTimeSettings>) => void;
  setCrossPlotChart: (crossPlotSettings: ColumnInfo | undefined) => void;
  formLabel: string;
  disabled?: boolean;
};
const CrossPlotTimeSettingsForm: React.FC<CrossPlotTimeProps> = observer(
  ({ possibleCharts, column, settings, formLabel, setTimeSettings, setCrossPlotChart, disabled }) => {
    const { t } = useTranslation();
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
            const col = possibleCharts?.find((col) => col.units === evt.target.value);
            if (!col) return;
            setCrossPlotChart(col);
          }}
          className={styles.unitSelect}>
          {possibleCharts &&
            Object.entries(possibleCharts).map(([index, column]) => (
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
              FormHelperTextProps={{ style: { fontSize: "13px" } }}
            />
          </FormControl>
        </Box>
      </Box>
    );
  }
);

type MarkersProps = {
  markers: Marker[];
};
const Markers: React.FC<MarkersProps> = observer(({ markers }) => {
  return (
    <Box className={styles.markersComponent}>
      {markers.map((marker, index) => (
        <Box key={index} display="flex" flexDirection="column" gap="10px" paddingBottom="10px">
          <MarkerOptions marker={marker} />
          {index !== markers.length - 1 && <CustomDivider />}
        </Box>
      ))}
    </Box>
  );
});

const MarkerOptions: React.FC<{ marker: Marker }> = observer(({ marker }) => {
  const { actions } = useContext(context);
  return (
    <Box className={styles.markerContainer}>
      <Box className={styles.checkBoxContainer}>
        <TSCCheckbox />
      </Box>
      <Box className={styles.markerOptions}>
        <Box className={styles.topMarkerRow}>
          <TSCColorPicker
            color={marker.color}
            onColorChange={(evt) => {
              actions.editCrossPlotMarker(marker, { color: evt });
            }}
            className={styles.colorPicker}
          />
          <TextField select size="small" className={styles.selectMarker} label="Type" value="">
            <MenuItem value="a">A</MenuItem>
          </TextField>
          <TextField size="small" className={styles.ageMarker} label="Age" />
          <TextField size="small" className={styles.depthMarker} label="Depth" />
        </Box>
        <TextField size="small" label="Comment" fullWidth />
      </Box>
    </Box>
  );
});
