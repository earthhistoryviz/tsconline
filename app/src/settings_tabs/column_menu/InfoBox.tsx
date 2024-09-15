import { observer } from "mobx-react-lite";
import React from "react";
import { Box, Typography } from "@mui/material";
import "./InfoBox.css";
import { StyledScrollbar } from "../../components";
import { trimQuotes } from "../../util/util";
import { useTranslation } from "react-i18next";

export const InfoBox: React.FC<{ info: string }> = observer(({ info }) => {
  const addTargetBlank = (html: string) => {
    return html.replace(/<a\s+href=/g, '<a target="_blank" href=');
  };

  const content = trimQuotes(info).replaceAll('""', '"');
  const processedContent = addTargetBlank(content);
  const { t } = useTranslation();
  return (
    <div className="column-popup-container">
      <Typography variant="h6">{t("settings.column.menu.info-box")}</Typography>
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
