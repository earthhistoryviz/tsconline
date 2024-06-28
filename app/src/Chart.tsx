import { observer } from "mobx-react-lite";
import { useContext, useEffect, useRef } from "react";
import { context } from "./state";
import "./Chart.css";
import { TSCPopupManager, TSCSvgComponent } from "./components";
import LoadingChart from "./LoadingChart";
import { TransformWrapper, TransformComponent, ReactZoomPanPinchContentRef } from "react-zoom-pan-pinch";
import { OptionsBar } from "./ChartOptionsBar";
import { Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";

export const Chart = observer(() => {
  const { state, actions } = useContext(context);
  const theme = useTheme();
  const transformContainerRef = useRef<ReactZoomPanPinchContentRef>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const step = 0.1;
  const minScale = 0.1;
  const maxScale = 8;

  const setChartAlignmentValues = () => {
    const container = transformContainerRef.current;
    const content = svgContainerRef.current;
    if (!container || !content) return;

    const containerRect = container.instance.wrapperComponent?.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();
    if (!containerRect || !contentRect) return;

    const originalHeight = (contentRect.bottom - contentRect.top) / container.instance.transformState.scale;
    const originalWidth = (contentRect.right - contentRect.left) / container.instance.transformState.scale;
    const zoomFitY = (containerRect.bottom - containerRect.top) / originalHeight;
    const zoomFitX = (containerRect.right - containerRect.left) / originalWidth;

    if (zoomFitX < zoomFitY) {
      actions.setChartTabZoomFitScale(zoomFitX);
      actions.setChartTabZoomFitMidCoord(
        (containerRect.bottom - containerRect.top) / 2 - (originalHeight * state.chartTab.zoomFitScale) / 2
      );
      state.chartTab.zoomFitMidCoordIsX = false;
    } else {
      actions.setChartTabZoomFitScale(zoomFitY);
      actions.setChartTabZoomFitMidCoord(
        (containerRect.right - containerRect.left) / 2 - (originalWidth * state.chartTab.zoomFitScale) / 2
      );
      state.chartTab.zoomFitMidCoordIsX = true;
    }

    actions.setChartTabResetMidX((containerRect.right - containerRect.left) / 2 - originalWidth / 2);
  };

  useEffect(() => {
    const container = transformContainerRef.current;
    if (!container) return;

    setChartAlignmentValues();

    if (state.chartTab.zoomFitMidCoordIsX) {
      container.setTransform(state.chartTab.zoomFitMidCoord, 0, state.chartTab.zoomFitScale, 0);
    } else {
      container.setTransform(0, state.chartTab.zoomFitMidCoord, state.chartTab.zoomFitScale, 0);
    }
    actions.setChartTabScale(state.chartTab.zoomFitScale);

    //small update
    actions.setChartTabEnableScrollZoom(!state.chartTab.enableScrollZoom);
    actions.setChartTabEnableScrollZoom(!state.chartTab.enableScrollZoom);

    const windowResizeListenerWrapper = () => {
      setChartAlignmentValues();
    };

    const horizontalScrollWrapper = (event: WheelEvent) => {
      if (event.shiftKey) {
        //stop container from using default wheel event
        container.instance.wrapperComponent?.removeEventListener("wheel", container.instance.onWheelPanning);
        const e = new WheelEvent("wheel", { deltaX: event.deltaX !== 0 ? event.deltaX : event.deltaY, deltaY: 0 });
        container.instance.onWheelPanning(e);
        //restore default wheel event
        container.instance.wrapperComponent?.addEventListener("wheel", container.instance.onWheelPanning);
      }
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
    //zoom in and zoom out using keyboard
    document.addEventListener("keydown", eventListenerWrapper);
    //set alignment values
    window.addEventListener("resize", windowResizeListenerWrapper);
    //horizontal scrolling
    if (container.instance.wrapperComponent)
      container.instance.wrapperComponent.addEventListener("wheel", horizontalScrollWrapper);
    return () => {
      document.removeEventListener("keydown", eventListenerWrapper);
      window.removeEventListener("resize", windowResizeListenerWrapper);
      if (container.instance.wrapperComponent)
        container.instance.wrapperComponent.removeEventListener("wheel", horizontalScrollWrapper);
    };
  }, [state.chartContent]);

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
          {transformContainerRef?.current && svgContainerRef?.current && (
            <OptionsBar
              transformRef={transformContainerRef}
              svgRef={svgContainerRef}
              step={step}
              minScale={minScale}
              maxScale={maxScale}
            />
          )}
          <div id="chart-transform-wrapper">
            <TransformWrapper
              ref={transformContainerRef}
              wheel={{ wheelDisabled: !state.chartTab.enableScrollZoom }}
              panning={{ wheelPanning: !state.chartTab.enableScrollZoom }}
              limitToBounds={true}
              minScale={minScale}
              maxScale={maxScale}
              disablePadding={true}>
              <TransformComponent
                wrapperStyle={{
                  height: "84vh",
                  width: "80vw",
                  border: "2px solid",
                  borderColor: theme.palette.divider
                }}>
                <TSCSvgComponent svgContainerRef={svgContainerRef} chartContent={state.chartContent} />
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
