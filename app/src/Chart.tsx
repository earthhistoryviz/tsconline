import { observer } from "mobx-react-lite";
import { useContext } from "react";
import { context } from "./state";
import loadingSVG from "./assets/loading.svg";
import { useTheme } from "@mui/material/styles";
import "./Chart.css";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { GradientDiv } from "./components";

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
        alignContent: "center",
      }}
    >
      {state.chartLoading ? (
        <div
          className="loading-container"
          style={{
            fontFamily: theme.typography.fontFamily,
          }}
        >
          <img src={loadingSVG} alt="LOADING" className="svg-style" />
          <div className="loading"> L O A D I N G . . . </div>
          <div className="loading-sub">
            {" "}
            (this could take more than a minute)
          </div>
        </div>
      ) : state.madeChart ? (
        <TransformWrapper minScale={0.01} maxScale={3} limitToBounds={false}>
          <TransformComponent>
            <img src={state.chartPath} />
            {/* <object data={state.chartPath} type="application/svg" width="100%" height="100%"></object> */}
          </TransformComponent>
        </TransformWrapper>
      ) : (
        <div
          className="loading-container"
          style={{
            fontFamily: theme.typography.fontFamily,
          }}
        >
          <div className="loading"> You have not made a chart yet </div>
        </div>
      )}
    </GradientDiv>
  );
});
