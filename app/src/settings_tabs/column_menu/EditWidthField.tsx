import { observer } from "mobx-react-lite";
import React, { useContext } from "react";
import { context } from "../../state";
import { TextFieldProps, Typography, TextField } from "@mui/material";
import "./EditWidthField.css";
import { NumericFormat } from "react-number-format";
import { RenderColumnInfo } from "../../types";

const WidthTextField = ({ ...props }: TextFieldProps) => (
  <TextField {...props} hiddenLabel variant="outlined" className="edit-width-text-field" />
);

export const EditWidthField: React.FC<{
  column: RenderColumnInfo;
}> = observer(({ column }) => {
  const { actions } = useContext(context);
  return (
    <div>
      <Typography id="edit-width-text">Edit Width</Typography>
      <NumericFormat
        value={column.width || ""}
        customInput={WidthTextField}
        onValueChange={(values) => {
          const floatValue = values.floatValue;
          actions.setWidth(floatValue ?? NaN, column);
        }}
      />
    </div>
  );
});
