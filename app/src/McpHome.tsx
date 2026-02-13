import { Box, Typography } from "@mui/material";
import "./McpHome.css";
export const McpHome = () => {
  return (
    <Box className="mcp-home-container">
      <Typography variant="h3" className="mcp-home-title">
        Login Successful
      </Typography>
      <Typography component="p" className="mcp-home-text">
        Please return to your Agent
      </Typography>
    </Box>
  );
};
