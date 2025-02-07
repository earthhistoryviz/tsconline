import { observer } from "mobx-react-lite";
import { Chart, ChartContext } from "../Chart";
import { useContext } from "react";
import { context } from "../state";
import { TSCCrossPlotSVGComponent } from "../components/TSCCrossPlotSVGComponent";
import { CrossPlotSideBar } from "./CrossPlotSideBar";
import { Box } from "@mui/material";
import styles from "./CrossPlotChart.module.css";

export const CrossPlotChart: React.FC = observer(() => {
  const { state } = useContext(context);
  return (
    <ChartContext.Provider value={{ chartTabState: state.crossPlot.state }}>
      <Box className={styles.container} gridTemplateColumns="26.5vw 73.5vw">
        <CrossPlotSideBar />
        <Chart Component={TSCCrossPlotSVGComponent} width="73.5vw" />
      </Box>
    </ChartContext.Provider>
  );
});
