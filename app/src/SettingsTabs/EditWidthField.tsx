import { observer } from "mobx-react-lite";
import React, { useContext, useState } from "react";
import { context } from "../state";
import { TextFieldProps, Typography, TextField } from "@mui/material";
import "./EditWidthField.css";
import { NumericFormat } from "react-number-format";
import { ColumnInfo } from "@tsconline/shared";

import "./EditWidthField.css";

type ChangeHandler = (
  event: React.FocusEvent<HTMLInputElement, Element> | React.PointerEvent<Element> | React.KeyboardEvent<Element>,
  value: number | null
) => void;

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

const StyledInputRoot = styled("div")(
  () => `
  font-family: 'Titillium Web', sans-serif;
  border-radius: 5px 5px 0px 0px;
  background: #a3cbd8;
  border: none;
  border-bottom: solid #5f767d 1px;
  display: grid;
  grid-template-columns: 1fr 19px;
  grid-template-rows: 1fr 1fr;
  overflow: hidden;
  column-gap: 8px;
  padding: 4px;

  &:hover {
    background: #9dc5d1;
    border-bottom: solid #000 1px;
  }

  &:focus-visible {
    outline: 0;
  }

  &.${numberInputClasses.focused} {
    border-bottom: solid #fff 1px;
  }
`
);

const StyledInputElement = styled("input")(
  () => `
  font-family: inherit;
  grid-column: 1/2;
  grid-row: 1/3;
  background: inherit;
  border: none;
  border-radius: inherit;
  padding: 2px 6px;
  outline: 0;
`
);

const StyledButton = styled("button")(
  () => `
  display: flex;
  flex-flow: row nowrap;
  justify-content: center;
  align-items: center;
  appearance: none;
  padding: 0;
  width: 19px;
  height: 19px;
  font-family: system-ui, sans-serif;
  font-size: 0.875rem;
  line-height: 1;
  box-sizing: border-box;
  background: #dddddd;
  border: 0;
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 120ms;

  &:hover {
    background: #9a9a9a;
    cursor: pointer;
  }

  &.${numberInputClasses.incrementButton} {
    grid-column: 2/3;
    grid-row: 1/2;
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;
    border: 1px solid;
    border-bottom: 0;
    &:hover {
      cursor: pointer;
      background: #9a9a9a;
      color: #dddddd;
    }

  border-color: #DAE2ED;
  background: #dddddd;
  color: #1C2025;
  }

  &.${numberInputClasses.decrementButton} {
    grid-column: 2/3;
    grid-row: 2/3;
    border-bottom-left-radius: 4px;
    border-bottom-right-radius: 4px;
    border: 1px solid;
    &:hover {
      cursor: pointer;
      background: #9a9a9a;
      color: #dddddd;
    }

  border-color: #DAE2ED;
  background: #dddddd
  color: #1C2025;
  }
  & .arrow {
    transform: translateY(-1px);
  }
`
);
