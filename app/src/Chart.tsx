import { observer } from "mobx-react-lite";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
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
import {
  Box,
  Typography,
  Accordion,
  IconButton,
  FormControlLabel,
  Drawer,
  Paper,
  AccordionSummary,
  AccordionDetails
} from "@mui/material";
import { ArrowBack, ArrowForwardIosSharp } from "@mui/icons-material";
import HistoryIcon from "@mui/icons-material/History";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import { useTheme } from "@mui/material/styles";
import { useTranslation } from "react-i18next";
import { ChartContextType, DatapackFetchParams } from "./types";
import { context } from "./state";
import { defaultChartTabState } from "./constants";
import { cloneDeep } from "lodash";
import TimeLine from "./assets/icons/axes=one.svg";
import { usePreviousLocation } from "./providers/PreviousLocationProvider";
import { formatDate, purifyChartContent } from "./state/non-action-util";
import { ChartHistoryMetadata, DatapackUniqueIdentifier } from "@tsconline/shared";
import Color from "color";
import { DatapackConfigForChartRequest, DatapackType } from "@tsconline/shared";
import { toJS } from "mobx";

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
  const { state, actions } = useContext(context);
  const transformContainerRef = useRef<ReactZoomPanPinchContentRef>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const [chartAlignmentInitialized, setChartAlignmentInitialized] = useState(false); // used to make sure the chart alignment values are setup before we try to use them
  const navigate = useNavigate();



  //check seralized URL params for a given chart state from MCP
  // Right now, gets a public datapack title only. Then needs to create a DatapackConfigForChartRequest from that title, somehow getting the stored file name.
  useEffect(() => {

    //url for testing: http://localhost:5173/chart?mcpChartState=eyJkYXRhUGFja3MiOiBbIlRpbWVTY2FsZSBDcmVhdG9yIEludGVybmFsIERhdGFwYWNrIl19 


    let mounted = true;
    (async () => {
      console.log("On chart mount, checking URL params for chart state...");
      console.log("datapack list", toJS(state.datapacks));
      console.log("datapack list len", toJS(state.datapacks.length));
      const urlParams = new URLSearchParams(window.location.search);
      //check if params exist
      if (!urlParams.toString()) {
        return
      }


      //convert base64 to JSON
      const chartStateParam = urlParams.get("mcpChartState");
      if (!chartStateParam) {
        return;
      }
      let parsedState = null;
      try {
        const decodedState = atob(chartStateParam);
        parsedState = JSON.parse(decodedState);
      }
      catch (error) {
        console.error("Error parsing chartState from URL:", error);
      }

      const dataPacksTitles = parsedState.dataPacks;
      if (!dataPacksTitles || dataPacksTitles.length === 0) {
        // no datapacks to process
        return;
      }
      //construct DatapackConfigForChartRequest from titles of type DatapackConfigForChartRequest

      //Steps to getting datapacks
      // 1. populate a fetch param for datapacks

      const controller = new AbortController();


      // 2. send a fetch const fetchedDatapack = await actions.fetchDatapack(metadata, { signal: controller.signal });

      for (const title of dataPacksTitles) {
        try {
          console.log("Fetching datapack for title:", title);
          const fetchedDatapack = await actions.fetchDatapack({ title, type: "official", isPublic: true }, { signal: controller.signal });
          if (fetchedDatapack) {
            actions.addDatapack(fetchedDatapack);
            // may need to figure some way to populate state.datapackMetadata here as well
          } else {
            console.error("Failed to fetch datapack for title:", title);
          } 
        } catch (error) {
          console.error("Error fetching datapack for title:", title, error);
        }
      }

      //3. now should be able to construct the datapack config from titles and send to processDatapackConfig

      console.log("datapack state after fetch:", toJS(state.datapacks));


      //hardcode datapackType as offical for now
      const datapackConfigs : DatapackConfigForChartRequest[] = dataPacksTitles.map((title: string) => ({
        title,
        isPublic: true,
        storedFileName: actions.getStoredFileName(title),
        type: "official"
      }));


      // We need to select a datapack and push it to state.datapack for the configs to process. 

      console.log("Constructed datapackConfigs from titles:", datapackConfigs);



      await actions.processDatapackConfig(toJS(datapackConfigs));
      actions.initiateChartGeneration(navigate, "/charts");



      console.log("Finished processing URL params for chart state.");
      console.log("state.config.datapacks:", toJS(state.config?.datapacks));
    })();
    return () => {
      mounted = false;
    };

  }, []);

  const isCrossPlot = useLocation().pathname === "/crossplot";
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
      {state.isLoggedIn && !isCrossPlot && <HistorySideBar />}
      {chartLoading ? (
        <LoadingChart percent={state.chartTab.percent} stage={state.chartTab.stage} />
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
  const query = new URLSearchParams(useLocation().search);
  const navigate = useNavigate();
  const previousLocation = usePreviousLocation();
  const from = query.get("from");


  // see if the previous route/location was crossplot
  // we use two different ways, to make sure that we can try to be hyper accurate about the last location
  const isLastLocationCrossPlot = from === "crossplot" || previousLocation === "/crossplot";
  return (
    <>
      {isLastLocationCrossPlot && (
        <FormControlLabel
          className="chart-back-form-control-label"
          control={
            <IconButton className="chart-back-arrow-button" onClick={() => navigate(-1)}>
              <ArrowBack className="chart-back-arrow-button" />
            </IconButton>
          }
          label={"Back"}
        />
      )}
      <ChartContext.Provider
        value={{
          chartTabState: state.chartTab.state,
          stateChartOptions: [
            {
              label: "Timeline On/Off",
              onChange: (bool: boolean) =>
                actions.setChartTabState(state.chartTab.state, { chartTimelineEnabled: bool }),
              value: state.chartTab.state.chartTimelineEnabled,
              icon: <img src={TimeLine} width="24" height="24" />
            }
          ]
        }}>
        <Box className="chart-tab">
          <Chart Component={TSCSvgComponent} />
        </Box>
      </ChartContext.Provider>
    </>
  );
});
const HistorySideBar: React.FC = observer(() => {
  const { state, actions } = useContext(context);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const theme = useTheme();
  return (
    <>
      <TSCDialogLoader open={loading} transparentBackground />
      <Paper
        onClick={() => setDrawerOpen(true)}
        className="floating-history-button"
        sx={{
          color: theme.palette.dark.contrastText,
          backgroundColor: Color(theme.palette.dark.main).alpha(0.9).string()
        }}>
        <HistoryIcon fontSize="medium" />
      </Paper>
      <Drawer
        anchor="left"
        open={isDrawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{ "& .MuiDrawer-paper": { backgroundColor: "backgroundColor.main", backgroundImage: "none" } }}>
        <Box padding={2} width={400}>
          <Box display="flex" alignItems="center">
            <IconButton>
              <HistoryIcon fontSize="medium" />
            </IconButton>
            <Typography variant="h5">Recent History</Typography>
            <CustomTooltip title="Delete all history entries">
              <IconButton
                onClick={async () => {
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
          {state.user.historyEntries.map((entry) => {
            return (
              <HistoryEntry
                key={entry.timestamp}
                entry={entry}
                onClick={async () => {
                  setLoading(true);
                  try {
                    await actions.loadUserHistory(entry.timestamp);
                    setDrawerOpen(false);
                  } finally {
                    setLoading(false);
                  }
                }}
                onDelete={async (e) => {
                  e.stopPropagation();
                  setLoading(true);
                  try {
                    await actions.deleteUserHistory(entry.timestamp);
                  } finally {
                    setLoading(false);
                  }
                }}
              />
            );
          })}
        </Box>
      </Drawer>
    </>
  );
});

type HistoryEntryProps = {
  entry: ChartHistoryMetadata;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
};
const HistoryEntry: React.FC<HistoryEntryProps> = observer(({ entry, onClick, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const theme = useTheme();
  return (
    <Accordion
      className="history-entry-accordion"
      disableGutters
      elevation={0}
      slotProps={{ transition: { timeout: 200 } }}
      square
      sx={{
        backgroundColor: "backgroundColor.main",
        "&.Mui-expanded": {
          backgroundColor: "backgroundColor.main"
        },
        "&:hover": {
          bgcolor:
            theme.palette.mode === "light"
              ? Color(theme.palette.backgroundColor.main).darken(0.04).string()
              : Color(theme.palette.backgroundColor.main).lighten(0.26).string()
        }
      }}
      key={entry.timestamp}
      expanded={expanded}>
      <AccordionSummary
        className="history-entry-summary"
        tabIndex={0}
        expandIcon={
          <ArrowForwardIosSharp
            sx={{ fontSize: "0.9rem" }}
            color="icon"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          />
        }>
        <Box className="history-entry-summary-container">
          <Box
            className="history-entry-summary-display-date"
            onClick={() => {
              onClick();
            }}>
            <div
              className="history-entry-svg-display"
              id={`${entry.timestamp}svg-display`}
              dangerouslySetInnerHTML={{
                __html: purifyChartContent(entry.chartContent, {
                  preserveAspectRatio: "none",
                  width: "100%",
                  height: "100%"
                })
              }}
            />
            <Typography>{formatDate(entry.timestamp)}</Typography>
          </Box>
          <IconButton className="history-entry-summary-delete-button" onClick={onDelete}>
            <DeleteForeverIcon />
          </IconButton>
        </Box>
      </AccordionSummary>
      <AccordionDetails className="history-entry-details">
        <Box display="flex" gap="3px" flexDirection="column">
          <Typography variant="caption" color="textSecondary">
            Datapacks
          </Typography>
        </Box>
        {entry.datapacks.map((dp, index) => (
          <TimelineItem
            key={dp.title}
            title={dp.title}
            authoredBy={dp.authoredBy}
            isLast={entry.datapacks.length - 1 === index}
          />
        ))}
      </AccordionDetails>
    </Accordion>
  );
});
type TimelineItemProps = {
  authoredBy: string;
  title: string;
  isLast: boolean;
};

const TimelineItem: React.FC<TimelineItemProps> = ({ authoredBy, isLast, title }) => {
  return (
    <Box sx={{ position: "relative", display: "flex", alignItems: "flex-start", paddingBottom: "10px" }}>
      <Box className="timeline-dot" />
      {!isLast && <Box className="timeline-line" />}
      <div style={{ paddingTop: "2px", paddingLeft: "15px" }}>
        <Typography>{title}</Typography>
        <Typography variant="caption" color="textSecondary">
          {"Created by: " + authoredBy}
        </Typography>
      </div>
    </Box>
  );
};
