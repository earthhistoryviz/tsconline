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
  Divider,
  Collapse
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import SettingsIcon from "@mui/icons-material/Settings";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
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
  const [showAutoOpenDetails, setShowAutoOpenDetails] = useState(false);
  const [showCoWorkDetails, setShowCoWorkDetails] = useState(false);
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
            <Typography variant="subtitle1" fontWeight={600}>
              Current session ID
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

        <Box>
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
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
              <Button
                size="small"
                color="inherit"
                onClick={() => setShowAutoOpenDetails((prev) => !prev)}
                endIcon={showAutoOpenDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}>
                Read More
              </Button>
            </Box>
            <Collapse in={showAutoOpenDetails} timeout="auto" unmountOnExit>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, ml: 1 }}>
                When enabled, creating a GeoGPT session will immediately open a new GeoGPT tab.
              </Typography>
            </Collapse>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
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
              <Button
                size="small"
                color="inherit"
                onClick={() => setShowCoWorkDetails((prev) => !prev)}
                endIcon={showCoWorkDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}>
                Read More
              </Button>
            </Box>
            <Collapse in={showCoWorkDetails} timeout="auto" unmountOnExit>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, ml: 1 }}>
                This option is for future GeoGPT / TSCOnline integrations. It does not change current behavior yet.
              </Typography>
            </Collapse>
          </Box>
        </Box>

        <Divider sx={{ mb: 2 }} />

        <Box>
          <Typography variant="body2" gutterBottom>
            This panel controls how GeoGPT and TSCOnline work together. Your GeoGPT session ID is copied automatically
            when a session is generated, so you can paste it into GeoGPT and link it to your account.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Once you&apos;ve changed settings, press the button below to generate a GeoGPT session ID with these
            settings. You can also use the GeoGPT button in the profile dropdown to create a session with the same saved
            configuration.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button color="inherit" onClick={onClose}>
          Close
        </Button>
        <Button variant="contained" onClick={onGenerate}>
          Generate GeoGPT sessionID with these settings
        </Button>
      </DialogActions>
    </Dialog>
  );
});
