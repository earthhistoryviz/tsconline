import { observer } from "mobx-react-lite";
import React, { useState } from "react";
import { FormLabel } from "@mui/material";
import TSCColorPicker from "../components/TSCColorPicker";

export const ChangeBackgroundColor: React.FC = observer(() => {
  const [selectedColor, setSelectedColor] = useState("#000"); // State to keep track of selected color

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
  };

  return (
    <div>
      <FormLabel id="color-label" className="bg-label">
        Background Color:
      </FormLabel>
      <TSCColorPicker color={selectedColor} onColorChange={handleColorChange} />
    </div>
  );
});
