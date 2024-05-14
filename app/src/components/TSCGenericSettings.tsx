import { TextFieldProps, TextField, Box, Typography } from "@mui/material";
import { observer } from "mobx-react-lite";
import { NumericFormat } from "react-number-format";
import "./TSCGenericSettings.css";

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