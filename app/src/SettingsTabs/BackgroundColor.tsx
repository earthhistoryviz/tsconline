import { observer } from "mobx-react-lite";
import React, { useState, useContext, useEffect } from "react";
import { FormLabel, Typography } from "@mui/material";
import TSCColorPicker from "../components/TSCColorPicker";
import { context } from "../state";
import { setRGB } from "../state/actions";
import { RGB } from "@tsconline/shared";
import "./BackgroundColor.css";
import { convertHexToRGB } from "../state/actions/util-actions"


interface ChangeBGColorProps {
  column: ColumnInfo
}
export const ChangeBackgroundColor: React.FC<ChangeBGColorProps> = observer(({column}) => {
  const { state, actions } = useContext(context);
  const handleColorChange = (color: string) => {
    setRGB(column, convertHexToRGB(color, false));
  };


  if (column.children.length != 0) {
    return (
      <div>
      <FormLabel id="color-label" className="bg-label">
        Background Color:     
        <Typography className="not-avail" style={{ display: 'inline' }}>
            Not Available
        </Typography>
      </FormLabel>
    </div>
    )
  }
  else {
    return (
      <div>
        <FormLabel id="color-label" className="bg-label">
          Background Color:
        </FormLabel>
        <TSCColorPicker key={column.name} color={`rgb(${column.rgb.r}, ${column.rgb.g}, ${column.rgb.b})`} onColorChange={handleColorChange} />
      </div>
    );
  }
});
