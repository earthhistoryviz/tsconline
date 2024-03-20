import { observer } from "mobx-react-lite";
import React, { useState } from "react";
import { HSLColor, RGBColor, SketchPicker } from "react-color";
import { Button } from "@mui/material";
import "./TSCColorPicker.css";

interface ColorResult {
  hex: string;
  rgb: RGBColor;
  hsl: HSLColor;
}

const TSCColorPicker: React.FC = observer(() => {
  const [showPicker, setShowPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState("#000"); // State to keep track of selected color

  const handleColorChange = (color: ColorResult) => {
    setSelectedColor(color.hex);
  };

  return (
    <div>
      <Button
        color="secondary"
        variant="contained"
        onClick={() => setShowPicker(!showPicker)}
        className="cp-button"
        style={{ backgroundColor: selectedColor }}></Button>
      {showPicker && (
        <div style={{ position: "absolute", zIndex: 2 }}>
          {/* @ts-expect-error Server Component */}
          <SketchPicker color={selectedColor} onChange={handleColorChange} />
        </div>
      )}
    </div>
  );
});

export default TSCColorPicker;
