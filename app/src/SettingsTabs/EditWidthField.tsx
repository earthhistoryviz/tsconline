import { observer } from "mobx-react-lite";
import { useContext, useState } from "react";
import { context } from "../state";
import { Button, TextFieldProps, Typography, TextField } from "@mui/material";
import "./EditWidthField.css";
import { NumericFormat } from "react-number-format";

const WidthTextField = ({ ...props }: TextFieldProps) => (
  <TextField {...props} hiddenLabel variant="filled" size="small" />
);

export const EditWidthField = observer(() => {
  const { state, actions } = useContext(context);
  const editWidth =
    state.settingsTabs.columnSelected === null
      ? 0
      : state.settingsTabs.columnHashMap.get(state.settingsTabs.columnSelected)!.width;
  const [width, setWidth] = useState<number>(editWidth ?? 0);
  return (
    <div>
      <Typography style={{ padding: "5px" }}>Edit Width</Typography>
      <div style={{ display: "flex", flexDirection: "row" }}>
        <NumericFormat
          value={width}
          customInput={WidthTextField}
          onValueChange={(values) => {
            const floatValue = values.floatValue;
            if (!floatValue) {
              return;
            }
            setWidth(floatValue);
          }}
          style={{ height: "20px" }}
        />
        <div>
          <Button
            color="secondary"
            variant="contained"
            onClick={() => {
              actions.updateWidth(width);
            }}>
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
});
