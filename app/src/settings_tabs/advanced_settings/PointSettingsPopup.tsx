import { Box, Button, FormControlLabel, IconButton, Modal, Tooltip, Typography } from "@mui/material";
import { ColumnInfo, assertPointSettings, isPointShape } from "@tsconline/shared";
import { observer } from "mobx-react-lite";
import { useContext, useState } from "react";
import { context } from "../../state";
import "./PointSettingsPopup.css";
import {
  CustomDivider,
  CustomTooltip,
  RGBModifier,
  CustomFormControlLabel,
  StyledScrollbar,
  TSCButton,
  TSCCheckbox
} from "../../components";
import { GenericTextField } from "../../components";
import { TSCRadioGroup } from "../../components/TSCRadioGroup";
import Rect from "../../assets/settings_icons/rect.gif";
import Circle from "../../assets/settings_icons/round.gif";
import Tick from "../../assets/settings_icons/tick.gif";
import AutoFixNormalIcon from "@mui/icons-material/AutoFixNormal";
import FlipCameraAndroidIcon from "@mui/icons-material/FlipCameraAndroid";

type PointSettingsPopupProps = {
  column: ColumnInfo;
};

export const PointSettingsDisplay: React.FC<PointSettingsPopupProps> = observer(({ column }) => {
  const { actions } = useContext(context);
  if (column.columnDisplayType !== "Point") return;
  assertPointSettings(column.columnSpecificSettings);
  const pointSettings = column.columnSpecificSettings;
  return (
    <>
      <div className="point-header-subsection">
        <Typography variant="h6" className="advanced-settings-header">
          Point Settings
        </Typography>
        <CustomDivider className="settings-header-divider" />
      </div>
      <div className="point-settings-content-container">
        <StyledScrollbar>
          <div className="point-settings-content">
            <div>
              <div className="point-range-settings-container">
                <div className="point-range-settings-header-container">
                  <Typography className="point-range-settings-header">Range</Typography>
                  <div>
                    <CustomTooltip title="Auto Scale" placement="top" arrow>
                      <IconButton onClick={() => actions.setAutoScale(pointSettings)}>
                        <span className="auto-button-icon" />
                      </IconButton>
                    </CustomTooltip>
                    <CustomTooltip title="Flip Range" placement="top" arrow>
                      <IconButton onClick={() => actions.flipRange(pointSettings)}>
                        <span className="flip-button-icon" />
                      </IconButton>
                    </CustomTooltip>
                  </div>
                </div>
                <GenericTextField
                  key="range"
                  orientation="start"
                  helperOrientation="start"
                  helperPosition="bottom"
                  inputs={[
                    {
                      helperText: "Lower Range",
                      value: pointSettings.lowerRange,
                      onValueChange: (value) => {
                        actions.setPointColumnSettings(pointSettings, { lowerRange: value });
                      }
                    },
                    {
                      helperText: "Upper Range",
                      value: pointSettings.upperRange,
                      onValueChange: (value) => {
                        actions.setPointColumnSettings(pointSettings, { upperRange: value });
                      }
                    }
                  ]}
                />
              </div>
              <GenericTextField
                header="Scale"
                key="scale"
                orientation="start"
                helperOrientation="start"
                helperPosition="bottom"
                className="point-scale-settings"
                inputs={[
                  {
                    helperText: "Start",
                    value: pointSettings.scaleStart,
                    onValueChange: (value) => {
                      actions.setPointColumnSettings(pointSettings, { scaleStart: value });
                    }
                  },
                  {
                    helperText: "Step",
                    value: pointSettings.scaleStep,
                    onValueChange: (value) => {
                      actions.setPointColumnSettings(pointSettings, { scaleStep: value });
                    }
                  }
                ]}
              />
            </div>
            <div className="draw-buttons-and-point-shape-container">
              <div className="point-settings-adjustment-buttons draw-point-scale-checkboxes">
                <CustomFormControlLabel
                  name="drawScale"
                  label="Draw Scale"
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
                <CustomFormControlLabel
                  name="drawPoints"
                  label="Draw Points"
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
              </div>
              <div className="point-shape-radio-group">
                <TSCRadioGroup
                  name="Point Type"
                  value={pointSettings.pointShape}
                  onChange={(event) => {
                    if (isPointShape(event.target.value)) {
                      actions.setPointColumnSettings(pointSettings, { pointShape: event.target.value });
                    }
                  }}
                  disabled={pointSettings.pointShape === "nopoints"}
                  radioArray={[
                    { value: "rect", imageSrc: Rect },
                    { value: "circle", imageSrc: Circle },
                    { value: "cross", imageSrc: Tick }
                  ]}
                  direction="vertical"
                />
              </div>
            </div>
          <div className="point-settings-adjustment-buttons">
            <RGBModifier
              label="Line"
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
              label="Fill"
              checked={pointSettings.drawFill}
              onCheckedChange={(value) => actions.setPointColumnSettings(pointSettings, { drawFill: value })}
              rgbInputs={[
                {
                  rgb: pointSettings.fill,
                  onRGBChange: (value) => actions.setPointColumnSettings(pointSettings, { fill: value })
                }
              ]}
            />
          <div className="point-settings-gradient-buttons">
            <RGBModifier
              label="Background Gradient"
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
              label="Curve Gradient"
              checked={pointSettings.drawCurveGradient}
              onCheckedChange={(value) => actions.setPointColumnSettings(pointSettings, { drawCurveGradient: value })}
              rgbInputs={[
                {
                  rgb: pointSettings.curveGradientStart,
                  onRGBChange: (value) => actions.setPointColumnSettings(pointSettings, { curveGradientStart: value }),
                  label: "Start"
                },
                {
                  rgb: pointSettings.curveGradientEnd,
                  onRGBChange: (value) => actions.setPointColumnSettings(pointSettings, { curveGradientEnd: value }),
                  label: "End"
                }
              ]}
            />
          </div>
          </div>
          </div>
        </StyledScrollbar>
      </div>
    </>
  );
});
