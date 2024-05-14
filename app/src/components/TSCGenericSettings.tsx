import { TextFieldProps, TextField, Box, Typography, FormControlLabel } from "@mui/material";
import { NumericFormat } from "react-number-format";
import "./TSCGenericSettings.css";
import { RGB } from "@tsconline/shared";
import { TSCCheckbox } from "./TSCCheckbox";
import TSCColorPicker from "./TSCColorPicker";
import { convertHexToRGB } from "../util/util";

type GenericTextFieldProps = {
  header: string;
  inputs: {
    helperText: string;
    value: number;
    onValueChange: (value: number) => void;
  }[];
};

const InputTextField = ({ ...props }: TextFieldProps) => <TextField {...props} className="generic-text-field" />;

export const GenericTextField: React.FC<GenericTextFieldProps> = ({ header, inputs }) => {
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
};

type RGBModifierProps = {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  rgbInputs: {
    rgb: RGB;
    onRGBChange: (rgb: RGB) => void;
    label?: string;
  }[];
};

export const RGBModifier: React.FC<RGBModifierProps> = ({ label, checked, rgbInputs, onCheckedChange }) => {
  return (
    <>
      <FormControlLabel
        label={label}
        control={<TSCCheckbox checked={checked} onChange={(value) => onCheckedChange(value.target.checked)} />}
      />
      <div className="color-picker-rgb-modifier-container">
        {rgbInputs.map((rgbInput, index) => (
          <div key={index} className="color-picker-rgb-modifier">
            <div className={rgbInput.label ? "generic-color-picker" : ""}>
              <TSCColorPicker
                color={`rgb(${rgbInput.rgb.r}, ${rgbInput.rgb.g}, ${rgbInput.rgb.b})`}
                onColorChange={(color) => {
                  rgbInput.onRGBChange(convertHexToRGB(color, false));
                }}
                portal
              />
            </div>
            <Typography fontSize={12}>{rgbInput.label}</Typography>
          </div>
        ))}
      </div>
    </>
  );
};
