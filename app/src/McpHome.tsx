import { Box, Typography } from "@mui/material";
import "./McpHome.css";
import SmartToyIcon from "@mui/icons-material/SmartToy";
export const McpHome = () => {
  return (
    <Box className="mcp-home-container">
      <SmartToyIcon fontSize="large" />
      <Typography variant="h3" mb=".5rem" mt=".5rem">
        Login Successful
      </Typography>
      <Typography variant="p" fontSize="1.25rem">
        Please return to your Agent
      </Typography>
    </Box>
  );
};
