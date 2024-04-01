import { observer } from "mobx-react-lite";
import React, { useState } from "react";
import { makeAutoObservable } from "mobx";
import { SketchPicker, ColorResult } from "@hello-pangea/color-picker";
import Button from "@mui/material/Button";
import "./TSCColorPicker.css";
import { updatePresetColors } from "../state/actions";
import { state } from "../state";

const TSCColorPicker: React.FC = observer(() => {
  const [showPicker, setShowPicker] = useState<boolean>(false);
  const [selectedColor, setSelectedColor] = useState<string>("#000");

  const handleColorChange = (color: ColorResult) => {
    setSelectedColor(color.hex);
  };

  const handleFinalChange = () => {
    updatePresetColors(selectedColor);
  };

  return (
    <div>
      <Button
        color="secondary"
        variant="contained"
        onClick={() => {
          setShowPicker(!showPicker);
          if (showPicker) {
            handleFinalChange();
          }
        }}
        className="cp-button"
        style={{ backgroundColor: selectedColor }}></Button>
      {showPicker && (
        <div className="color-picker">
          <SketchPicker color={selectedColor} onChangeComplete={handleColorChange} presetColors={state.presetColors} />
        </div>
      )}
    </div>
  );
});

export default TSCColorPicker;
