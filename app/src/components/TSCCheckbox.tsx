import { Checkbox, CheckboxProps } from "@mui/material";
import { useTheme } from "@mui/material/styles";

interface TSCCheckboxProps extends CheckboxProps {
  outlineColor?: string;
  checkedColor?: string;
  checked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const TSCCheckbox: React.FC<TSCCheckboxProps> = (props: TSCCheckboxProps) => {
  const theme = useTheme();
  const outlineColor = props.outlineColor || theme.palette.primary.main;
  const checkedColor = props.checkedColor || theme.palette.selection.main;
  return (
    <Checkbox
      {...props}
      checked={props.checked}
      onChange={props.onChange}
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
