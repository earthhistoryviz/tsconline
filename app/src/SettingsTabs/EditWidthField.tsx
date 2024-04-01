import { observer } from "mobx-react-lite";
import { useContext, useState } from "react";
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
}> = observer(({ width }) => {
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
          if (columnObject) actions.updateWidth(columnObject, floatValue ?? 20);
          if (floatValue) setInputWidth(floatValue);
        }}
        style={{ height: "20px" }}
      />
    </div>
  );
});
