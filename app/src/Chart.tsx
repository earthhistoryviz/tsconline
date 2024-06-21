import { observer } from "mobx-react-lite";
import { useContext, useEffect, useRef } from "react";
import { context } from "./state";
import "./Chart.css";
import { CustomTooltip, GradientDiv, TSCPopupManager, TSCSvgComponent } from "./components";
import LoadingChart from "./LoadingChart";
import HorizontalRuleIcon from "@mui/icons-material/HorizontalRule";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import DownloadIcon from "@mui/icons-material/Download";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import ZoomOutMapIcon from "@mui/icons-material/ZoomOutMap";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import FileSaver from "file-saver";
import { TransformWrapper, TransformComponent, ReactZoomPanPinchContentRef } from "react-zoom-pan-pinch";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  IconButton,
  NativeSelect,
  Popover,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import React from "react";
import isValidFilename from "valid-filename";

export const Chart = observer(() => {
  const { state, actions } = useContext(context);
  const theme = useTheme();
  const transformContainerRef = useRef<ReactZoomPanPinchContentRef>(null);
  const step = 0.1;
  const minScale = 0.1;
  const maxScale = 8;

  const setChartAlignmentValues = () => {
    const container = transformContainerRef.current;
    if (!container) return;
    const content = document.getElementById("svg-display")?.getBoundingClientRect();
    const wrapper = document.getElementById("chart-transform-wrapper")?.getBoundingClientRect();
    if (!content || !wrapper) return;

    const wrapperMid = (wrapper.right - wrapper.left) / 2;
    const chartOffset = (content.right - content.left) / 2;
    actions.setChartTabMidX(wrapperMid - chartOffset);
    const zoomFitScaleVertical = (wrapper.bottom - wrapper.top) / (content.bottom - content.top);
    const zoomFitScaleHorizontal = (wrapper.right - wrapper.left) / (content.right - content.left);

    if (zoomFitScaleHorizontal < zoomFitScaleVertical) actions.setChartTabZoomFitScale(zoomFitScaleHorizontal);
    else actions.setChartTabZoomFitScale(zoomFitScaleVertical);
  };

  useEffect(() => {
    const container = transformContainerRef.current;
    if (!container) return;

    setChartAlignmentValues();

    container.setTransform(state.chartTab.midX, 0, state.chartTab.scale, 0);

    const windowResizeListenerWrapper = () => {
      setChartAlignmentValues();
    };

    const eventListenerWrapper = (evt: KeyboardEvent) => {
      if ((evt.metaKey || evt.ctrlKey) && evt.code === "Equal") {
        evt.preventDefault();
        if (state.chartTab.scale < maxScale) {
          container.zoomIn(step, 0);
          actions.setChartTabScale(state.chartTab.scale + step);
        }
      }
      if ((evt.metaKey || evt.ctrlKey) && evt.code === "Minus") {
        evt.preventDefault();
        if (state.chartTab.scale > minScale) {
          container.zoomOut(step, 0);
          actions.setChartTabScale(state.chartTab.scale - step);
        }
      }
    };
    document.addEventListener("keydown", eventListenerWrapper);
    window.addEventListener("resize", windowResizeListenerWrapper);
    return () => {
      document.removeEventListener("keydown", eventListenerWrapper);
      window.removeEventListener("resize", windowResizeListenerWrapper);
    };
  }, [state.chartContent]);

  const [downloadOpen, setDownloadOpen] = React.useState(false);

  const handleDownloadOpen = () => {
    setDownloadOpen(true);
  };

  const handleDownloadClose = () => {
    setDownloadOpen(false);
  };

  const handleFilenameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    actions.setChartTabDownloadFilename(e.target.value);
    console.log(state.chartTab.downloadFilename);
  };

  const downloadSvg = (filename: string) => {
    const blob = new Blob([state.chartContent]);
    FileSaver.saveAs(blob, filename + ".svg");
  };

  const DownloadButton = () => {
    return (
      <div>
        <CustomTooltip title="Download SVG">
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
    const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(null);

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
      setAnchorEl(null);
    };

    const open = Boolean(anchorEl);
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
          slotProps={{
            popper: {
              modifiers: [
                {
                  name: "offset",
                  options: {
                    offset: [0, -10]
                  }
                }
              ]
            }
          }}>
          <IconButton onClick={handleClick}>
            <HelpOutlineIcon />
          </IconButton>
        </Tooltip>
        <Popover
          open={open}
          anchorEl={anchorEl}
          onClose={handleClose}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "center"
          }}>
          <Typography sx={{ p: 1 }}>ctrl/⊞/⌘ + Minus (-) - Zoom out</Typography>
          <Typography sx={{ p: 1 }}>ctrl/⊞/⌘ + Plus (+) - Zoom in</Typography>
        </Popover>
      </div>
    );
  };

  const OptionsBar = () => {
    const container = transformContainerRef.current;
    if (!container) return;
    return (
      <div className="options-bar">
        <div className="flex-row">
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
          <CustomTooltip title="Reset Transformation">
            <IconButton
              onClick={() => {
                container.setTransform(state.chartTab.midX, 0, 1);
                actions.setChartTabScale(1);
              }}>
              <RestartAltIcon />
            </IconButton>
          </CustomTooltip>
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
          <CustomTooltip title="Timeline On/Off">
            <IconButton onClick={() => actions.setChartTimelineEnabled(!state.chartTab.chartTimelineEnabled)}>
              <HorizontalRuleIcon className="timeline-button" />
            </IconButton>
          </CustomTooltip>
        </div>
        <div className="flex-row">
          <DownloadButton />
          <HelpButton />
        </div>
      </div>
    );
  };
  return (
    <div
      style={{
        height: "94vh",
        width: "100%",
        display: "flex",
        justifyContent: "center",
        alignContent: "center"
      }}>
      {state.chartLoading ? (
        <LoadingChart />
      ) : state.madeChart ? (
        <div id="wrapper" className="chart-and-options-bar">
          <OptionsBar />
          <div id="chart-transform-wrapper">
            <TransformWrapper
              ref={transformContainerRef}
              wheel={{ wheelDisabled: true }}
              panning={{ wheelPanning: true }}
              limitToBounds={false}
              minScale={minScale}
              maxScale={maxScale}>
              <TransformComponent wrapperStyle={{ height: "84vh", width: "80vw", border: "solid" }}>
                <TSCSvgComponent chartContent={state.chartContent} />
              </TransformComponent>
            </TransformWrapper>
          </div>
        </div>
      ) : (
        <div className="loading-container">
          <Typography className="loading"> You have not made a chart yet </Typography>
        </div>
      )}
      <TSCPopupManager />
    </div>
  );
});
