import { observer } from "mobx-react-lite";
import React, { useContext, useState } from "react";
import { SketchPicker, ColorResult } from "@hello-pangea/color-picker";
import Button from "@mui/material/Button";
import "./TSCColorPicker.css";
import { context } from "../state";

interface TSCColorPickerProps {
  color: string; // Current color
  onColorChange: (color: string) => void; // Callback function when color changes
}
const TSCColorPicker: React.FC<TSCColorPickerProps> = observer(({ color, onColorChange }) => {
  const [showPicker, setShowPicker] = useState<boolean>(false);
  const [selectedColor, setSelectedColor] = useState<string>(color ? color : "#000");
  const { state, actions } = useContext(context);

  const handleColorChange = (color: ColorResult) => {
    setSelectedColor(color.hex);
    onColorChange(color.hex);
  };

  return (
    <>
  <Button
    color="secondary"
    variant="contained"
    onClick={() => {
      setShowPicker(!showPicker);
      if (showPicker) {
        actions.updatePresetColors(selectedColor);
      }
    }}
    className="cp-button"
    style={{ backgroundColor: selectedColor }}
  ></Button>
  {showPicker && (
    <div className="color-picker">
      <SketchPicker
        color={selectedColor}
        onChangeComplete={handleColorChange}
        presetColors={state.presetColors}
      />
    </div>
  )}
</>
  );
});

export default TSCColorPicker;
