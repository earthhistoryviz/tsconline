import { observer } from "mobx-react-lite";
import { ChartZoomSettings } from "./types";
import { Chart, ChartContext } from "./Chart";
import { useContext } from "react";
import { context } from "./state";

type ChartProps = {
  chartContent: string;
  zoomSettings: ChartZoomSettings;
  setZoomSettings: (zoomSettings: Partial<ChartZoomSettings>) => void;
  madeChart: boolean;
  chartLoading: boolean;
};
export const CrossPlotChart: React.FC<ChartProps> = observer(() => {
  const { state } = useContext(context);
  return (
    <ChartContext.Provider value={{ chartTabState: state.crossPlot.state }}>
      <Chart />
    </ChartContext.Provider>
  );
});
