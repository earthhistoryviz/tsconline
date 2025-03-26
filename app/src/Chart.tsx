import { observer } from "mobx-react-lite";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import "./Chart.css";
import { CustomTooltip, TSCDialogLoader, TSCPopupManager, TSCSvgComponent } from "./components";
import LoadingChart from "./LoadingChart";
import {
  TransformWrapper,
  TransformComponent,
  ReactZoomPanPinchContentRef,
  ReactZoomPanPinchRef
} from "react-zoom-pan-pinch";
import { OptionsBar } from "./ChartOptionsBar";
import { Box, Typography, IconButton, Drawer, List, ListItemButton, ListItemText, Paper } from "@mui/material";
import HistoryIcon from "@mui/icons-material/History";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import { useTheme } from "@mui/material/styles";
import { useTranslation } from "react-i18next";
import { ChartContextType } from "./types";
import { context, state } from "./state";
import { defaultChartTabState } from "./constants";
import { cloneDeep } from "lodash";
import TimeLine from "./assets/icons/axes=one.svg";
import { formatDate } from "./state/non-action-util";

export const ChartContext = createContext<ChartContextType>({
  chartTabState: cloneDeep(defaultChartTabState)
});

type ChartProps = {
  Component: React.FC<{ ref: React.RefObject<HTMLDivElement> }>;
  refList?: { ref: React.RefObject<HTMLDivElement>; id: string }[];
  style?: React.CSSProperties;
  disableDoubleClick?: boolean;
};

export const Chart: React.FC<ChartProps> = observer(({ Component, style, refList, disableDoubleClick = false }) => {
  const theme = useTheme();
  const { chartTabState } = useContext(ChartContext);
  const { matchesSettings, chartContent, chartZoomSettings, madeChart, chartLoading } = chartTabState;
  const { actions } = useContext(context);
  const transformContainerRef = useRef<ReactZoomPanPinchContentRef>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const [chartAlignmentInitialized, setChartAlignmentInitialized] = useState(false); // used to make sure the chart alignment values are setup before we try to use them
  const step = 0.1;
  const minScale = 0.1;
  const maxScale = 2;
  const triggeredDifferentSettings = useRef(false);
  const { scale, zoomFitScale, zoomFitMidCoord, zoomFitMidCoordIsX, enableScrollZoom } = chartZoomSettings;

  useEffect(() => {
    if (!matchesSettings && !triggeredDifferentSettings.current) {
      triggeredDifferentSettings.current = true;
      actions.pushSnackbar("Chart settings are different from the displayed chart.", "warning");
    }
  }, [matchesSettings]);

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
  }, [setChartAlignmentValues]);

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

  const map = new Map();
  // resize the transform wrapper to fix alignment of the chart when any component resizes ( that we give it )
  // when switching to inspector console, the resize observer will continuously refresh until the screen is clicked.
  useEffect(() => {
    if (!refList || refList.length == 0) return;
    const observers: { observer: ResizeObserver; id: string }[] = [];
    for (const ref of refList) {
      if (!ref.ref.current || map.has(ref.id)) continue;
      const resizeObserver = new ResizeObserver(() => {
        setChartAlignmentValues();
      });
      resizeObserver.observe(ref.ref.current);
      map.set(ref.id, resizeObserver);
      observers.push({ observer: resizeObserver, id: ref.id });
    }
    return () => {
      for (const observer of observers) {
        map.delete(observer.id);
        observer.observer.disconnect();
      }
    };
  }, [refList?.map((ref) => ref.id).join("")]);
  const { t } = useTranslation();

  const onZoom = (e: ReactZoomPanPinchRef) => {
    actions.setChartTabZoomSettings(chartZoomSettings, { scale: e.state.scale });
  };

  return (
    <Box className="chart-container">
      {state.isLoggedIn && <HistorySideBar />}
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

const HistorySideBar: React.FC = observer(() => {
  const { state, actions } = useContext(context);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  return (
    <>
      <TSCDialogLoader open={loading} transparentBackground />
      <Paper
        onClick={() => setDrawerOpen(true)}
        className="floating-history-button"
        sx={{
          backgroundColor: "backgroundColor.main"
        }}>
        <HistoryIcon fontSize="medium" />
      </Paper>
      <Drawer
        anchor="left"
        open={isDrawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{ "& .MuiDrawer-paper": { backgroundColor: "backgroundColor.main" } }}>
        <Box padding={2}>
          <Box display="flex" alignItems="center">
            <IconButton>
              <HistoryIcon fontSize="medium" />
            </IconButton>
            <Typography variant="h5">History</Typography>
            <CustomTooltip title="Delete all history entries">
              <IconButton
                onClick={async () => {
                  if (state.user.historyEntries.length === 0) {
                    actions.pushSnackbar("No history entries to delete", "warning");
                    return;
                  }
                  setLoading(true);
                  try {
                    await actions.deleteUserHistory("-1");
                  } finally {
                    setLoading(false);
                  }
                }}>
                <DeleteForeverIcon fontSize="medium" />
              </IconButton>
            </CustomTooltip>
          </Box>
          <List>
            {state.user.historyEntries.map((entry) => (
              <ListItemButton
                key={entry.timestamp}
                onClick={async () => {
                  setLoading(true);
                  try {
                    await actions.loadUserHistory(entry.timestamp);
                    setDrawerOpen(false);
                  } finally {
                    setLoading(false);
                  }
                }}>
                <ListItemText primary={formatDate(entry.timestamp)} />
                <IconButton
                  onClick={async (e) => {
                    e.stopPropagation();
                    setLoading(true);
                    try {
                      await actions.deleteUserHistory(entry.timestamp);
                    } finally {
                      setLoading(false);
                    }
                  }}>
                  <DeleteForeverIcon fontSize="small" />
                </IconButton>
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Drawer>
    </>
  );
});
