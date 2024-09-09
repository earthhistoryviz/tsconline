import { observer } from 'mobx-react-lite';
import { Stage, Layer, Rect } from 'react-konva';
import { Header } from './drawing/Header';
import { useContext } from 'react';
import { context } from '../state';
export const Chart = observer(function Chart() {
    const { state } = useContext(context)
    return (
    <Stage width={state.chart.width} height={state.chart.height}>
        <Layer>
        <Rect
          x={0}
          y={0}
          width={state.chart.width}
          height={state.chart.height}
          fill={state.chart.backgroundColor}/>
        </Layer>
        <Header/>
        <Layer>
        <Rect
          x={100}
          y={100}
          width={100}
          height={200}
          fill="blue"
          draggable
        />
        <Rect
          x={220}
          y={100}
          width={100}
          height={200}
          fill="red"
          draggable
        />
      </Layer>
    </Stage>
  );
});
