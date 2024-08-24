import { observer } from "mobx-react-lite";
import React, { useContext } from "react";
import { FormLabel } from "@mui/material";
import TSCColorPicker from "../../components/TSCColorPicker";
import "./BackgroundColor.css";
import { convertHexToRGB } from "../../util/util";
import { ColumnInfo } from "@tsconline/shared";
import { context } from "../../state";
import { useTranslation } from "react-i18next";

interface ChangeBGColorProps {
  column: ColumnInfo;
  text: string;
}
export const ChangeBackgroundColor: React.FC<ChangeBGColorProps> = observer(({ column, text }) => {
  const { actions } = useContext(context);
  const handleColorChange = (color: string) => {
    actions.setRGB(convertHexToRGB(color, false), column);
  };

  return (
    <div>
      <FormLabel>{text}:&nbsp;</FormLabel>
      <TSCColorPicker
        key={column.name}
        color={`rgb(${column.rgb.r}, ${column.rgb.g}, ${column.rgb.b})`}
        onColorChange={handleColorChange}
      />
    </div>
  );
});
