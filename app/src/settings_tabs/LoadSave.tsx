import { Box } from "@mui/material";
import LoadSettings from "./LoadSettings";
import SaveSettings from "./SaveSettings";
import "./LoadSave.css";

const LoadSave = () => {
  return (
    <Box className="load-save-settings-actions">
      <LoadSettings />
      <SaveSettings />
    </Box>
  );
};

export default LoadSave;
