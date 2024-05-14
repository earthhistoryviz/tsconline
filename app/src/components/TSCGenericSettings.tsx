import { TextFieldProps, TextField, Box, Typography, FormControlLabel } from "@mui/material";
import { observer } from "mobx-react-lite";
import { NumericFormat } from "react-number-format";
import "./TSCGenericSettings.css";
import { RGB } from "@tsconline/shared";
import { TSCCheckbox } from "./TSCCheckbox";
import TSCColorPicker from "./TSCColorPicker";

type GenericTextFieldProps = {
  header: string;
  inputs: {
    helperText: string;
    value: number;
    onValueChange: (value: number) => void;
  }[];
};

export const GenericTextField: React.FC<GenericTextFieldProps> = observer(({ header, inputs }) => {
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

type RGBModifierProps = {
  label: string;
  checked: boolean;
  rgb: RGB;
  onCheckedChange: (checked: boolean) => void;
  onRGBChange: (rgb: RGB) => void;
};

export const RGBModifier: React.FC<RGBModifierProps> = observer(
  ({ label, checked, rgb, onRGBChange, onCheckedChange }) => {
    return (
      <>
        <FormControlLabel
          label={label}
          control={<TSCCheckbox checked={checked} onChange={(value) => onCheckedChange(value.target.checked)} />}
        />
        <TSCColorPicker
          color={`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`}
          onColorChange={(color) => {
            onRGBChange({
              r: parseInt(color.slice(1, 3), 16),
              g: parseInt(color.slice(3, 5), 16),
              b: parseInt(color.slice(5, 7), 16)
            });
          }}
          portal
        />
      </>
    );
  }
);
