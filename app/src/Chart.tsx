import { observer } from "mobx-react-lite";
import { useContext } from "react";
import { context } from "./state";
import { useTheme } from "@mui/material/styles";
import "./Chart.css";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { TSCPopupManager, TSCSvgComponent } from "./components";
import LoadingChart from "./LoadingChart";
import HorizontalRuleIcon from "@mui/icons-material/HorizontalRule";
import { IconButton } from "@mui/material";
export const Chart = observer(function () {
  const { state, actions } = useContext(context);
  const theme = useTheme();

  return (
    <div
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
        <div className="chart-and-options-bar-container">
          <div className="chart-options-bar">
            <IconButton
              title="Timeline On/Off"
              onClick={() => actions.setChartTimelineEnabled(!state.chartTimelineEnabled)}>
              <HorizontalRuleIcon className="timeline-button" />
            </IconButton>
          </div>
          <TransformWrapper minScale={0.01} maxScale={3} limitToBounds={false}>
            <TransformComponent>
              <TSCSvgComponent chartContent={state.chartContent} />
            </TransformComponent>
          </TransformWrapper>
        </div>
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
    </div>
  );
});
