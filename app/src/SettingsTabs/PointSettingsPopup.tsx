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
                onChange={(value) => actions.setPointColumnSettings(pointSettings, { drawScale: value.target.checked })}
              />
            }
          />
          <FormControlLabel
            name="flipScale"
            label="Flipped"
            control={
              <TSCCheckbox
                checked={pointSettings.flipScale}
                onChange={(value) => actions.setPointColumnSettings(pointSettings, { flipScale: value.target.checked })}
              />
            }
          />
          </div>
          <RGBModifier label="Line" checked={pointSettings.drawLine} rgb={pointSettings.lineColor} onCheckedChange={(value) => actions.setPointColumnSettings(pointSettings, { drawLine: value })} onRGBChange={(value) => actions.setPointColumnSettings(pointSettings, { lineColor: value })} />
        </Box>
      </Modal>
    </div>
  );
});
