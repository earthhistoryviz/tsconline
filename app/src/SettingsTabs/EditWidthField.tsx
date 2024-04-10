import { observer } from "mobx-react-lite";
import React, { useContext, useState } from "react";
import { context } from "../state";
import { Button, TextFieldProps, Typography, TextField } from "@mui/material";
import "./EditWidthField.css";
import { NumericFormat } from "react-number-format";
import { pushError } from "../state/actions";
import { ErrorCodes } from "../util/error-codes";

const WidthTextField = ({ ...props }: TextFieldProps) => (
  <TextField {...props} hiddenLabel variant="filled" size="small" />
);

export const EditWidthField: React.FC<{
  width: number;
}> = observer(({ width }) => {
  const { actions } = useContext(context);
  const [inputWidth, setInputWidth] = useState<number>(width ?? 0);
  return (
    <div>
      <Typography id="edit-width-text">Edit Width</Typography>
      <div id="edit-width-container">
        <NumericFormat
          value={inputWidth}
          customInput={WidthTextField}
          onValueChange={(values) => {
            const floatValue = values.floatValue;
            if (!floatValue) {
              return;
            }
            setInputWidth(floatValue);
          }}
          style={{ height: "20px" }}
        />
        <div>
          <Button
            color="secondary"
            variant="contained"
            onClick={() => {
              if (isNaN(inputWidth)) pushError(ErrorCodes.INVALID_WIDTH_TYPE);
              actions.updateWidth(inputWidth);
            }}>
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
});
