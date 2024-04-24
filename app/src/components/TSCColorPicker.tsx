import { observer } from "mobx-react-lite";
import React, { useContext, useState, useRef, useEffect, CSSProperties } from "react";
import { SketchPicker, ColorResult } from "@hello-pangea/color-picker";
import Button from "@mui/material/Button";
import "./TSCColorPicker.css";
import { context } from "../state";

interface TSCColorPickerProps {
  color: string; // Current color
  onColorChange: (color: string) => void; // Callback function when color changes
  disabled?: boolean;
}
const TSCColorPicker: React.FC<TSCColorPickerProps> = observer(({ color, onColorChange, disabled = false}) => {
  const [showPicker, setShowPicker] = useState<boolean>(false);
  const [selectedColor, setSelectedColor] = useState<string>(color);
  const { state, actions } = useContext(context);
  const pickerRef = useRef<HTMLDivElement>(null); // Reference to the picker container

  const handleColorChange = (color: ColorResult) => {
    setSelectedColor(color.hex);
    onColorChange(color.hex);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowPicker(false);
        actions.updatePresetColors(selectedColor);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  });

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
        disabled={disabled}
        className="cp-button"
        style={{ backgroundColor: selectedColor}}></Button>
      {showPicker && (
        <div ref={pickerRef} className="color-picker">
          <SketchPicker color={selectedColor} onChangeComplete={handleColorChange} presetColors={state.presetColors} />
        </div>
      )}
    </>
  );
});

export default TSCColorPicker;
