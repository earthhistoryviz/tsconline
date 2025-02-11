import { observer } from "mobx-react-lite";
import { Chart, ChartContext } from "../Chart";
import { useContext, useRef } from "react";
import { context } from "../state";
import { TSCCrossPlotSVGComponent } from "../components/TSCCrossPlotSVGComponent";
import { CrossPlotSideBar } from "./CrossPlotSideBar";
import { Box, useTheme } from "@mui/material";
import styles from "./CrossPlotChart.module.css";

export const CrossPlotChart: React.FC = observer(() => {
  const { state } = useContext(context);
  const ref = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  return (
    <ChartContext.Provider value={{ chartTabState: state.crossPlot.state }}>
      <Box className={styles.container}>
        <CrossPlotSideBar ref={ref} />
        <Chart
          Component={TSCCrossPlotSVGComponent}
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
