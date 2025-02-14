import { observer } from "mobx-react-lite";
import { Chart, ChartContext } from "../Chart";
import React, { useContext, useRef } from "react";
import { context } from "../state";
import { TSCCrossPlotSVGComponent } from "../components/TSCCrossPlotSVGComponent";
import { CrossPlotSideBar } from "./CrossPlotSideBar";
import { Box, useTheme } from "@mui/material";
import styles from "./CrossPlotChart.module.css";
import MarkerIcon from "../assets/icons/model=Default.svg";

export const CrossPlotChart: React.FC = observer(() => {
  const { state, actions } = useContext(context);
  const ref = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  return (
    <ChartContext.Provider
      value={{
        chartTabState: state.crossPlot.state,
        otherChartOptions: [
          {
            label: "Markers",
            icon: <img src={MarkerIcon} width="24" height="24" />,
            onChange: actions.setCrossPlotMarkerMode,
            value: state.crossPlot.markerMode
          }
        ]
      }}>
      <Box className={styles.container}>
        <CrossPlotSideBar ref={ref} />
        <Chart
          Component={TSCCrossPlotSVGComponent}
          disableDoubleClick
          refList={[ref]}
          style={{
            border: "none",
            borderTop: `2px solid ${theme.palette.divider}`
          }}
        />
      </Box>
    </ChartContext.Provider>
  );
});
