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
  width: number;
  columnObject: ColumnInfo | undefined;
}> = observer(({ width, columnObject }) => {
  const { actions } = useContext(context);
  return (
    <div>
      <Typography id="edit-width-text">Edit Width</Typography>
      <NumericFormat
        value={width || ""}
        customInput={WidthTextField}
        onValueChange={(values) => {
          const floatValue = values.floatValue;
          if (columnObject) actions.updateWidth(columnObject, floatValue ?? NaN);
        }}
        style={{ height: "20px" }}
      />
    </div>
  );
});
