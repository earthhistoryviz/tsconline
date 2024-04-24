import { observer } from "mobx-react-lite";
import React, {useContext} from "react";
import { FormLabel, Typography } from "@mui/material";
import TSCColorPicker from "../components/TSCColorPicker";
import "./BackgroundColor.css";
import { convertHexToRGB } from "../util/util";
import { ColumnInfo } from "@tsconline/shared";
import { context } from "../state";

interface ChangeBGColorProps {
  column: ColumnInfo;
}
export const ChangeBackgroundColor: React.FC<ChangeBGColorProps> = observer(({ column }) => {
  const { state, actions } = useContext(context);
  const handleColorChange = (color: string) => {
    actions.setRGB(column, convertHexToRGB(color, false));
  };

  if (column.children.length != 0) {
    return (
      <>
        <FormLabel>
          Background Color:
          <Typography className="not-avail">
            Not Available
          </Typography>
        </FormLabel>
      </>
    );
  } else {
    return (
      <div>
        <FormLabel>
          Background Color:&nbsp;
        </FormLabel>
          <TSCColorPicker
              key={column.name}
              color={`rgb(${column.rgb.r}, ${column.rgb.g}, ${column.rgb.b})`}
              onColorChange={handleColorChange}
          />
      </div>
    );
  }
});
