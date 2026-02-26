import { Box, Typography } from "@mui/material";
import "./McpHome.css";
import { useTranslation } from "react-i18next";

export const McpHome = () => {
  const { t } = useTranslation();

  return (
    <Box className="mcp-home-container">
      <Typography variant="h3" className="mcp-home-title">
        {t("mcpHome.loginSuccessful")}
      </Typography>
      <Typography component="p" className="mcp-home-text">
        {t("mcpHome.returnToAgent")}
      </Typography>
    </Box>
  );
};
