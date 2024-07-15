import { observer } from "mobx-react-lite";
import { useContext } from "react";
import { context } from "./state";
import { useTheme } from "@mui/material/styles";
import "./Chart.css";
import { CustomTooltip, TSCButton } from "./components";
import HorizontalRuleIcon from "@mui/icons-material/HorizontalRule";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
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
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography
} from "@mui/material";
import React from "react";
import isValidFilename from "valid-filename";
import { DownloadPdfCompleteMessage, DownloadPdfMessage } from "./types";
import { TSCLoadingButton } from "./components/TSCLoadingButton";
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
            border: "2px solid",
            borderColor: theme.palette.divider,
            bgcolor: theme.palette.backgroundColor.main
          }}
          style={{ display: open ? "flex" : "none", position: "absolute", zIndex: "100" }}>
          <div className="flex-row">
            <Typography sx={{ p: 2 }}>Zoom on Scroll</Typography>
            <div style={{ margin: "auto" }}>
              <Switch
                inputProps={{ "aria-label": "controlled" }}
                defaultChecked={state.chartTab.enableScrollZoom}
                onChange={handleSwitch}
                color="info"
              />
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
  const DownloadButton = observer(() => {
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

    async function svgToImageURI(svgString: string, width: number, height: number): Promise<string> {
      return new Promise((resolve, reject) => {
        const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(svgBlob);

        const image = new Image();
        image.width = width;
        image.height = height;
        image.src = url;

        image.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject("Canvas context not found");
            return;
          }

          const pixelRatio = 3;
          canvas.width = width * pixelRatio;
          canvas.height = height * pixelRatio;
          ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
          ctx.drawImage(image, 0, 0);

          URL.revokeObjectURL(url);
          const imgURI = canvas.toDataURL();
          canvas.remove();
          resolve(imgURI);
        };
        image.onerror = () => {
          reject("Failed to load image");
        };
      });
    }

    async function downloadChart() {
      actions.setChartTabIsSavingChart(true);
      if (state.chartTab.downloadFiletype === "svg") {
        const blob = new Blob([state.chartContent]);
        FileSaver.saveAs(blob, state.chartTab.downloadFilename + ".svg");
        actions.pushSnackbar("Saved Chart as SVG!", "success");
        actions.setChartTabIsSavingChart(false);
      } else {
        const svgNode = svgRef.current?.children[0];
        if (!svgNode) return;
        if (!svgNode.getAttribute("height") || !svgNode.getAttribute("width")) return;
        //height and width in cm, so convert to pixels
        const svgHeight = Number(svgNode.getAttribute("height")!.slice(0, -2)) * 37.795;
        const svgWidth = Number(svgNode.getAttribute("width")!.slice(0, -2)) * 37.795;
        const svgString = state.chartContent;
        const svgBlob = new Blob([svgString], {
          type: "image/svg+xml;charset=utf-8"
        });

        const DOMURL = window.URL || window.webkitURL || window;
        const url = DOMURL.createObjectURL(svgBlob);
        let imgURI = "";
        try {
          imgURI = await svgToImageURI(url, svgWidth, svgHeight);
        } catch (e) {
          console.error("Promise rejected with:", e);
          actions.pushSnackbar("Error downloading chart, please try again.", "warning");
          return;
        }

        if (state.chartTab.downloadFiletype === "pdf") {
          const downloadWorker: Worker = new Worker(new URL("./util/workers/download-pdf.ts", import.meta.url), {
            type: "module"
          });
          const message: DownloadPdfMessage = { imgURI: imgURI, height: svgHeight, width: svgWidth };
          downloadWorker.postMessage(message);
          downloadWorker.onmessage = function (e: MessageEvent<DownloadPdfCompleteMessage>) {
            const { status, value } = e.data;
            if (status === "success" && value) {
              FileSaver.saveAs(value, state.chartTab.downloadFilename + ".pdf");
              actions.pushSnackbar("Saved Chart as PDF!", "success");
            } else {
              actions.pushSnackbar("Saving Chart Timed Out", "info");
            }
            actions.setChartTabIsSavingChart(false);
            downloadWorker.terminate();
          };
        } else if (state.chartTab.downloadFiletype === "png") {
          const a = document.createElement("a");
          a.download = state.chartTab.downloadFilename + ".png"; // filename
          a.target = "_blank";
          a.href = imgURI;
          a.click();
          actions.pushSnackbar("Saved Chart as PNG!", "success");
          actions.setChartTabIsSavingChart(false);
          a.remove();
        }
      }
    }
    return (
      <div>
        <TSCButton buttonType="gradient" onClick={() => handleDownloadOpen()}>
          Save Chart
        </TSCButton>
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
              downloadChart();
            }
          }}>
          <DialogTitle>Save Chart</DialogTitle>
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
              <Box sx={{ minWidth: 120 }}>
                <FormControl fullWidth margin="normal">
                  <Select
                    variant="standard"
                    size="small"
                    value={state.chartTab.downloadFiletype}
                    label="Age"
                    onChange={(e) => {
                      actions.setChartTabDownloadFiletype(e.target.value as "svg" | "png" | "pdf");
                    }}>
                    <MenuItem value={"svg"}>.svg</MenuItem>
                    <MenuItem value={"pdf"}>.pdf</MenuItem>
                    <MenuItem value={"png"}>.png</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </div>
          </DialogContent>
          <DialogActions>
            <Button variant="outlined" onClick={handleDownloadClose}>
              Exit
            </Button>
            <TSCLoadingButton loading={state.chartTab.isSavingChart} type="submit">
              Save
            </TSCLoadingButton>
          </DialogActions>
        </Dialog>
      </div>
    );
  });

  const HelpButton = () => {
    return (
      <div>
        <CustomTooltip
          title={
            <>
              ctrl/⊞/⌘ + Minus (-) - Zoom out
              <br />
              ctrl/⊞/⌘ + Plus (+) - Zoom in
              <br />
              Shift + Scroll - Horizontal Scroll
            </>
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
        <DownloadButton />
      </div>
      <div className="flex-row">
        <HelpButton />
      </div>
    </div>
  );
});
