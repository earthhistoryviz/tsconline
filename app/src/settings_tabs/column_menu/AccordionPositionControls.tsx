import React, { useContext } from "react";
import { Typography, IconButton } from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import { ColumnInfo } from "@tsconline/shared";
import { context } from "../../state"; // Import the context

interface AccordionPositionControlsProps {
  column: ColumnInfo;
}

const AccordionPositionControls: React.FC<AccordionPositionControlsProps> = ({ column }) => {
  const { actions } = useContext(context); // Use the context to get actions

  const incrementPosition = () => {
    actions.incrementColumnPosition(column);
  };

  const decrementPosition = () => {
    actions.decrementColumnPosition(column);
  };
  // Future Notes:
  // IF YOU ARE LOOKING FOR SHIFT ROW / SHIFTROW / SHIFT_ROW / SHIFT COL / SHIFTCOL / SHIFT_COL settings,
  // This if the file, along with column-actions.ts
  // I am not sure why it is refered to as shift row in the original Java program this is based off of,
  // since everywhere else refers to it as a column, as does the final product.

  return (
    <div className="accordion-position-controls">
      <Typography>Shift Row Positions</Typography>
      <div className="lightgray-square">
        <IconButton
          className="custom-icon-button"
          onClick={incrementPosition}
          sx={{ bgcolor: "iconContrastBackground.main", "&:hover": { bgcolor: "rgba(0, 0, 0, 0.2)" } }}>
          <ArrowUpwardIcon sx={{ color: "iconContrastBackground.light" }} />
        </IconButton>
      </div>
      <div className="lightgray-square">
        <IconButton
          className="custom-icon-button"
          onClick={decrementPosition}
          sx={{ bgcolor: "iconContrastBackground.main", "&:hover": { bgcolor: "rgba(0, 0, 0, 0.2)" } }}>
          <ArrowDownwardIcon sx={{ color: "iconContrastBackground.light" }} />
        </IconButton>
      </div>
    </div>
  );
};

export default AccordionPositionControls;
