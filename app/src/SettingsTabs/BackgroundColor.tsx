import { observer } from "mobx-react-lite";
import React, { useState, useContext } from "react";
import { FormLabel } from "@mui/material";
import TSCColorPicker from "../components/TSCColorPicker";
import { context } from "../state";
import { setRGB } from "../state/actions";
import { RGB } from "@tsconline/shared";

function hexToRgb(hex: string): RGB {
  // Ensure the input is a valid hex color code
  if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex)) {
      throw new Error("Invalid hexadecimal color code");
  }

  // Remove the "#" character
  hex = hex.slice(1);

  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  if (hex.length === 3) {
      hex = hex.split('').map(char => char + char).join('');
  }

  // Parse the red, green, and blue values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const toReturn: RGB = {r: r, g: g, b: b}

  // Return the RGB representation
  return toReturn;
}

export const ChangeBackgroundColor: React.FC = observer(() => {
  const { state, actions } = useContext(context);
  const bgColor = state.settingsTabs.columnHashMap.get(state.settingsTabs.columnSelected as string)!.rgb;

  const [selectedColor, setSelectedColor] = useState(bgColor); // State to keep track of selected color
  
  const handleColorChange = (color: string) => {
    setRGB(hexToRgb(color));
  };

  return (
    <div>
      <FormLabel id="color-label" className="bg-label">
        Background Color:
      </FormLabel>
      <TSCColorPicker color={`rgb(${selectedColor.r}, ${selectedColor.g}, ${selectedColor.b})`} onColorChange={handleColorChange} />
    </div>
  );
});
