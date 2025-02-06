import { observer } from "mobx-react-lite";
import { ChartZoomSettings } from "./types";
import { Chart, ChartContext } from "./Chart";
import { useContext } from "react";
import { context } from "./state";
import { TSCCrossPlotSVGComponent } from "./components/TSCCrossPlotSVGComponent";

export const CrossPlotChart: React.FC = observer(() => {
  const { state } = useContext(context);
  return (
    <ChartContext.Provider value={{ chartTabState: state.crossPlot.state }}>
      <Chart Component={TSCCrossPlotSVGComponent} />
    </ChartContext.Provider>
  );
});
