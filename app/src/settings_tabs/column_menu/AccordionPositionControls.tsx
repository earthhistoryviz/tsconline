import React, { useContext } from "react";
import { Typography, IconButton, useTheme } from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import { ColumnInfo } from "@tsconline/shared";
import { context } from "../../state"; // Import the context

interface AccordionPositionControlsProps {
  column: ColumnInfo;
}

const AccordionPositionControls: React.FC<AccordionPositionControlsProps> = ({ column }) => {
  const { actions } = useContext(context); // Use the context to get actions
  const theme = useTheme();
  console.log(theme.palette.backgroundColor.light);

  const incrementPosition = () => {
    actions.incrementColumnPosition(column);
  };

  const decrementPosition = () => {
    actions.decrementColumnPosition(column);
  };

  return (
    <div className="accordion-position-controls">
      <Typography>Shift Row Positions</Typography>
      <div className="lightgray-square">
        <IconButton
          className="custom-icon-button"
          onClick={incrementPosition}
          sx={{ bgcolor: "iconContrastBackground.main" }}>
          <ArrowUpwardIcon sx={{ color: "iconContrastBackground.light" }} />
        </IconButton>
      </div>
      <div className="lightgray-square">
        <IconButton
          className="custom-icon-button"
          onClick={decrementPosition}
          sx={{ bgcolor: "iconContrastBackground.main" }}>
          <ArrowDownwardIcon sx={{ color: "iconContrastBackground.light" }} />
        </IconButton>
      </div>
    </div>
  );
};

export default AccordionPositionControls;
