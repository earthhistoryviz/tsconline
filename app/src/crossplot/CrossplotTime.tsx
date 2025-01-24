import { observer } from "mobx-react-lite";
import { CrossPlotTimeSettings } from "../types";
import { Box, Button, MenuItem, Select, TextField, Typography } from "@mui/material";
import { context } from "../state";
import { useContext } from "react";
import { useTranslation } from "react-i18next";
import styles from "./CrossPlotTime.module.css";
import { CustomDivider } from "../components";
import { ColumnInfo } from "@tsconline/shared";

type CrossPlotTimeSelectorProps = {
  unit: string | undefined;
  settings: CrossPlotTimeSettings;
  setTimeSettings: (crossPlotSettings: Partial<CrossPlotTimeSettings>) => void;
};
export const CrossPlotTimeSelector = observer(function CrossPlotTime({
  unit,
  settings,
  setTimeSettings
}: CrossPlotTimeSelectorProps) {
  const { t } = useTranslation();
  const checkAgeRange = () => settings && settings.topStageAge > settings.baseStageAge;
  const pleaseSelectAUnit = "Please select a unit";
  return (
    <Box display="flex" gap="30px" flexDirection="column" width="100%" textAlign="center">
      <Box>
        <Typography className="IntervalLabel">{t("settings.time.interval.top")}</Typography>
        <CustomDivider className="time-form-divider" />
        <TextField
          size="small"
          className="UnitTextField"
          disabled={!unit}
          label={`${unit || pleaseSelectAUnit}`}
          type="number"
          value={unit ? settings.topStageAge : ""}
          onChange={(event) => {
            if (!settings || !unit) return;
            setTimeSettings({ topStageAge: parseFloat(event.target.value) });
          }}
          error={checkAgeRange()}
          helperText={checkAgeRange() ? t("settings.time.interval.helper-text") : ""}
          FormHelperTextProps={{ style: { fontSize: "13px" } }}
        />
      </Box>
      <Box>
        <Typography className="IntervalLabel">{t("settings.time.interval.base")}</Typography>
        <CustomDivider className="time-form-divider" />
        <TextField
          size="small"
          className="UnitTextField"
          label={`${unit || pleaseSelectAUnit}`}
          type="number"
          disabled={!unit}
          value={unit ? settings.baseStageAge : ""}
          onChange={(event) => {
            if (!settings || !unit) return;
            setTimeSettings({ baseStageAge: parseFloat(event.target.value) });
          }}
          error={checkAgeRange()}
          helperText={checkAgeRange() ? t("settings.time.interval.helper-text") : ""}
          FormHelperTextProps={{ style: { fontSize: "13px" } }}
        />
      </Box>
      <Box>
        <Typography className="IntervalLabel">{t("settings.time.interval.vertical-scale-header")}</Typography>
        <CustomDivider className="time-form-divider" />
        <TextField
          className="VerticalScale"
          label={`${unit ? t("settings.time.interval.vertical-scale") + unit + "):" : pleaseSelectAUnit}`}
          type="number"
          size="small"
          disabled={!unit}
          value={unit ? settings.unitsPerMY : ""}
          onChange={(event) => {
            if (!settings || !unit) return;
            setTimeSettings({ unitsPerMY: parseFloat(event.target.value) });
          }}
        />
      </Box>
    </Box>
  );
});

type CrossPlotTimeProps = {
  settings: CrossPlotTimeSettings;
  column: ColumnInfo | undefined;
  setTimeSettings: (crossPlotSettings: Partial<CrossPlotTimeSettings>) => void;
  setCrossPlotChart: (crossPlotSettings: ColumnInfo | undefined) => void;
};

export const CrossPlotTime: React.FC<CrossPlotTimeProps> = observer(function CrossPlotTime({
  settings,
  setTimeSettings,
  setCrossPlotChart,
  column
}: CrossPlotTimeProps) {
  const { state } = useContext(context);
  return (
    <Box className={styles.timeSettingsContainer} sx={{ backgroundColor: "secondaryBackground.main" }}>
      <Select
        value={column?.units || 0}
        onChange={(evt) => {
          const col = state.settingsTabs.columns?.children.find((col) => col.units === evt.target.value);
          if (!col) return;
          setCrossPlotChart(col);
        }}>
        {state.settingsTabs.columns &&
          Object.entries(state.settingsTabs.columns.children).map(([index, column]) => (
            <MenuItem key={index} value={column.units}>
              {`${column.name} (${column.units})`}
            </MenuItem>
          ))}
        <MenuItem value={0}>
          <em>None</em>
        </MenuItem>
      </Select>
      <CrossPlotTimeSelector unit={column?.units} settings={settings} setTimeSettings={setTimeSettings} />
      <Button
        onClick={() => {
          setCrossPlotChart(undefined);
        }}>
        Clear
      </Button>
    </Box>
  );
});
