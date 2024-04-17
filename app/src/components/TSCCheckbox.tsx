import { Checkbox, CheckboxProps } from "@mui/material";
import { useTheme } from "@mui/material/styles";

interface TSCCheckboxProps extends CheckboxProps {
  outlineColor?: string;
  checkedColor?: string;
  checked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const TSCCheckbox: React.FC<TSCCheckboxProps> = ({ outlineColor, checkedColor, checked, onChange, ...props}) => {
  const theme = useTheme();
  outlineColor = outlineColor || theme.palette.primary.main;
  checkedColor = checkedColor || theme.palette.selection.main;
  return (
    <Checkbox
      {...props}
      checked={checked}
      onChange={onChange}
      size="small"
      sx={{
        color: outlineColor,
        "&.Mui-checked": {
          color: checkedColor
        }
      }}
    />
  );
};
