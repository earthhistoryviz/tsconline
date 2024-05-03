import { observer } from "mobx-react-lite";
import React, { useContext } from "react";
import { context } from "../state";
import { TextFieldProps, Typography, TextField } from "@mui/material";
import "./EditWidthField.css";
import { NumericFormat } from "react-number-format";
import { ColumnInfo } from "@tsconline/shared";

const WidthTextField = ({ ...props }: TextFieldProps) => (
  <TextField {...props} hiddenLabel variant="filled" size="small" />
);

export const EditWidthField: React.FC<{
  columnObject: ColumnInfo;
}> = observer(({ columnObject }) => {
  const { actions } = useContext(context);
  return (
    <div>
      <Typography id="edit-width-text">Edit Width</Typography>
      <NumericFormat
        value={columnObject.width || ""}
        customInput={WidthTextField}
        onValueChange={(values) => {
          const floatValue = values.floatValue;
          actions.updateWidth(columnObject, floatValue ?? NaN);
        }}
        style={{ height: "20px" }}
      />
    </div>
  );
});
