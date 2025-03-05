import { observer } from "mobx-react-lite";
import React, { forwardRef, useContext, useState } from "react";
import { context } from "../state";
import styles from "./CrossPlotSideBar.module.css";
import { Box, FormControl, MenuItem, Select, TextField, Typography, useTheme } from "@mui/material";
import Color from "color";
import { ColumnDisplay } from "../settings_tabs/Column";
import { AccessTimeRounded, BookmarkRounded, TableChartRounded, Timeline } from "@mui/icons-material";
import {
  CrossPlotTimeSettings,
  Marker,
  Model,
  assertColumnInfoRoot,
  isMarkerType,
  isModelType,
  markerTypes,
  modelTypes
} from "../types";
import {
  ColumnInfo,
  Datapack,
  DatapackUniqueIdentifier,
  assertDatapackArray,
  defaultColumnRoot,
  getUUIDOfDatapackType
} from "@tsconline/shared";
import { useTranslation } from "react-i18next";
import { FormLabel } from "react-bootstrap";
import { CustomDivider, TSCButton, TSCCheckbox } from "../components";
import { useNavigate } from "react-router";
import TSCColorPicker from "../components/TSCColorPicker";
import { ageToCoord } from "../components/TSCCrossPlotSVGComponent";
import { ErrorCodes } from "../util/error-codes";
import { fetcher } from "../util";
import { getDatapackFromArray } from "../state/non-action-util";
import { cloneDeep } from "lodash";
import { jsonToXml } from "../state/parse-settings";

const sendCrossPlotConversionRequest = async (
  models: Model[],
  datapack: DatapackUniqueIdentifier,
  xmlSettings: string
) => {
  if (models.length === 0) {
    console.error("No models to convert");
    return;
  }
  try {
    const body = {
      datapackTitle: datapack.title,
      uuid: getUUIDOfDatapackType(datapack),
      models: models
        .map((model) => `${model.x}\t${model.y}\t${model.age}\t${model.depth}\t${model.color}\t${model.comment}`)
        .join("\n"),
      settings: xmlSettings
    };
    const response = await fetcher("/crossplot/convert", {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json"
      }
    });
    if (!response.ok) {
      throw new Error("Failed to convert datapack");
    }
    console.log("Successfully converted datapack");
    console.log(await response.json());
  } catch (e) {
    console.error(e);
  }
};

export const CrossPlotSideBar = observer(
  forwardRef<HTMLDivElement>(function CrossPlotSidebar(_, ref) {
    const [tabIndex, setTabIndex] = useState(0);
    const { state, actions } = useContext(context);
    const navigate = useNavigate();
    const theme = useTheme();
    return (
      <Box
        className={styles.crossPlotSideBar}
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
          <TSCButton
            className={styles.convert}
            onClick={async () => {
              try {
                if (!state.crossPlot.chartY) {
                  actions.pushError(ErrorCodes.INVALID_CROSSPLOT_CONVERSION);
                  return;
                }
                assertColumnInfoRoot(state.crossPlot.chartY);
                const datapack = getDatapackFromArray(state.crossPlot.chartY.datapackUniqueIdentifier, state.datapacks);
                if (!datapack) {
                  actions.pushError(ErrorCodes.INVALID_CROSSPLOT_CONVERSION);
                  return;
                }
                const columnRoot = cloneDeep(defaultColumnRoot);
                columnRoot.children.push(datapack.columnInfo);
                const columnCopy = cloneDeep(columnRoot);
                const chartSettingsCopy = cloneDeep(state.settings);
                const xmlSettings = jsonToXml(columnCopy, state.settingsTabs.columnHashMap, chartSettingsCopy);
                await sendCrossPlotConversionRequest(state.crossPlot.models, datapack, xmlSettings);
              } catch (e) {
                console.log(e);
              }
            }}>
            Convert Datapack
          </TSCButton>
          <TSCButton className={styles.generate} onClick={() => actions.compileAndSendCrossPlotChartRequest(navigate)}>
            Generate Cross Plot
          </TSCButton>
          {tabs[tabIndex].component}
        </Box>
      </Box>
    );
  })
);

export const MobileCrossPlotSideBar = observer(
  forwardRef<HTMLDivElement>(function MobileCrossPlotSidebar(_, ref) {
    const [tabIndex, setTabIndex] = useState(0);
    const { actions } = useContext(context);
    const navigate = useNavigate();
    const theme = useTheme();
    return (
      <Box
        className={styles.mobileCrossPlotSideBar}
        ref={ref}
        bgcolor="backgroundColor.main"
        borderTop="1px solid"
        borderColor="divider">
        <Box className={styles.mobileTabs} bgcolor={Color(theme.palette.dark.main).alpha(0.9).toString()}>
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
        <Box className={styles.mobileTabContent}>
          <TSCButton className={styles.mobileConvert} onClick={() => {}}>
            Convert Datapack
          </TSCButton>
          <TSCButton
            className={styles.mobileGenerate}
            onClick={() => actions.compileAndSendCrossPlotChartRequest(navigate)}>
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
const Models: React.FC = observer(() => {
  const { state } = useContext(context);
  const { t } = useTranslation();
  return (
    <Box className={styles.modelsComponent} display={state.crossPlot.models.length === 0 ? "flex" : ""}>
      {state.crossPlot.models.map((model, index) => (
        <Box key={index} className={styles.modelOptions}>
          <ModelOptions model={model} />
          {index !== state.crossPlot.models.length - 1 && <CustomDivider />}
        </Box>
      ))}
      {state.crossPlot.models.length === 0 && (
        <Typography className={styles.noModelsText}>{t("crossPlot.sidebar.no-models")}</Typography>
      )}
    </Box>
  );
});
const ModelOptions: React.FC<{ model: Model }> = observer(({ model }) => {
  const { state, actions } = useContext(context);
  const [age, setAge] = useState(model.age.toString());
  const [ageError, setAgeError] = useState(false);
  const [depth, setDepth] = useState(model.depth.toString());
  const [depthError, setDepthError] = useState(false);
  return (
    <Box className={styles.modelContainer}>
      <Box className={styles.checkBoxContainer}>
        <TSCCheckbox />
      </Box>
      <TSCColorPicker
        color={model.color}
        onColorChange={(evt) => {
          actions.editCrossPlotModel(model, { color: evt });
        }}
        className={styles.colorPicker}
      />
      <Box className={styles.modelOptions}>
        <Box className={styles.topMarkerRow}>
          <TextField
            select
            size="small"
            label="Type"
            value={model.type}
            onChange={(e) => {
              if (!isModelType(e.target.value)) return;
              actions.editCrossPlotModel(model, { type: e.target.value });
            }}>
            {modelTypes.map((modelType) => (
              <MenuItem key={modelType} value={modelType}>
                {modelType}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            label="Age"
            value={age}
            type="number"
            error={ageError}
            onBlur={(e) => {
              const num = parseFloat(e.target.value);
              if (
                isNaN(num) ||
                num < 0 ||
                !actions.checkValidityOfNewModel({
                  x: ageToCoord(
                    num,
                    state.crossPlot.crossPlotBounds!.minX,
                    state.crossPlot.crossPlotBounds!.maxX,
                    state.crossPlot.crossPlotBounds!.topAgeX,
                    state.crossPlot.crossPlotBounds!.scaleX
                  ),
                  y: model.y
                })
              ) {
                setAgeError(true);
                return;
              }
              setAgeError(false);
              actions.editCrossPlotModel(model, { age: num });
            }}
            onChange={(evt) => {
              setAge(evt.target.value);
            }}
          />
          <TextField
            size="small"
            label="Depth"
            type="number"
            value={depth}
            error={depthError}
            onBlur={(e) => {
              const num = parseFloat(e.target.value);
              if (
                isNaN(num) ||
                num < 0 ||
                !actions.checkValidityOfNewModel({
                  x: model.x,
                  y: ageToCoord(
                    num,
                    state.crossPlot.crossPlotBounds!.minY,
                    state.crossPlot.crossPlotBounds!.maxY,
                    state.crossPlot.crossPlotBounds!.topAgeY,
                    state.crossPlot.crossPlotBounds!.scaleY
                  )
                })
              ) {
                setDepthError(true);
                return;
              }
              setDepthError(false);
              actions.editCrossPlotModel(model, { depth: num });
            }}
            onChange={(evt) => {
              setDepth(evt.target.value);
            }}
          />
        </Box>
        <TextField
          size="small"
          label="Comment"
          fullWidth
          value={model.comment}
          onChange={(evt) => {
            actions.editCrossPlotModel(model, { comment: evt.target.value });
          }}
        />
      </Box>
    </Box>
  );
});

const Markers: React.FC = observer(() => {
  const { state } = useContext(context);
  const { t } = useTranslation();
  return (
    <Box className={styles.markersComponent} display={state.crossPlot.markers.length === 0 ? "flex" : ""}>
      {state.crossPlot.markers.map((marker, index) => (
        <Box key={index} className={styles.markerOptions}>
          <MarkerOptions marker={marker} />
          {index !== state.crossPlot.markers.length - 1 && <CustomDivider />}
        </Box>
      ))}
      {state.crossPlot.markers.length === 0 && (
        <Typography className={styles.noMarkersText}>{t("crossPlot.sidebar.no-markers")}</Typography>
      )}
    </Box>
  );
});

const MarkerOptions: React.FC<{ marker: Marker }> = observer(({ marker }) => {
  const { actions } = useContext(context);
  const [age, setAge] = useState(marker.age.toString());
  const [depth, setDepth] = useState(marker.depth.toString());
  return (
    <Box className={styles.markerContainer}>
      <Box className={styles.checkBoxContainer}>
        <TSCCheckbox />
      </Box>
      <TSCColorPicker
        color={marker.color}
        onColorChange={(evt) => {
          actions.editCrossPlotMarker(marker, { color: evt });
        }}
        className={styles.colorPicker}
      />
      <Box className={styles.markerOptions}>
        <Box className={styles.topMarkerRow}>
          <TextField
            select
            size="small"
            label="Type"
            value={marker.type}
            onChange={(e) => {
              if (!isMarkerType(e.target.value)) return;
              actions.editCrossPlotMarker(marker, { type: e.target.value });
            }}>
            {markerTypes.map((markerType) => (
              <MenuItem key={markerType} value={markerType}>
                {markerType}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            label="Age"
            value={age}
            type="number"
            error={isNaN(parseFloat(age))}
            onBlur={(e) => {
              if (isNaN(parseFloat(e.target.value))) {
                return;
              }
              actions.editCrossPlotMarker(marker, { age: parseFloat(e.target.value) });
            }}
            onChange={(evt) => {
              setAge(evt.target.value);
            }}
          />
          <TextField
            size="small"
            label="Depth"
            type="number"
            value={depth}
            error={isNaN(parseFloat(depth))}
            onBlur={(e) => {
              if (isNaN(parseFloat(e.target.value))) {
                return;
              }
              actions.editCrossPlotMarker(marker, { depth: parseFloat(e.target.value) });
            }}
            onChange={(evt) => {
              setDepth(evt.target.value);
            }}
          />
        </Box>
        <TextField
          size="small"
          label="Comment"
          fullWidth
          value={marker.comment}
          onChange={(evt) => {
            actions.editCrossPlotMarker(marker, { comment: evt.target.value });
          }}
        />
      </Box>
    </Box>
  );
});

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
    component: <Markers />
  },
  {
    tabName: "Models",
    Icon: Timeline,
    component: <Models />
  }
];
