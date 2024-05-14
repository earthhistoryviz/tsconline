import { Box, Button, FormControlLabel, Modal, TextField, TextFieldProps, Typography } from "@mui/material";
import { ColumnInfo, assertPointSettings } from "@tsconline/shared";
import { observer } from "mobx-react-lite";
import { useContext, useState } from "react";
import { context } from "../state";
import "./PointSettingsPopup.css";
import { RGBModifier, TSCButton, TSCCheckbox } from "../components";
import { GenericTextField } from "../components";

type PointSettingsPopupProps = {
  column: ColumnInfo;
};

export const PointSettingsPopup: React.FC<PointSettingsPopupProps> = observer(({ column }) => {
  const { actions } = useContext(context);
  const [openMenu, setOpenMenu] = useState(false);
  if (column.columnDisplayType !== "Point") return;
  assertPointSettings(column.columnSpecificSettings);
  const pointSettings = column.columnSpecificSettings;
  return (
    <div>
      <Button onClick={() => setOpenMenu(true)} variant="contained">
        Point Settings
      </Button>
      <Modal open={openMenu} onClose={() => setOpenMenu(false)}>
        <Box id="PointSettingsPopupContainer">
          <Typography variant="h6" className="point-settings-header">
            Point Settings
          </Typography>
          <GenericTextField
            header="Range"
            key="range"
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
          <div className="point-settings-adjustment-buttons">
            <TSCButton>Auto</TSCButton>
            <TSCButton>Flip</TSCButton>
          </div>
          <GenericTextField
            header="Scale"
            key="scale"
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
          <div className="point-settings-adjustment-buttons">
            <FormControlLabel
              name="drawScale"
              label="Draw Scale"
              control={
                <TSCCheckbox
                  checked={pointSettings.drawScale}
                  onChange={(value) =>
                    actions.setPointColumnSettings(pointSettings, { drawScale: value.target.checked })
                  }
                />
              }
            />
            <FormControlLabel
              name="flipScale"
              label="Flipped"
              control={
                <TSCCheckbox
                  checked={pointSettings.flipScale}
                  onChange={(value) =>
                    actions.setPointColumnSettings(pointSettings, { flipScale: value.target.checked })
                  }
                />
              }
            />
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
          </div>
          <div className="point-settings-adjustment-buttons">
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
        </Box>
      </Modal>
    </div>
  );
});
