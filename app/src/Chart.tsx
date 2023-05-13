import { observer } from "mobx-react-lite";
import { useContext } from "react";
import { context } from "./state";

export const Chart = observer(function () {
  const { state } = useContext(context);
  return (
    <div style={{height:"92vh"}}>
      <object data={state.chartPath} type="application/pdf" width="100%" height="100%"></object>
    </div>
  );
});
