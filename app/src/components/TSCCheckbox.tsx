import { Checkbox, CheckboxProps } from '@mui/material'
import { useTheme, styled } from "@mui/material/styles";

interface TSCCheckboxProps extends CheckboxProps {
  checked?: boolean,
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
}


export const TSCCheckbox: React.FC<TSCCheckboxProps> = (props: TSCCheckboxProps) => {
  const theme = useTheme();

  return (
    <Checkbox
        {...props}
        checked={props.checked}
        onChange={props.onChange}
        size="small"
        sx={{
            color: theme.palette.primary.main,
            '&.Mui-checked': {
                color: theme.palette.selection.main,
            },
        }}
    />
  )
};