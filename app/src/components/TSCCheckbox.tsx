import { Checkbox, CheckboxProps } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { forwardRef } from "react";

interface TSCCheckboxProps extends CheckboxProps {
  outlineColor?: string;
  checkedColor?: string;
  checked?: boolean;
  className?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const TSCCheckbox = forwardRef<HTMLButtonElement, TSCCheckboxProps>(
  ({ outlineColor, checkedColor, checked, onChange, className, ...props }, ref) => {
    const theme = useTheme();
    outlineColor = outlineColor || theme.palette.outline.main;
    checkedColor = checkedColor || theme.palette.button.main;
    TSCCheckbox.displayName = "TSCCheckbox";
    return (
      <Checkbox
        {...props}
        ref={ref}
        checked={checked}
        onChange={onChange}
        size="small"
        className={className}
        sx={{
          color: outlineColor,
          "&.Mui-checked": {
            color: checkedColor
          }
        }}
      />
    );
  }
);
