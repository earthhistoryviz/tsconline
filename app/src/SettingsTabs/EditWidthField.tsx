import { observer } from "mobx-react-lite";
import React, { useContext, useState } from "react";
import { context } from "../state";
import { Button, Typography } from "@mui/material";
import { Unstable_NumberInput as NumberInput, numberInputClasses } from "@mui/base/Unstable_NumberInput";
import { styled } from "@mui/material/styles";

import "./EditWidthField.css";

type ChangeHandler = (
  event: React.FocusEvent<HTMLInputElement, Element> | React.PointerEvent<Element> | React.KeyboardEvent<Element>,
  value: number | null
) => void;

export const EditWidthField = observer(() => {
  const { state, actions } = useContext(context);
  const name =
    state.settingsTabs.columnSelected === null
      ? ""
      : state.settingsTabs.columnHashMap.get(state.settingsTabs.columnSelected)!.editName;

  const editWidth =
    state.settingsTabs.columnSelected === null
      ? 0
      : state.settingsTabs.columnHashMap.get(state.settingsTabs.columnSelected)!.width;
  const [width, setWidth] = useState<number>(editWidth ?? 0);
  const handleChange: ChangeHandler = (event, value) => {
    if (value === null) return;
    if (isNaN(value)) return;
    setWidth(value);
  };
  return (
    <div>
      <Typography style={{ padding: "5px" }}>Edit Width</Typography>
      <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
        <NumberInput
          placeholder="Edit width"
          value={width}
          key={name}
          onChange={handleChange}
          slots={{
            root: StyledInputRoot,
            input: StyledInputElement,
            incrementButton: StyledButton,
            decrementButton: StyledButton
          }}
          slotProps={{
            incrementButton: {
              children: "▴"
            },
            decrementButton: {
              children: "▾"
            }
          }}
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
