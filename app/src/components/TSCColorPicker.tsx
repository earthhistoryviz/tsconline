import { observer } from "mobx-react-lite";
import React, { useState } from "react";
import { makeAutoObservable } from "mobx";
import { SketchPicker, ColorResult } from "@hello-pangea/color-picker";
import Button from "@mui/material/Button";
import "./TSCColorPicker.css";

// Define the default colors as a constant array of strings.
const defaultColors: string[] = [
  "#D32F2F",
  "#C2185B",
  "#7B1FA2",
  "#512DA8",
  "#303F9F",
  "#1976D2",
  "#0288D1",
  "#0097A7",
  "#00796B",
  "#388E3C"
];

// MobX Store
class ColorStore {
  presetColors: string[] = [];

  constructor() {
    makeAutoObservable(this);
    this.loadPresetColors();
  }

  loadPresetColors() {
    const savedColors = localStorage.getItem("savedColors");
    this.presetColors = savedColors ? JSON.parse(savedColors) : [...defaultColors];
  }

  updatePresetColors(newColor: string) {
    let updatedColors = this.presetColors.filter((c) => c !== newColor);
    updatedColors.unshift(newColor);
    if (updatedColors.length > 10) {
      updatedColors = updatedColors.slice(0, 10);
    }
    this.presetColors = updatedColors;
    localStorage.setItem("savedColors", JSON.stringify(updatedColors));
  }
}

const colorStore = new ColorStore();

// TSCColorPicker Component
const TSCColorPicker: React.FC = observer(() => {
  const [showPicker, setShowPicker] = useState<boolean>(false);
  const [selectedColor, setSelectedColor] = useState<string>("#000");

  const handleColorChange = (color: ColorResult) => {
    setSelectedColor(color.hex);
  };

  const handleFinalChange = () => {
    colorStore.updatePresetColors(selectedColor);
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
        <div style={{ position: "absolute", zIndex: 2 }}>
          <SketchPicker
            color={selectedColor}
            onChangeComplete={handleColorChange}
            presetColors={colorStore.presetColors}
          />
        </div>
      )}
    </div>
  );
});

export default TSCColorPicker;
