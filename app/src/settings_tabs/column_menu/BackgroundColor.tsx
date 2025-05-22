import { observer } from "mobx-react-lite";
import React, { useContext } from "react";
import { FormLabel } from "@mui/material";
import TSCColorPicker from "../../components/TSCColorPicker";
import "./BackgroundColor.css";
import { convertHexToRGB } from "../../util/util";
import { context } from "../../state";
import { useTranslation } from "react-i18next";
import { RenderColumnInfo } from "../../types";

interface ChangeBGColorProps {
  column: RenderColumnInfo;
}
export const ChangeBackgroundColor: React.FC<ChangeBGColorProps> = observer(({ column }) => {
  const { actions } = useContext(context);
  const { t } = useTranslation();
  const handleColorChange = (color: string) => {
    actions.setRGB(convertHexToRGB(color, false), column);
  };

  return (
    <div>
      <FormLabel>{t("settings.column.menu.background-color")}:&nbsp;</FormLabel>
      <TSCColorPicker
        key={column.name}
        color={`rgb(${column.rgb.r}, ${column.rgb.g}, ${column.rgb.b})`}
        onColorChange={handleColorChange}
      />
    </div>
  );
});
