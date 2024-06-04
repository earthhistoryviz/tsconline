import { TextFieldProps, TextField, Box, Typography, FormControlLabel } from "@mui/material";
import { NumericFormat } from "react-number-format";
import "./TSCGenericSettings.css";
import { RGB } from "@tsconline/shared";
import { TSCCheckbox } from "./TSCCheckbox";
import TSCColorPicker from "./TSCColorPicker";
import { convertHexToRGB } from "../util/util";

const defaultWidth = 100;
const defaultHeight = 40;
type GenericTextFieldProps = {
  header?: string;
  className?: string;
  width?: number;
  height?: number;
  inputs: {
    helperText: string;
    value: number;
    onValueChange: (value: number) => void;
  }[];
};

export const GenericTextField: React.FC<GenericTextFieldProps> = ({
  className,
  width = defaultWidth,
  height = defaultHeight,
  header,
  inputs
}) => {
  width = Math.max(width, defaultWidth);
  height = Math.max(height, defaultHeight);
  const InputStyle = { width: `${width}px`, height: `${height}px` };
  // adjust interior input for padding
  const inputStyle = { width: `${width - 28}px`, height: `${height - 33}px` };
  return (
    <Box className={`generic-text-field-container ${className}`}>
      {header && <Typography className="generic-text-field-header">{header}</Typography>}
      <div className="generic-text-fields">
        {inputs.map((input, index) => (
          <div className="generic-text-form">
            <Typography className="generic-text-field-helper-text">{input.helperText}</Typography>
            <NumericFormat
              key={index}
              value={input.value}
              customInput={TextField}
              className={`generic-text-field`}
              InputProps={{ style: InputStyle }}
              inputProps={{ style: inputStyle }}
              placeholder="Enter Size"
              onValueChange={(values) => {
                const floatValue = values.floatValue;
                if (!floatValue) {
                  return;
                }
                input.onValueChange(floatValue);
              }}
            />
          </div>
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
