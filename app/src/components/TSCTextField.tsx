import { TextFieldProps, FormControl, TextField } from "@mui/material";
import "./TSCTextField.css";

type TSCTextFieldProps = {
  height?: string | number;
} & TextFieldProps;
export const TSCTextField: React.FC<TSCTextFieldProps> = ({
  height = 40,
  ...props
}) => {
  return (
    <FormControl className="white-outlined-form">
      <TextField
        {...props}
        inputProps={{
          ...props.inputProps,
          style: { height: height },
        }}
        InputProps={{
          ...props.InputProps,
          style: { height: height },
        }}
        variant="outlined"
      />
    </FormControl>
  );
};
