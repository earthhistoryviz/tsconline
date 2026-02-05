import { Box, Typography } from "@mui/material";
import "./McpHome.css"
export const McpHome = () => {
  return (
    <Box className="mcp-home-container">
      <Typography variant="h4" mb="1rem" mt="2rem">
        Login Successful
      </Typography>
      <Typography variant="p">
        Please return to your Agent
      </Typography>
    </Box>
  );
};
