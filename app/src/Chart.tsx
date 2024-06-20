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
import { IconButton, Popover, Typography } from "@mui/material";
import React from "react";

export const Chart = observer(function () {
  const { state, actions } = useContext(context);
  const theme = useTheme();
  const transformContainerRef = useRef<ReactZoomPanPinchContentRef>(null);
  const step = 0.1;
  const minScale = 0.1;
  const maxScale = 8;
  const downloadSvg = () => {
    const blob = new Blob([state.chartContent]);
    FileSaver.saveAs(blob, "chart.svg");
  };

  const setChartAlignmentValues = () => {
    const container = transformContainerRef.current;
    if (!container) return;
    const content = document.getElementById("svg-display")?.getBoundingClientRect();
    const wrapper = document.getElementsByClassName("react-transform-wrapper")[0].getBoundingClientRect();
    if (!content) return;

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

  const HelpButton = () => {
    const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(null);

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
      setAnchorEl(null);
    };

    const open = Boolean(anchorEl);
    const id = open ? "simple-popover" : undefined;

    return (
      <div>
        <CustomTooltip title="Help">
          <IconButton onClick={handleClick}>
            <HelpOutlineIcon />
          </IconButton>
        </CustomTooltip>
        <Popover
          id={id}
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
        <div className="options-bar-left">
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
                const wrapper = document.getElementsByClassName("react-transform-wrapper")[0].getBoundingClientRect();
                if (!content) return;
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
        <div className="options-bar-right">
          <CustomTooltip title="Download SVG">
            <IconButton onClick={() => downloadSvg()}>
              <DownloadIcon />
            </IconButton>
          </CustomTooltip>
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
      ) : (
        <div className="loading-container">
          <Typography className="loading"> You have not made a chart yet </Typography>
        </div>
      )}
      <TSCPopupManager />
    </div>
  );
});
