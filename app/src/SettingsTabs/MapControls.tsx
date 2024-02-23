import { observer } from "mobx-react-lite";
import { useContext } from "react";
import { context } from "../state";
import {
  ColoredDiv,
  TSCInputAdornment,
  TSCNumberInput,
  TypographyText,
} from "../components";
import { Slider } from "@mui/material";
import "./MapControls.css";

export const FaciesControls = observer(() => {
  const { state, actions } = useContext(context);
  const dotSizeRange = { min: 1, max: 20 };
  const overallAgeMax = 9999999;
  return (
    <ColoredDiv className="facies-buttons">
      <div className="dot-controls">
        <TypographyText className="dot-controls-title">
          {" "}
          Dot Size{" "}
        </TypographyText>
        <div className="slider-container">
          <TSCNumberInput
            className="dot-input-form"
            placeholder="Dot Size"
            max={dotSizeRange.max}
            min={dotSizeRange.min}
            value={state.mapState.currentFaciesOptions.dotSize}
            onChange={(
              _event:
                | React.FocusEvent<HTMLInputElement, Element>
                | React.PointerEvent<Element>
                | React.KeyboardEvent<Element>,
              val: number | undefined
            ) => {
              if (!val || val < 1 || val > 20) {
                return;
              }
              actions.setDotSize(val as number);
            }}
          />
          <Slider
            id="dot-size-slider"
            className="slider"
            value={state.mapState.currentFaciesOptions.dotSize}
            max={20}
            min={1}
            onChange={(event: Event, val: number | number[]) => {
              actions.setDotSize(val as number);
            }}
            aria-label="Default"
            valueLabelDisplay="auto"
          />
        </div>
      </div>
      <div className="age-controls">
        <TypographyText> Age </TypographyText>
        <div className="slider-container">
          <TSCNumberInput
            endAdornment={<TSCInputAdornment>MA</TSCInputAdornment>}
            className="age-input-form"
            placeholder="Age"
            max={state.mapState.selectedMapAgeRange.maxAge}
            min={state.mapState.selectedMapAgeRange.minAge}
            value={state.mapState.currentFaciesOptions.faciesAge}
            onChange={(
              _event:
                | React.FocusEvent<HTMLInputElement, Element>
                | React.PointerEvent<Element>
                | React.KeyboardEvent<Element>,
              val: number | undefined
            ) => {
              if (!val || val < 0 || val > 9999999) {
                return;
              }
              actions.setFaciesAge(val as number);
            }}
          />
          <Slider
            id="number-input"
            className="slider"
            name="Facies-Age-Slider"
            max={state.mapState.selectedMapAgeRange.maxAge}
            min={state.mapState.selectedMapAgeRange.minAge}
            value={state.mapState.currentFaciesOptions.faciesAge}
            onChange={(event: Event, val: number | number[]) => {
              actions.setFaciesAge(val as number);
            }}
            aria-label="Default"
            valueLabelDisplay="auto"
          />
        </div>
      </div>
    </ColoredDiv>
  );
});
