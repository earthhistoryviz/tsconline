import { Box, Button, FormControlLabel, Modal, TextField, TextFieldProps, Typography } from "@mui/material";
import { ColumnInfo, PointSettings, assertPointSettings } from "@tsconline/shared";
import { observer } from "mobx-react-lite";
import { useContext, useState } from "react";
import { context } from "../state";
import { NumericFormat } from "react-number-format";
import "./PointSettingsPopup.css";
import { TSCButton, TSCCheckbox } from "../components";

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
        </Box>
      </Modal>
    </div>
  );
});

type GenericTextFieldProps = {
  header: string;
  inputs: {
    helperText: string;
    value: number;
    onValueChange: (value: number) => void;
  }[];
};

const GenericTextField: React.FC<GenericTextFieldProps> = observer(({ header, inputs }) => {
  const InputTextField = ({ ...props }: TextFieldProps) => <TextField {...props} className="generic-text-field" />;

  return (
    <Box className="generic-text-field-container">
      <Typography className="generic-text-field-header">{header}</Typography>
      <div className="generic-text-fields">
        {inputs.map((input, index) => (
          <NumericFormat
            key={index}
            helperText={input.helperText}
            value={input.value}
            customInput={InputTextField}
            onValueChange={(values) => {
              const floatValue = values.floatValue;
              if (!floatValue) {
                return;
              }
              input.onValueChange(floatValue);
            }}
          />
        ))}
      </div>
    </Box>
  );
});
