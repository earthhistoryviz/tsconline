import { observer } from "mobx-react-lite";
import { useContext } from "react";
import { context } from "./state";
import { useTheme } from "@mui/material/styles";
import "./Chart.css";
import { CustomTooltip } from "./components";
import HorizontalRuleIcon from "@mui/icons-material/HorizontalRule";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import DownloadIcon from "@mui/icons-material/Download";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import ZoomOutMapIcon from "@mui/icons-material/ZoomOutMap";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import SettingsIcon from "@mui/icons-material/Settings";
import FileSaver from "file-saver";
import { ReactZoomPanPinchContentRef } from "react-zoom-pan-pinch";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  IconButton,
  NativeSelect,
  Switch,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import React from "react";
import isValidFilename from "valid-filename";

interface OptionsBarProps {
  container: ReactZoomPanPinchContentRef | null;
  step: number;
  minScale: number;
  maxScale: number;
}

export const OptionsBar: React.FC<OptionsBarProps> = observer(({ container, step, minScale, maxScale }) => {
  const { state, actions } = useContext(context);
  const theme = useTheme();
  if (!container) return;
  const OptionsButton = () => {
    const [open, setOpen] = React.useState<boolean>(false);
    const handleClick = () => {
      setOpen(!open);
    };
    const handleSwitch = () => {
      actions.setChartTabEnableScrollZoom(!state.chartTab.enableScrollZoom);
    };
    return (
      <div>
        <CustomTooltip title="Options">
          <IconButton id="option-button" onClick={handleClick}>
            <SettingsIcon />
          </IconButton>
        </CustomTooltip>
        <Box
          sx={{
            borderRadius: 1,
            bgcolor: theme.palette.background.default,
            marginTop: "1px",
            marginLeft: "1px"
          }}
          style={{ display: open ? "flex" : "none", position: "absolute", zIndex: "100" }}>
          <div className="flex-row">
            <Typography sx={{ p: 2 }}>Zoom on Scroll</Typography>
            <div style={{ margin: "auto" }}>
              <Switch defaultChecked={state.chartTab.enableScrollZoom} onChange={handleSwitch} color="info" />
            </div>
          </div>
        </Box>
      </div>
    );
  };
  const ZoomInButton = () => {
    return (
      <CustomTooltip title="Zoom In">
        <IconButton
          onClick={() => {
            if (state.chartTab.scale < maxScale) {
              container.zoomIn(step, 0);
              actions.setChartTabScale(state.chartTab.scale + step);
            }
          }}>
          <ZoomInIcon />
        </IconButton>
      </CustomTooltip>
    );
  };
  const ZoomOutButton = () => {
    return (
      <CustomTooltip title="Zoom Out">
        <IconButton
          onClick={() => {
            if (state.chartTab.scale > minScale) {
              container.zoomOut(step, 0);
              actions.setChartTabScale(state.chartTab.scale - step);
            }
          }}>
          <ZoomOutIcon />
        </IconButton>
      </CustomTooltip>
    );
  };
  const ResetButton = () => {
    return (
      <CustomTooltip title="Reset Transformation">
        <IconButton
          onClick={() => {
            container.setTransform(state.chartTab.midX, 0, 1);
            actions.setChartTabScale(1);
          }}>
          <RestartAltIcon />
        </IconButton>
      </CustomTooltip>
    );
  };
  const ZoomFitButton = () => {
    return (
      <CustomTooltip title="Zoom Fit">
        <IconButton
          onClick={() => {
            const content = document.getElementById("svg-display")?.getBoundingClientRect();
            const wrapper = document.getElementById("chart-transform-wrapper")?.getBoundingClientRect();
            if (!content || !wrapper) return;
            const newScale = (wrapper.bottom - wrapper.top) / (content.bottom - content.top);
            //scale is correct, only need to center
            if (newScale === 1) {
              container.centerView();
            }
            //scale is incorrect
            else {
              const wrapperMid = (wrapper.right - wrapper.left) / 2;
              const chartOffset = ((content.right - content.left) / 2) * newScale;
              container.setTransform(wrapperMid - chartOffset, 0, state.chartTab.zoomFitScale);
              actions.setChartTabScale(state.chartTab.zoomFitScale);
            }
          }}>
          <ZoomOutMapIcon />
        </IconButton>
      </CustomTooltip>
    );
  };

  const TimelineButton = () => {
    return (
      <CustomTooltip title="Timeline On/Off">
        <IconButton onClick={() => actions.setChartTimelineEnabled(!state.chartTab.chartTimelineEnabled)}>
          <HorizontalRuleIcon className="timeline-button" />
        </IconButton>
      </CustomTooltip>
    );
  };
  const DownloadButton = () => {
    const [downloadOpen, setDownloadOpen] = React.useState(false);

    const handleDownloadOpen = () => {
      setDownloadOpen(true);
    };

    const handleDownloadClose = () => {
      setDownloadOpen(false);
    };
    const handleFilenameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      actions.setChartTabDownloadFilename(e.target.value);
    };

    const downloadSvg = (filename: string) => {
      const blob = new Blob([state.chartContent]);
      FileSaver.saveAs(blob, filename + ".svg");
    };
    return (
      <div>
        <CustomTooltip title="Download Chart">
          <IconButton onClick={() => handleDownloadOpen()}>
            <DownloadIcon />
          </IconButton>
        </CustomTooltip>
        <Dialog
          open={downloadOpen}
          onClose={handleDownloadClose}
          PaperProps={{
            component: "form",
            onSubmit: (e: React.FormEvent<HTMLFormElement>) => {
              e.preventDefault(); // to stop website from reloading
              if (!isValidFilename(state.chartTab.downloadFilename)) {
                actions.pushSnackbar("Filename is not valid", "warning");
                return;
              }
              switch (state.chartTab.downloadFiletype) {
                case "svg":
                  downloadSvg(state.chartTab.downloadFilename);
                  break;
                case "pdf":
                  break;
                case "png":
              }
              handleDownloadClose();
            }
          }}>
          <DialogTitle>Download Chart</DialogTitle>
          <DialogContent>
            <DialogContentText>Please enter the filename and select filetype.</DialogContentText>
            <div className="flex-row">
              <TextField
                defaultValue={state.chartTab.downloadFilename}
                autoFocus
                required
                margin="normal"
                type="text"
                size="small"
                fullWidth
                variant="outlined"
                onChange={handleFilenameChange}
              />
              <FormControl sx={{ m: 1, minWidth: 120 }}>
                <NativeSelect
                  defaultValue={state.chartTab.downloadFiletype}
                  inputProps={{
                    name: "filetype",
                    id: "uncontrolled-native"
                  }}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                    const filetype = e.target.value;
                    if (filetype !== "svg" && filetype !== "pdf" && filetype !== "png") {
                      return;
                    }
                    actions.setChartTabDownloadFiletype(filetype);
                  }}>
                  <option value={"svg"}>.svg</option>
                  {/* 
                    TODO: implement these
                    <option value={"pdf"}>.pdf</option>
                    <option value={"png"}>.png</option> */}
                </NativeSelect>
              </FormControl>
            </div>
          </DialogContent>
          <DialogActions>
            <Button color="warning" onClick={handleDownloadClose}>
              Cancel
            </Button>
            <Button color="success" type="submit">
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    );
  };

  const HelpButton = () => {
    return (
      <div>
        <Tooltip
          title={
            <div>
              ctrl/⊞/⌘ + Minus (-) - Zoom out
              <br />
              ctrl/⊞/⌘ + Plus (+) - Zoom in
            </div>
          }
          arrow
          PopperProps={{
            modifiers: [
              {
                name: "offset",
                options: {
                  offset: [0, -10]
                }
              }
            ]
          }}>
          <IconButton onClick={() => {}}>
            <HelpOutlineIcon />
          </IconButton>
        </Tooltip>
      </div>
    );
  };
  return (
    <div className="options-bar">
      <div className="flex-row">
        <OptionsButton />
        <ZoomInButton />
        <ZoomOutButton />
        <ResetButton />
        <ZoomFitButton />
        <TimelineButton />
      </div>
      <div className="flex-row">
        <DownloadButton />
        <HelpButton />
      </div>
    </div>
  );
});
