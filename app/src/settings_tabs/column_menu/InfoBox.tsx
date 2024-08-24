import { observer } from "mobx-react-lite";
import React from "react";
import { Box, Typography } from "@mui/material";
import "./InfoBox.css";
import { StyledScrollbar } from "../../components";
import { trimQuotes } from "../../util/util";

export const InfoBox: React.FC<{ info: string, titleText: string }> = observer(({ info, titleText }) => {
  const addTargetBlank = (html: string) => {
    return html.replace(/<a\s+href=/g, '<a target="_blank" href=');
  };

  const content = trimQuotes(info).replaceAll('""', '"');
  const processedContent = addTargetBlank(content);
  return (
    <div className="column-popup-container">
      <Typography variant="h6">{titleText}</Typography>
      <Box className="column-popup-box">
        <StyledScrollbar className="scroll-bar">
          <Box
            className="column-info-box"
            sx={{ "& a": { color: "button.main" } }}
            dangerouslySetInnerHTML={{ __html: processedContent }}
          />
        </StyledScrollbar>
      </Box>
    </div>
  );
});
