import { observer } from "mobx-react-lite";
import React, { useContext, useState } from "react";
import { context } from "../state";
import { TextFieldProps, Typography, TextField } from "@mui/material";
import "./EditWidthField.css";
import { NumericFormat } from "react-number-format";
import { ColumnInfo } from "@tsconline/shared";

const WidthTextField = ({ ...props }: TextFieldProps) => (
  <TextField {...props} hiddenLabel variant="filled" size="small" />
);

export const EditWidthField: React.FC<{
  width: number | undefined;
}> = observer(({ width = 20 }) => {
  const { state, actions } = useContext(context);
  const [inputWidth, setInputWidth] = useState<number>(width);
  let columnObject: ColumnInfo | undefined;
  if (state.settingsTabs.columnSelected != null) {
    columnObject = state.settingsTabs.columnHashMap.get(state.settingsTabs.columnSelected);
  }
  return (
    <div>
      <Typography id="edit-width-text">Edit Width</Typography>
      <NumericFormat
        value={inputWidth || ""}
        customInput={WidthTextField}
        onValueChange={(values) => {
          const floatValue = values.floatValue;
          if (floatValue === undefined && columnObject) {
            actions.updateWidth(columnObject, 20);
            return;
          }
          if (floatValue !== undefined) {
            setInputWidth(floatValue);
            if (columnObject) actions.updateWidth(columnObject, floatValue);
          }
        }}
        style={{ height: "20px" }}
      />
    </div>
  );
});
