import { useState, useContext } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  IconButton,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  Tooltip,
  Divider
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import SettingsIcon from "@mui/icons-material/Settings";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { observer } from "mobx-react-lite";
import { context } from "../state";
import { useTheme } from "@mui/material/styles";

type GeoGPTSettingsPopupProps = {
  open: boolean;
  onClose: () => void;
  onGenerate: () => Promise<void>;
};

export const GeoGPTSettingsPopup = observer(({ open, onClose, onGenerate }: GeoGPTSettingsPopupProps) => {
  const { state, actions } = useContext(context);
  const theme = useTheme();
  const [copyStatus, setCopyStatus] = useState("");
  const sessionId = state.user.geogptSessionId || "";

  const handleCopySessionId = async () => {
    if (!sessionId) {
      return;
    }
    try {
      await navigator.clipboard.writeText(sessionId);
      setCopyStatus("Copied");
      window.setTimeout(() => setCopyStatus(""), 1500);
    } catch (e) {
      setCopyStatus("Unable to copy");
      window.setTimeout(() => setCopyStatus(""), 1500);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <SettingsIcon /> GeoGPT Settings
      </DialogTitle>
      <DialogContent>
        <Box mb={2}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
            <Typography variant="body2" fontWeight={600}>
              Current GeoGPT session ID
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "nowrap" }}>
            <TextField
              fullWidth
              value={sessionId || "No active GeoGPT session yet."}
              InputProps={{ readOnly: true }}
              size="small"
            />
            <Tooltip title={sessionId ? "Copy session ID" : "No session ID to copy"}>
              <span>
                <Button
                  onClick={handleCopySessionId}
                  disabled={!sessionId}
                  startIcon={<ContentCopyIcon />}
                  size="small"
                  variant="outlined">
                  Copy
                </Button>
              </span>
            </Tooltip>
          </Box>
          {copyStatus && (
            <Typography variant="caption" color="text.secondary" mt={1}>
              {copyStatus}
            </Typography>
          )}
        </Box>

        <Divider sx={{ mb: 2 }} />

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" gutterBottom>
            Use these settings to decide what happens when you create your next GeoGPT session.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            1. Turn on the options you want.
            <br />
            2. Click <strong>Generate GeoGPT Session</strong> with these settings to automatically copy the GeoGPT
            session ID.
            <br />
            3. Paste the generated session ID into GeoGPT to link it with your account.
          </Typography>
        </Box>

        <Divider sx={{ mb: 2 }} />

        <Box>
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <FormControlLabel
                sx={{ mr: 0 }}
                control={
                  <Switch
                    checked={state.user.settings.geogptTscOnlineCoWork}
                    onChange={() => actions.setGeoGPTTscOnlineCoWork(!state.user.settings.geogptTscOnlineCoWork)}
                    sx={{
                      "& .MuiSwitch-switchBase.Mui-checked": {
                        color: "#6693C9"
                      },
                      "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                        backgroundColor: "#6693C9",
                        opacity: 1
                      },
                      "& .MuiSwitch-track": {
                        backgroundColor: theme.palette.mode === "dark" ? "#5b6f89" : "#b7d0eb",
                        opacity: 1
                      }
                    }}
                  />
                }
                label="Enable GeoGPT and TSCOnline co-work"
              />
              <Tooltip title="Reserved for upcoming GeoGPT and TSCOnline integration behavior.">
                <IconButton size="small" aria-label="Enable GeoGPT and TSCOnline co-work info">
                  <InfoOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <FormControlLabel
                sx={{ mr: 0 }}
                control={
                  <Switch
                    checked={state.user.settings.geogptAutoOpen}
                    onChange={() => actions.setGeoGPTAutoOpen(!state.user.settings.geogptAutoOpen)}
                    sx={{
                      "& .MuiSwitch-switchBase.Mui-checked": {
                        color: "#6693C9"
                      },
                      "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                        backgroundColor: "#6693C9",
                        opacity: 1
                      },
                      "& .MuiSwitch-track": {
                        backgroundColor: theme.palette.mode === "dark" ? "#5b6f89" : "#b7d0eb",
                        opacity: 1
                      }
                    }}
                  />
                }
                label="Open GeoGPT window automatically"
              />
              <Tooltip title="When enabled, creating a GeoGPT session immediately opens GeoGPT in a new tab.">
                <IconButton size="small" aria-label="Open GeoGPT window automatically info">
                  <InfoOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Box>

        <Divider sx={{ mb: 2 }} />

        <Box>
          <Typography variant="body2" color="text.secondary">
            You can also use the <strong>Start GeoGPT</strong> button in the profile dropdown to create a session with
            the same saved configuration.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button color="inherit" onClick={onClose}>
          Close
        </Button>
        <Button variant="contained" onClick={onGenerate}>
          Generate GeoGPT Session
        </Button>
      </DialogActions>
    </Dialog>
  );
});
