import { Box, IconButton, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { assertPointSettings, isPointShape } from "@tsconline/shared";
import { observer } from "mobx-react-lite";
import { useContext } from "react";
import { context } from "../../state";
import "./PointSettingsPopup.css";
import {
  CustomDivider,
  CustomTooltip,
  RGBModifier,
  CustomFormControlLabel,
  StyledScrollbar,
  TSCCheckbox
} from "../../components";
import { GenericTextField } from "../../components";
import { useTranslation } from "react-i18next";
import { RenderColumnInfo } from "../../types";

type PointSettingsPopupProps = {
  column: RenderColumnInfo;
};

export const PointSettingsDisplay: React.FC<PointSettingsPopupProps> = observer(({ column }) => {
  const { actions } = useContext(context);
  const { t } = useTranslation();
  if (column.columnDisplayType !== "Point") return;
  assertPointSettings(column.columnSpecificSettings);
  const pointSettings = column.columnSpecificSettings;
  return (
    <>
      <div className="point-header-subsection">
        <Typography variant="h6" className="advanced-settings-header">
          {t("settings.column.curve-drawing-menu.title")}
        </Typography>
        <CustomDivider className="settings-header-divider" />
      </div>
      <div className="point-settings-content-container">
        <StyledScrollbar>
          <div className="point-settings-content">
            <div className="point-range-and-toggle-container">
              <div className="point-range-settings-container">
                <div className="point-range-settings-header-container">
                  <Typography className="point-range-settings-header">
                    {t("settings.column.curve-drawing-menu.rod")}
                  </Typography>
                  <div>
                    <CustomTooltip title={t("settings.column.tooltip.auto-scale")} placement="top" arrow>
                      <IconButton onClick={() => actions.setAutoScale(pointSettings)}>
                        <span className="auto-button-icon" />
                      </IconButton>
                    </CustomTooltip>
                    <CustomTooltip title={t("settings.column.tooltip.flip")} placement="top" arrow>
                      <IconButton onClick={() => actions.flipRange(pointSettings)}>
                        <span className="flip-button-icon" />
                      </IconButton>
                    </CustomTooltip>
                  </div>
                </div>
                <CustomDivider className="point-range-settings-divider" />
                <GenericTextField
                  key="range"
                  orientation="start"
                  helperOrientation="start"
                  helperPosition="bottom"
                  inputs={[
                    {
                      helperText: t("settings.column.curve-drawing-menu.lower-range"),
                      id: "lowerRange",
                      value: pointSettings.lowerRange,
                      onValueChange: (value) => {
                        actions.setPointColumnSettings(pointSettings, { lowerRange: value });
                      }
                    },
                    {
                      helperText: t("settings.column.curve-drawing-menu.upper-range"),
                      id: "upperRange",
                      value: pointSettings.upperRange,
                      onValueChange: (value) => {
                        actions.setPointColumnSettings(pointSettings, { upperRange: value });
                      }
                    },
                    {
                      helperText: t("settings.column.curve-drawing-menu.scale-start"),
                      id: "scaleStart",
                      value: pointSettings.scaleStart,
                      onValueChange: (value) => {
                        actions.setPointColumnSettings(pointSettings, { scaleStart: value });
                      }
                    },
                    {
                      helperText: t("settings.column.curve-drawing-menu.scale-step"),
                      value: pointSettings.scaleStep,
                      id: "scaleStep",
                      onValueChange: (value) => {
                        actions.setPointColumnSettings(pointSettings, { scaleStep: value });
                      }
                    }
                  ]}
                />
              </div>
              <div className="draw-buttons-and-point-shape-container">
                <CustomFormControlLabel
                  name="drawScale"
                  label={t("settings.column.curve-drawing-menu.show-scale")}
                  control={
                    <TSCCheckbox
                      checked={pointSettings.drawScale}
                      size="small"
                      onChange={(value) =>
                        actions.setPointColumnSettings(pointSettings, { drawScale: value.target.checked })
                      }
                    />
                  }
                />
                <section className="point-shape-and-toggle-container">
                  <CustomFormControlLabel
                    name="drawPoints"
                    label={t("settings.column.curve-drawing-menu.draw-points")}
                    className="point-shape-checkbox"
                    control={
                      <TSCCheckbox
                        checked={pointSettings.pointShape !== "nopoints"}
                        onChange={(event) =>
                          actions.setPointColumnSettings(pointSettings, {
                            pointShape: event.target.checked ? "rect" : "nopoints"
                          })
                        }
                      />
                    }
                  />
                  <div className="point-shape-toggle-group">
                    <Typography fontSize="0.8rem" mb="5px" textAlign="center">
                      {t("settings.column.curve-drawing-menu.point-shape")}
                    </Typography>
                    <ToggleButtonGroup
                      exclusive
                      value={pointSettings.pointShape}
                      onChange={(_e, val) => {
                        if (!isPointShape(val)) return;
                        actions.setPointColumnSettings(pointSettings, { pointShape: val });
                      }}>
                      <ToggleButton disabled={pointSettings.pointShape === "nopoints"} disableRipple value="rect">
                        <span className="rectangle-icon" />
                      </ToggleButton>
                      <ToggleButton disableRipple disabled={pointSettings.pointShape === "nopoints"} value="circle">
                        <span className="circle-icon" />
                      </ToggleButton>
                      <ToggleButton disableRipple disabled={pointSettings.pointShape === "nopoints"} value="cross">
                        <span className="cross-icon" />
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </div>
                </section>
              </div>
            </div>
            <div className="point-adjustment-rgb-modifier">
              <Box display="flex" flexDirection="column" gap="20px">
                <RGBModifier
                  label={t("settings.column.curve-drawing-menu.line")}
                  checked={pointSettings.drawLine}
                  onCheckedChange={(value) => actions.setPointColumnSettings(pointSettings, { drawLine: value })}
                  rgbInputs={[
                    {
                      rgb: pointSettings.lineColor,
                      onRGBChange: (value) => actions.setPointColumnSettings(pointSettings, { lineColor: value })
                    }
                  ]}
                />
                <RGBModifier
                  label={t("settings.column.curve-drawing-menu.fill")}
                  checked={pointSettings.drawFill}
                  onCheckedChange={(value) => actions.setPointColumnSettings(pointSettings, { drawFill: value })}
                  rgbInputs={[
                    {
                      rgb: pointSettings.fill,
                      onRGBChange: (value) => actions.setPointColumnSettings(pointSettings, { fill: value })
                    }
                  ]}
                />
              </Box>
              <Box display="flex" flexDirection="column">
                <div className="point-settings-gradient-buttons">
                  <RGBModifier
                    label={t("settings.column.curve-drawing-menu.background-gradient")}
                    checked={pointSettings.drawBackgroundGradient}
                    onCheckedChange={(value) =>
                      actions.setPointColumnSettings(pointSettings, { drawBackgroundGradient: value })
                    }
                    rgbInputs={[
                      {
                        rgb: pointSettings.backgroundGradientStart,
                        onRGBChange: (value) =>
                          actions.setPointColumnSettings(pointSettings, { backgroundGradientStart: value }),
                        label: "Start"
                      },
                      {
                        rgb: pointSettings.backgroundGradientEnd,
                        onRGBChange: (value) =>
                          actions.setPointColumnSettings(pointSettings, { backgroundGradientEnd: value }),
                        label: "End"
                      }
                    ]}
                  />
                </div>
                <div className="point-settings-gradient-buttons">
                  <RGBModifier
                    label={t("settings.column.curve-drawing-menu.curve-gradient")}
                    checked={pointSettings.drawCurveGradient}
                    onCheckedChange={(value) =>
                      actions.setPointColumnSettings(pointSettings, { drawCurveGradient: value })
                    }
                    rgbInputs={[
                      {
                        rgb: pointSettings.curveGradientStart,
                        onRGBChange: (value) =>
                          actions.setPointColumnSettings(pointSettings, { curveGradientStart: value }),
                        label: t("settings.column.curve-drawing-menu.start")
                      },
                      {
                        rgb: pointSettings.curveGradientEnd,
                        onRGBChange: (value) =>
                          actions.setPointColumnSettings(pointSettings, { curveGradientEnd: value }),
                        label: t("settings.column.curve-drawing-menu.end")
                      }
                    ]}
                  />
                </div>
              </Box>
            </div>
          </div>
        </StyledScrollbar>
      </div>
    </>
  );
});
