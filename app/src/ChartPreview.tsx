import { useContext, useEffect, useRef } from "react";
import { ChartContext, Chart } from "./Chart";
import { context } from "./state";
import { TSCSvgComponent } from "./components";
import { Box } from "@mui/material";
import TimeLine from "./assets/icons/axes=one.svg";

export function ChartPreview() {
  const { state, actions } = useContext(context);
  const channelRef = useRef<BroadcastChannel | null>(null);

    // Initialize channel once on mount (before useEffect)
  if (!channelRef.current) {
    channelRef.current = new BroadcastChannel("tsconline-chart");
  }
  const channel = channelRef.current;

  useEffect(() => {
    const applyPayload = (payloadStr: string | null) => {
      if (!payloadStr) return;
      try {
        const snap = JSON.parse(payloadStr);
        if (!state.chartTab.previewLocked) {
          // Only apply if not locked
          actions.setChartTabState(state.chartTab.state, snap);
        }
      } catch (err) {
        console.error("ChartPreview: invalid incoming snapshot", err);
      }
    };

    channel.onmessage = (ev) => {
      try {
        const msg = ev.data;
        if (msg?.type === "snapshot" && typeof msg.payload === "string") {
          applyPayload(msg.payload);
        }
      } catch (e) {
        /* ignore */
      }
    };

    // storage-event fallback
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === "chartPreview" && ev.newValue) {
        applyPayload(ev.newValue);
      }
    };
    window.addEventListener("storage", onStorage);

    // request an immediate snapshot from the main window(s)
    channel.postMessage({ type: "request" });

    return () => {
      window.removeEventListener("storage", onStorage);
    };
  }, [state.chartTab.state, actions]);

    // Cleanup channel on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        channelRef.current.close();
      }
    };
  }, []);

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
  }, [state.chartTab.state, actions, state.chartTab.previewLocked]);

  return (
    <ChartContext.Provider
      value={{
        chartTabState: state.chartTab.state,
        stateChartOptions: [
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
}
