import { Box, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { observer } from "mobx-react-lite";
import { FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import { CustomDivider } from "../components";
import { useContext, useState } from "react";
import { context } from "../state/index";
import "./Time.css";
import { useTranslation } from "react-i18next";
import { toJS } from "mobx";
import { TSCButton } from "../components";
import { useNavigate, useLocation } from "react-router-dom";

export const Time = observer(function Time() {
  const { state, actions } = useContext(context);
  const [units, setUnits] = useState<string>(Object.keys(state.settings.timeSettings)[0]);

  if (units === null || units === undefined) {
    throw new Error("There must be a unit used in the config");
  }
  const disabled = units.toLowerCase() !== "ma";

  function checkAgeRange() {
    return state.settings.timeSettings[units].topStageAge > state.settings.timeSettings[units].baseStageAge;
  }
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  return (
    <div>
      <ToggleButtonGroup
        value={units}
        exclusive
        onChange={(_event: React.MouseEvent<HTMLElement>, value: string) => {
          if (value === null) {
            return;
          }
          setUnits(value);
        }}
        className="ToggleButtonGroup"
        aria-label="Units">
        {Object.keys(state.settings.timeSettings).map((unit) => (
          <ToggleButton key={unit} value={unit} disableRipple>
            {unit}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      <Box className="time-settings-container" bgcolor="secondaryBackground.main">
        <Box className="time-settings-age-container">
          <Typography className="IntervalLabel">{t("settings.time.interval.top")}</Typography>
          <CustomDivider className="time-form-divider" />
          <FormControl className="FormControlIntervals" size="small" error={checkAgeRange()}>
            <InputLabel>
              {disabled ? t("settings.time.interval.not-avaliable") : t("settings.time.interval.top-name")}
            </InputLabel>
            <Select
              className="SelectTop"
              inputProps={{ id: "top-age-selector" }}
              name="top-age-stage-name"
              MenuProps={{ sx: { maxHeight: "400px" } }}
              label="Top Age/Stage Name"
              disabled={disabled}
              value={state.settings.timeSettings[units].topStageKey}
              onChange={(event) => {
                const age = state.geologicalTopStageAges.find((item) => item.key === event.target.value);
                if (!age) return;
                actions.setTopStageAge(age.value, units);
              }}>
              {state.geologicalTopStageAges.map((item) => (
                <MenuItem key={item.key} value={item.key}>
                  {item.key} ({item.value} Ma)
                </MenuItem>
              ))}
            </Select>
            <TextField
              size="small"
              className="UnitTextField"
              label={`${units}`}
              type="number"
              name="vertical-scale-text-field"
              value={
                isNaN(state.settings.timeSettings[units].topStageAge)
                  ? ""
                  : state.settings.timeSettings[units].topStageAge
              }
              onChange={(event) => {
                actions.setTopStageAge(parseFloat(event.target.value), units);
              }}
              error={checkAgeRange()}
              helperText={checkAgeRange() ? t("settings.time.interval.helper-text") : ""}
              FormHelperTextProps={{ style: { fontSize: "13px" } }}
            />
          </FormControl>
        </Box>
        <Box className="time-settings-age-container">
          <Typography className="IntervalLabel">{t("settings.time.interval.base")}</Typography>
          <CustomDivider className="time-form-divider" />
          <FormControl className="FormControlIntervals" size="small" error={checkAgeRange()}>
            <InputLabel htmlFor="base-age-selector">
              {disabled ? t("settings.time.interval.not-avaliable") : t("settings.time.interval.base-name")}
            </InputLabel>
            <Select
              className="SelectBase"
              inputProps={{ id: "base-age-selector" }}
              disabled={disabled}
              name="base-age-stage-name"
              label="Base Age/Stage Name"
              value={state.settings.timeSettings[units].baseStageKey}
              MenuProps={{ sx: { maxHeight: "400px" } }}
              onChange={(event) => {
                const age = state.geologicalBaseStageAges.find((item) => item.key === event.target.value);
                if (!age) return;
                actions.setBaseStageAge(age.value, units);
              }}>
              {state.geologicalBaseStageAges
                .filter((item) => item.value >= state.settings.timeSettings[units].topStageAge)
                .map((item) => (
                  <MenuItem key={item.key} value={item.key}>
                    {item.key} ({item.value} Ma)
                  </MenuItem>
                ))}
            </Select>
            <TextField
              size="small"
              className="UnitTextField"
              label={`${units}`}
              type="number"
              name="vertical-scale-text-field"
              value={
                isNaN(state.settings.timeSettings[units].baseStageAge)
                  ? ""
                  : state.settings.timeSettings[units].baseStageAge
              }
              onChange={(event) => {
                actions.setBaseStageAge(parseFloat(event.target.value), units);
              }}
              error={checkAgeRange()}
              helperText={checkAgeRange() ? t("settings.time.interval.helper-text") : ""}
              FormHelperTextProps={{ style: { fontSize: "13px" } }}
            />
          </FormControl>
          <TextField
            className="VerticalScale"
            label={`${t("settings.time.interval.vertical-scale")} ${units}):`}
            type="number"
            size="small"
            name="vertical-scale-text-field"
            value={state.settings.timeSettings[units].unitsPerMY}
            onChange={(event) => actions.setUnitsPerMY(parseFloat(event.target.value), units)}
          />
        </Box>
      </Box>
      <div className="generate-button-container">
        <TSCButton
          buttonType="gradient"
          className="generate-button"
          onClick={async () => {
            await actions.processDatapackConfig(toJS(state.unsavedDatapackConfig));
            actions.initiateChartGeneration(navigate, location.pathname);
          }}>
          {t("button.generate")}
        </TSCButton>
      </div>
    </div>
  );
});
