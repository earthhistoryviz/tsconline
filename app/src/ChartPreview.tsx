import { useContext, useEffect, useRef } from "react";
import { ChartContext, Chart } from "./Chart";
import { context } from "./state";
import { TSCSvgComponent } from "./components";
import { Box } from "@mui/material";
import TimeLine from "./assets/icons/axes=one.svg";

export function ChartPreview() {
  const { state, actions } = useContext(context);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const previewLockedRef = useRef<boolean>(!!state.chartTab.previewLocked);
  const currentChartSnapshotRef = useRef<string | null>(null);

  // keep previewLockedRef up-to-date
  useEffect(() => {
    previewLockedRef.current = !!state.chartTab.previewLocked;
    console.log("ChartPreview: previewLocked =", previewLockedRef.current);
    if (!previewLockedRef.current && currentChartSnapshotRef.current) {
      applyPayload(currentChartSnapshotRef.current);
    }
  }, [state.chartTab.previewLocked]);

  // create channel once and attach listeners; clean up on unmount
  useEffect(() => {
    if (!channelRef.current) channelRef.current = new BroadcastChannel("tsconline-chart");
    const channel = channelRef.current;

    const onMessage = (ev: MessageEvent) => {
      try {
        const msg = ev.data;
        if (msg?.type === "snapshot" && typeof msg.payload === "string") applyPayload(msg.payload);
        currentChartSnapshotRef.current = msg.payload;
      } catch (e) {
        /* ignore */
      }
    };

    const onStorage = (ev: StorageEvent) => {
      if (ev.key === "chartPreview" && ev.newValue) applyPayload(ev.newValue);
    };

    channel.addEventListener("message", onMessage);
    window.addEventListener("storage", onStorage);

    // ask other windows for the latest snapshot if desired
    channel.postMessage({ type: "request" });

    return () => {
      channel.removeEventListener("message", onMessage);
      window.removeEventListener("storage", onStorage);
      channel.close();
      channelRef.current = null;
    };
    // empty deps: one-time setup
  }, []);

  const applyPayload = (payloadStr: string | null) => {
    if (!payloadStr) return;
    try {
      const snap = JSON.parse(payloadStr);
      if (!previewLockedRef.current) {
        actions.setChartTabState(state.chartTab.state, snap);
      }
    } catch (err) {
      console.error("ChartPreview: invalid incoming snapshot", err);
    }
  };

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
