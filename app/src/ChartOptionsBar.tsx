import { observer } from "mobx-react-lite";
import { useContext } from "react";
import { context } from "./state";
import { useTheme } from "@mui/material/styles";
import "./Chart.css";
import { CustomTooltip, TSCButton } from "./components";
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
  Typography
} from "@mui/material";
import React from "react";
import isValidFilename from "valid-filename";

interface OptionsBarProps {
  transformRef: React.RefObject<ReactZoomPanPinchContentRef>;
  svgRef: React.RefObject<HTMLDivElement>;
  step: number;
  minScale: number;
  maxScale: number;
}

export const OptionsBar: React.FC<OptionsBarProps> = observer(({ transformRef, svgRef, step, minScale, maxScale }) => {
  const { state, actions } = useContext(context);
  const theme = useTheme();

  const container = transformRef.current;
  const content = svgRef.current;
  if (!container || !content) {
    return;
  }
  //workaround for unexpected behavior
  //conditions for behavior: limitToBounds = true, zoomToScroll = false
  //after reset transformation or zoom fit, panning with touchpad jarringly misaligns chart from center
  //this doesn't happen if I do the function below, which cycles the zoom scroll function of the transform wrapper
  //soft requirement for this workaround: animation time for reset or fit = 0
  const smallUpdate = () => {
    actions.setChartTabEnableScrollZoom(!state.chartTab.enableScrollZoom);
    actions.setChartTabEnableScrollZoom(!state.chartTab.enableScrollZoom);
  };
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
              console.log(container.instance.transformState);
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
            while (state.chartTab.scale <= 0 && step > 0) {
              container.zoomIn(step, 0);
              actions.setChartTabScale(state.chartTab.scale + step);
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
            console.log(state.chartTab.resetMidX);
            container.setTransform(state.chartTab.resetMidX, 0, 1, 0);
            actions.setChartTabScale(1);
            smallUpdate();
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
            if (state.chartTab.zoomFitMidCoordIsX) {
              container.setTransform(state.chartTab.zoomFitMidCoord, 0, state.chartTab.zoomFitScale, 0);
            } else {
              container.setTransform(0, state.chartTab.zoomFitMidCoord, state.chartTab.zoomFitScale, 0);
            }
            actions.setChartTabScale(state.chartTab.zoomFitScale);
            smallUpdate();
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
          disableRestoreFocus
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
            <div className="flex-row chart-download-button">
              <TextField
                defaultValue={state.chartTab.downloadFilename}
                autoFocus
                required
                margin="normal"
                type="text"
                size="small"
                fullWidth
                label="filename"
                variant="standard"
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
            <Button variant="outlined" onClick={handleDownloadClose}>
              Cancel
            </Button>
            <TSCButton component="label" variant="text" sx={{ bgcolor: "button.main" }} type="submit">
              load
            </TSCButton>
          </DialogActions>
        </Dialog>
      </div>
    );
  };

  const HelpButton = () => {
    return (
      <div>
        <CustomTooltip
          title={
            <div>
              ctrl/⊞/⌘ + Minus (-) - Zoom out
              <br />
              ctrl/⊞/⌘ + Plus (+) - Zoom in
              <br />
              Shift + Scroll - Horizontal Scroll
            </div>
          }>
          <IconButton>
            <HelpOutlineIcon />
          </IconButton>
        </CustomTooltip>
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
