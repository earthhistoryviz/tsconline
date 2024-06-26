import { TextField, Box, Typography } from "@mui/material";
import { NumericFormat } from "react-number-format";
import "./TSCGenericSettings.css";
import { RGB } from "@tsconline/shared";
import { TSCCheckbox } from "./TSCCheckbox";
import TSCColorPicker from "./TSCColorPicker";
import { convertHexToRGB } from "../util/util";
import { HTMLAttributes } from "react";
import { CustomFormControlLabel } from "./TSCComponents";

const defaultWidth = 100;
const defaultHeight = 40;
type GenericTextFieldProps = {
  header?: string;
  className?: string;
  width?: number;
  height?: number;
  inputs: {
    helperText?: string;
    label?: string;
    id: string;
    value: number;
    onValueChange: (value: number) => void;
  }[];
  orientation?: "start" | "center" | "end";
  helperOrientation?: "start" | "center" | "end";
  helperPosition?: "top" | "bottom";
} & HTMLAttributes<HTMLDivElement>;

export const GenericTextField: React.FC<GenericTextFieldProps> = ({
  className,
  width = defaultWidth,
  height = defaultHeight,
  header,
  orientation = "center",
  helperOrientation = "center",
  inputs,
  helperPosition = "top"
}) => {
  width = Math.max(width, defaultWidth);
  height = Math.max(height, defaultHeight);
  const InputStyle = { width: `${width}px`, height: `${height}px` };
  // adjust interior input for padding
  const inputStyle = { width: `${width - 28}px`, height: `${height - 33}px` };
  const containerAlignmentClass =
    orientation === "start"
      ? "generic-text-field-container-start"
      : orientation === "end"
        ? "generic-text-field-container-end"
        : "";
  const helperAlignmentClass =
    helperOrientation === "start"
      ? "generic-text-field-helper-text-start"
      : helperOrientation === "end"
        ? "generic-text-field-helper-text-end"
        : "";
  return (
    <Box className={`generic-text-field-container ${containerAlignmentClass} ${className}`}>
      {header && <Typography className={`generic-text-field-header`}>{header}</Typography>}
      <div className="generic-text-fields">
        {inputs.map((input) => (
          <div className="generic-text-form" key={input.id}>
            {helperPosition === "top" && (
              <Typography className={`generic-text-field-helper-text ${helperAlignmentClass}`}>
                {input.helperText}
              </Typography>
            )}
            <NumericFormat
              value={input.value}
              customInput={TextField}
              className={`generic-text-field`}
              label={input.label}
              InputProps={{ style: InputStyle }}
              inputProps={{ style: inputStyle }}
              placeholder={`${input.helperText || "Enter value"}`}
              onValueChange={(values) => {
                const floatValue = values.floatValue;
                if (floatValue === undefined || floatValue === null || isNaN(floatValue)) {
                  return;
                }
                input.onValueChange(floatValue);
              }}
            />
            {helperPosition === "bottom" && (
              <Typography className={`generic-text-field-helper-text ${helperAlignmentClass}`}>
                {input.helperText}
              </Typography>
            )}
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
    <div className="rgb-modifier-container">
      <CustomFormControlLabel
        width={120}
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
    </div>
  );
};
