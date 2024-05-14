import { observer } from "mobx-react-lite";
import React, { useContext, useState, useRef, useEffect, useMemo, useLayoutEffect } from "react";
import { SketchPicker, ColorResult } from "@hello-pangea/color-picker";
import Button from "@mui/material/Button";
import "./TSCColorPicker.css";
import { context } from "../state";
import { createPortal } from "react-dom";

interface TSCColorPickerProps {
  color: string; // Current color
  onColorChange: (color: string) => void; // Callback function when color changes
  disabled?: boolean;
  portal?: boolean;
}
const TSCColorPicker: React.FC<TSCColorPickerProps> = observer(({ color, onColorChange, disabled = false, portal = false }) => {
  const [showPicker, setShowPicker] = useState<boolean>(false);
  const [selectedColor, setSelectedColor] = useState<string>(color);
  const { state, actions } = useContext(context);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showPicker && buttonRef.current && pickerRef.current && !pickerRef.current.contains(event.target as Node) && event.target !== buttonRef.current) {
        setShowPicker(false);
        actions.updatePresetColors(selectedColor);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  });

  // not useEffect because we must wait for DOM mutations to finish, otherwise flashing will occur
  useLayoutEffect(() => {
    if (!portal || !showPicker) return;
    if (!portalContainer) {
      const div = document.createElement("div");
      document.body.appendChild(div);
      setPortalContainer(div);
    }
    if (buttonRef.current && portalContainer) {
      const { innerWidth, innerHeight } = window;
      const rect = buttonRef.current.getBoundingClientRect();
      portalContainer.style.top = `${rect.bottom + 306.5 > innerHeight ? rect.top - 306.5 : rect.bottom}px`;
      portalContainer.style.left = `${rect.left + 225 > innerWidth ? rect.right - 225 : rect.left}px`;
      portalContainer.style.position = "absolute";
      portalContainer.style.zIndex = "1500";
    }
    return () => {
      if (portalContainer && document.body.contains(portalContainer)) {
        document.body.removeChild(portalContainer);
        setPortalContainer(null);
      }
    };
  }, [showPicker, portalContainer]);

  const handleColorChange = (color: ColorResult) => {
    setSelectedColor(color.hex);
    onColorChange(color.hex);
  };

  const ColorPicker = (
    <div ref={pickerRef} className="color-picker">
      <SketchPicker color={selectedColor} onChangeComplete={handleColorChange} presetColors={state.presetColors} />
    </div>
  );

  return (
    <>
      <Button
        color="secondary"
        ref={buttonRef}
        variant="contained"
        onClick={() => {
          setShowPicker(!showPicker);
          if (showPicker) {
            actions.updatePresetColors(selectedColor);
          }
        }}
        disabled={disabled}
        className="cp-button"
        style={{ backgroundColor: selectedColor }}></Button>
      {showPicker && (
        portal && portalContainer ? createPortal(ColorPicker, portalContainer) : ColorPicker
      )}
    </>
  );
});

export default TSCColorPicker;
