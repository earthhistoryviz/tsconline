import { useContext } from "react";
import { observer } from "mobx-react-lite";
import { Chart } from "./Chart";
import { context } from "../state";
export const DevChart = observer(function DevChart() {
  const { state } = useContext(context);
  return (
    <>
      {state.settingsTabs.columns &&
        state.settingsTabs.columns.children.map((column) => <Chart column={column} key={column.name} />)}
    </>
  );
});
