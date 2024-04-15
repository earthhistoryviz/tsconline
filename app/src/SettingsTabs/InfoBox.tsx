import { observer } from "mobx-react-lite";
import React from "react";
import { Box, Typography } from "@mui/material";
import "./InfoBox.css";
import { StyledScrollbar } from "../components";

export const InfoBox: React.FC<{ info: string }> = observer(({ info }) => {
  function trimQuotes(input: string): string {
    if (input.startsWith('"') && input.endsWith('"')) {
      return input.slice(1, -1);
    }
    return input;
  }

  return (
    <div className="container">
      <Typography style={{ fontWeight: "bold" }}>Information and References</Typography>
      <Box className="info-box">
        <StyledScrollbar className="scroll-bar">
          <div dangerouslySetInnerHTML={{ __html: trimQuotes(info).replaceAll('""', '"') }} />
        </StyledScrollbar>
      </Box>
    </div>
  );
});
