import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import {ChartContext, Chart} from "./Chart";
import {context} from "./state";
import { TSCSvgComponent } from "./components";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { Box } from "@mui/material";
// A thin page that provides the same ChartContext and renders the Chart with your SVG component
export function ChartPreview() {
  const { state, actions } = useContext(context);
  const svgContainerRef = useRef<HTMLDivElement>(null);

  console.log("Rendering ChartPreview with state:",  state.chartTab.state);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let payload: string | null = null;
    if (params.has("snapshot")) {
      try {
        payload = atob(params.get("snapshot") || "");
      } catch {
        payload = null;
      }
    }
    // fallback to localStorage
    if (!payload) {
      payload = localStorage.getItem("chartPreview");
    }
    if (!payload) return;
    try {
      const snap = JSON.parse(payload);
      // apply snapshot to current chart tab state (partial update)
      actions.setChartTabState(state.chartTab.state, snap);
      // remove local key to avoid reuse
      localStorage.removeItem("chartPreview");
    } catch (err) {
      console.error("ChartPreview: invalid snapshot", err);
    }
  }, [state.chartTab.state, actions]);

  if (!state.chartTab.state.madeChart) {
    return <Box>No chart available</Box>;
  }

  return (
    <Box sx={{ width: '100vw', height: '100vh' }}>
      <div id="chart-transform-wrapper" style={{ width: '100%', height: '100%' }}>
        <TransformWrapper
          limitToBounds={true}
          minScale={0.1}
          maxScale={8}
          disablePadding={true}
        >
          <TransformComponent
            wrapperStyle={{
              width: "100%",
              height: "100%",
              maxWidth: "100%",
              maxHeight: "100%",
              overflow: "hidden",
              display: "flex"
            }}
          >
            {/* Provide the ChartContext so Chart sees the current chart state/actions.
                Render Chart directly and request that it hide the options bar and fill the space.
                TSCSvgComponent is passed as the SVG renderer; if Chart doesn't use these props it will ignore them. */}
            <ChartContext.Provider value={{ state: state.chartTab.state, actions }}>
              <div style={{ flex: 1, width: "100%", height: "100%" }} ref={svgContainerRef}>
                <Chart hideOptionsBar={true} fullScreen={true} svgComponent={TSCSvgComponent} />
              </div>
            </ChartContext.Provider>

          </TransformComponent>
        </TransformWrapper>
      </div>
    </Box>
  );
}

