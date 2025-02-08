import { observer } from "mobx-react-lite";
import React, { Children, createContext, useContext, useEffect, useRef, useState } from "react";
import "./Chart.css";
import { TSCPopupManager, TSCSvgComponent } from "./components";
import LoadingChart from "./LoadingChart";
import { TransformWrapper, TransformComponent, ReactZoomPanPinchContentRef } from "react-zoom-pan-pinch";
import { OptionsBar } from "./ChartOptionsBar";
import { Box, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useTranslation } from "react-i18next";
import { ChartContextType } from "./types";
import { context } from "./state";
import { defaultChartTabState } from "./constants";
import { cloneDeep } from "lodash";

export const ChartContext = createContext<ChartContextType>({
  chartTabState: cloneDeep(defaultChartTabState)
});

type ChartProps = {
  Component: React.FC<{ ref: React.RefObject<HTMLDivElement> }>;
  style?: React.CSSProperties;
};

export const Chart: React.FC<ChartProps> = observer(({ Component, style }) => {
  const theme = useTheme();
  const { chartTabState } = useContext(ChartContext);
  const { chartContent, chartZoomSettings, madeChart, chartLoading } = chartTabState;
  const { actions } = useContext(context);
  const transformContainerRef = useRef<ReactZoomPanPinchContentRef>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const [setup, setSetup] = useState(false); // used to setup the chart alignment values
  const step = 0.1;
  const minScale = 0.1;
  const maxScale = 8;
  const { scale, zoomFitScale, zoomFitMidCoord, zoomFitMidCoordIsX, enableScrollZoom } = chartZoomSettings;

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
      const midCoord = (containerRect.bottom - containerRect.top) / 2 - (originalHeight * zoomFitX) / 2;
      actions.setChartTabZoomSettings(chartZoomSettings, {
        zoomFitScale: zoomFitX,
        zoomFitMidCoord: midCoord,
        zoomFitMidCoordIsX: false
      });
    } else {
      const midCoord = (containerRect.right - containerRect.left) / 2 - (originalWidth * zoomFitY) / 2;
      actions.setChartTabZoomSettings(chartZoomSettings, {
        zoomFitScale: zoomFitY,
        zoomFitMidCoord: midCoord,
        zoomFitMidCoordIsX: true
      });
    }
    actions.setChartTabZoomSettings(chartZoomSettings, {
      resetMidX: (containerRect.right - containerRect.left) / 2 - originalWidth / 2
    });
  };

  // we need to setup the chart alignment values when the chart content changes
  // if the user generates again on the chart tab, we have to toggle the change by making sure to set setup false
  useEffect(() => {
    setSetup(false);
    const container = transformContainerRef.current;
    const content = svgContainerRef.current;
    if (!container || !content) return;
    setChartAlignmentValues();
    setSetup(true);
  }, [chartContent, transformContainerRef.current, svgContainerRef.current, svgContainerRef, transformContainerRef]);

  useEffect(() => {
    const container = transformContainerRef.current;
    if (!container) return;

    if (zoomFitMidCoordIsX) {
      container.setTransform(zoomFitMidCoord, 0, zoomFitScale, 0);
    } else {
      container.setTransform(0, zoomFitMidCoord, zoomFitScale, 0);
    }
    actions.setChartTabZoomSettings(chartZoomSettings, { scale: zoomFitScale });

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
        if (scale < maxScale) {
          container.zoomIn(step, 0);
          actions.setChartTabZoomSettings(chartZoomSettings, { scale: scale + step });
        }
      }
      if ((evt.metaKey || evt.ctrlKey) && evt.code === "Minus") {
        evt.preventDefault();
        if (scale > minScale) {
          container.zoomOut(step, 0);
          actions.setChartTabZoomSettings(chartZoomSettings, { scale: scale - step });
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
  }, [
    setup,
    chartContent,
    transformContainerRef.current,
    transformContainerRef,
    zoomFitMidCoord,
    zoomFitMidCoordIsX,
    zoomFitScale
  ]);
  const { t } = useTranslation();

  return (
    <Box className="chart-container">
      {chartLoading ? (
        <LoadingChart />
      ) : madeChart ? (
        <div className="chart-and-options-bar">
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
              wheel={{ wheelDisabled: !enableScrollZoom }}
              panning={{ wheelPanning: !enableScrollZoom }}
              limitToBounds={true}
              minScale={minScale}
              maxScale={maxScale}
              disablePadding={true}>
              <TransformComponent
                wrapperStyle={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  overflow: "hidden",
                  border: "2px solid",
                  borderColor: theme.palette.divider,
                  visibility: !setup ? "hidden" : "visible", // prevent flashing of chart when generating
                  ...style
                }}>
                {<Component ref={svgContainerRef} />}
              </TransformComponent>
            </TransformWrapper>
          </div>
        </div>
      ) : (
        <div className="loading-container">
          <Typography className="loading"> {t("chart.no-chart-yet")} </Typography>
        </div>
      )}
      <TSCPopupManager />
    </Box>
  );
});

export const ChartTab: React.FC = observer(() => {
  const { state } = useContext(context);
  return (
    <ChartContext.Provider value={{ chartTabState: state.chartTab.state }}>
      <Box className="chart-tab">
        <Chart Component={TSCSvgComponent} />
      </Box>
    </ChartContext.Provider>
  );
});
