import { observer } from "mobx-react-lite";
import { Stage, Layer, Rect } from "react-konva";
import { Header } from "./drawing/Header";
import { useContext } from "react";
import { context } from "../state";
import { ColumnInfo } from "@tsconline/shared";
import Ruler from "./drawing/Ruler";
type ChartProps = {
  column: ColumnInfo;
};
export const Chart: React.FC<ChartProps> = observer(function Chart({ column }) {
  const { state, chartState } = useContext(context);
  return (
    <Stage width={chartState.width} height={chartState.height}>
      <Layer>
        <Rect x={0} y={0} width={chartState.width} height={chartState.height} fill={chartState.backgroundColor} />
        <Rect x={0} y={0} width={chartState.width} height={chartState.height} stroke="black" strokeWidth={1} />
      </Layer>
      <Ruler x={0} y={chartState.header.logoHeight + chartState.header.paddingY * 2} width={100} height={chartState.height} timeSettings={state.settings.timeSettings[column.units]} />
      <Header title={column.editName} />
      <Layer>
        <Rect x={100} y={100} width={100} height={200} fill="blue" draggable />
        <Rect x={220} y={100} width={100} height={200} fill="red" draggable />
      </Layer>
    </Stage>
  );
});
