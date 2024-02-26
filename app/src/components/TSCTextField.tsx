import { TextFieldProps, FormControl, TextField } from "@mui/material";
import "./TSCTextField.css";

export const TSCTextField = ({ ...props }: TextFieldProps) => {
  return (
    <FormControl className="white-outlined-form">
      <TextField {...props} variant="outlined" />
    </FormControl>
  );
};
