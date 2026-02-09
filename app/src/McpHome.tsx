import { Box, Typography } from "@mui/material";
import "./McpHome.css";
import SmartToyIcon from "@mui/icons-material/SmartToy";
export const McpHome = () => {
  return (
    <Box className="mcp-home-container">
      <SmartToyIcon className="mcp-home-icon" />
      <Typography variant="h3" className="mcp-home-title">
        Login Successful
      </Typography>
      <Typography component="p" className="mcp-home-text">
        Please return to your Agent
      </Typography>
    </Box>
  );
};
