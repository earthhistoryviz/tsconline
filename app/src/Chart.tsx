import { observer } from "mobx-react-lite";
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import "./Chart.css";
import { TSCPopupManager, TSCSvgComponent } from "./components";
import LoadingChart from "./LoadingChart";
import {
  TransformWrapper,
  TransformComponent,
  ReactZoomPanPinchContentRef,
  ReactZoomPanPinchRef
} from "react-zoom-pan-pinch";
import { OptionsBar } from "./ChartOptionsBar";
import { Box, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useTranslation } from "react-i18next";
import { ChartContextType } from "./types";
import { context } from "./state";
import { defaultChartTabState } from "./constants";
import { cloneDeep } from "lodash";
import TimeLine from "./assets/icons/axes=one.svg";

export const ChartContext = createContext<ChartContextType>({
  chartTabState: cloneDeep(defaultChartTabState)
});

type ChartProps = {
  Component: React.FC<{ ref: React.RefObject<HTMLDivElement> }>;
  refList?: React.RefObject<HTMLDivElement>[];
  style?: React.CSSProperties;
  disableDoubleClick?: boolean;
};

export const Chart: React.FC<ChartProps> = observer(({ Component, style, refList, disableDoubleClick = false }) => {
  const theme = useTheme();
  const { chartTabState } = useContext(ChartContext);
  const { chartContent, chartZoomSettings, madeChart, chartLoading } = chartTabState;
  const { actions } = useContext(context);
  const transformContainerRef = useRef<ReactZoomPanPinchContentRef>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const [chartAlignmentInitialized, setChartAlignmentInitialized] = useState(false); // used to make sure the chart alignment values are setup before we try to use them
  const step = 0.1;
  const minScale = 0.1;
  const maxScale = 2;
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
        zoomFitMidCoordIsX: false,
        resetMidX: (containerRect.right - containerRect.left) / 2 - originalWidth / 2
      });
    } else {
      const midCoord = (containerRect.right - containerRect.left) / 2 - (originalWidth * zoomFitY) / 2;
      actions.setChartTabZoomSettings(chartZoomSettings, {
        zoomFitScale: zoomFitY,
        zoomFitMidCoord: midCoord,
        zoomFitMidCoordIsX: true,
        resetMidX: (containerRect.right - containerRect.left) / 2 - originalWidth / 2
      });
    }
  };
  useEffect(() => {
    const container = transformContainerRef.current;
    if (!container) return;
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
  }, []);

  // we need to setup the chart alignment values when the chart content changes
  // if the user generates again on the chart tab, we have to toggle the change by making sure to set setup false
  useEffect(() => {
    if (!chartContent || !madeChart || !svgContainerRef?.current) return;
    setChartAlignmentValues();
  }, [chartContent, madeChart, svgContainerRef?.current]);

  useEffect(() => {
    const container = transformContainerRef.current;
    if (!container) return;
    if (zoomFitMidCoordIsX) {
      container.setTransform(zoomFitMidCoord, 0, zoomFitScale, 0);
    } else {
      container.setTransform(0, zoomFitMidCoord, zoomFitScale, 0);
    }
    actions.setChartTabZoomSettings(chartZoomSettings, { scale: zoomFitScale });
    setTimeout(() => {
      setChartAlignmentInitialized(true);
    }, 10);
  }, [zoomFitMidCoord, zoomFitScale, zoomFitMidCoordIsX]);

  // resize the transform wrapper to fix alignment of the chart when any component resizes ( that we give it )
  useEffect(() => {
    if (!refList || refList.length == 0) return;
    const observers: ResizeObserver[] = [];
    for (const ref of refList) {
      if (!ref.current) continue;
      const resizeObserver = new ResizeObserver(() => {
        setChartAlignmentValues();
      });
      resizeObserver.observe(ref.current);
      observers.push(resizeObserver);
    }
    return () => {
      for (const observer of observers) {
        observer.disconnect();
      }
    };
  }, [refList?.map((ref) => ref.current)]);
  const { t } = useTranslation();

  const onZoom = (e: ReactZoomPanPinchRef) => {
    actions.setChartTabZoomSettings(chartZoomSettings, { scale: e.state.scale });
  };

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
              onZoom={onZoom}
              doubleClick={{ disabled: disableDoubleClick }}
              disablePadding={true}>
              <TransformComponent
                wrapperStyle={{
                  width: "100%",
                  height: "100%",
                  maxWidth: "100%",
                  maxHeight: "100%",
                  overflow: "hidden",
                  border: "2px solid",
                  borderColor: theme.palette.divider,
                  opacity: chartAlignmentInitialized ? 1 : 0,
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
  const { state, actions } = useContext(context);
  return (
    <ChartContext.Provider
      value={{
        chartTabState: state.chartTab.state,
        otherChartOptions: [
          {
            label: "Timeline On/Off",
            onChange: (bool: boolean) => actions.setChartTabState(state.chartTab.state, { chartTimelineEnabled: bool }),
            value: state.chartTab.state.chartTimelineEnabled,
            icon: <img src={TimeLine} width="24" height="24" />
          }
        ]
      }}>
      <Box className="chart-tab">
        <Chart Component={TSCSvgComponent} />
      </Box>
    </ChartContext.Provider>
  );
});
