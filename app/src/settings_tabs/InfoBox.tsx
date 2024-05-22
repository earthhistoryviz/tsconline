import { observer } from "mobx-react-lite";
import React from "react";
import { Box, Typography } from "@mui/material";
import "./InfoBox.css";
import { StyledScrollbar } from "../components";
import { trimQuotes } from "../util/util";

export const InfoBox: React.FC<{ info: string }> = observer(({ info }) => {
  return (
    <div className="column-popup-container">
      <Typography style={{ fontWeight: "bold" }}>Information and References</Typography>
      <Box className="column-popup-box">
        <StyledScrollbar className="scroll-bar">
          <div dangerouslySetInnerHTML={{ __html: trimQuotes(info).replaceAll('""', '"') }} />
        </StyledScrollbar>
      </Box>
    </div>
  );
});
