import { observer } from "mobx-react-lite";
import { useContext } from "react";
import { context } from "./state";
import { useTheme } from "@mui/material/styles";
import "./Chart.css";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { GradientDiv, TSCPopupManager, TSCSvgComponent } from "./components";
import LoadingChart from "./LoadingChart";

export const Chart = observer(function () {
  const { state } = useContext(context);
  const theme = useTheme();

  return (
    <GradientDiv
      style={{
        height: "92vh",
        width: "100%",
        display: "flex",
        justifyContent: "center",
        alignContent: "center"
      }}>
      {state.chartLoading ? (
        <LoadingChart />
      ) : state.madeChart ? (
        <TransformWrapper minScale={0.01} maxScale={3} limitToBounds={false}>
          <TransformComponent>
            <TSCSvgComponent path={state.chartPath} />
          </TransformComponent>
        </TransformWrapper>
      ) : (
        <div
          className="loading-container"
          style={{
            fontFamily: theme.typography.fontFamily
          }}>
          <div className="loading"> You have not made a chart yet </div>
        </div>
      )}
      <TSCPopupManager />
    </GradientDiv>
  );
});
