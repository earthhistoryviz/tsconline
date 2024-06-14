import { observer } from "mobx-react-lite";
import { useContext, useRef } from "react";
import { context } from "./state";
import "./Chart.css";
import { GradientDiv, TSCPopupManager, TSCSvgComponent } from "./components";
import LoadingChart from "./LoadingChart";
import HorizontalRuleIcon from "@mui/icons-material/HorizontalRule";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import DownloadIcon from "@mui/icons-material/Download";
import FileSaver from "file-saver";

import { IconButton } from "@mui/material";
export const Chart = observer(function () {
  const { state, actions } = useContext(context);
  const theme = useTheme();
  const scale = useRef(1);
  const zoomIn = () => {
    const element = document.getElementById("chart-wrapper");
    if (scale.current < 2) scale.current += 0.1;
    element!.style.transform = `scale(${scale.current}, ${scale.current})`;
  };
  const zoomOut = () => {
    const element = document.getElementById("chart-wrapper");
    if (scale.current > 0.2) scale.current -= 0.1;
    element!.style.transform = `scale(${scale.current}, ${scale.current})`;
  };
  const downloadSvg = () => {
    const blob = new Blob([state.chartContent]);
    FileSaver.saveAs(blob, "test.svg");
  };
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
        <div className="chart-and-options-bar-container" style={{ marginTop: "1vh", height: "100%", width: "auto" }}>
          <div className="chart-options-bar">
            <IconButton onClick={() => zoomIn()}>
              <ZoomInIcon />
            </IconButton>
            <IconButton onClick={() => zoomOut()}>
              <ZoomOutIcon />
            </IconButton>
            <IconButton
              title="Timeline On/Off"
              onClick={() => actions.setChartTimelineEnabled(!state.chartTimelineEnabled)}>
              <HorizontalRuleIcon className="timeline-button" />
            </IconButton>
            <IconButton onClick={() => downloadSvg()}>
              <DownloadIcon />
            </IconButton>
          </div>
          <div style={{ overflow: "scroll", border: "solid" }}>
            <TSCSvgComponent chartContent={state.chartContent} />
          </div>
        </div>
      ) : (
        <div className="loading-container">
          <Typography className="loading"> You have not made a chart yet </Typography>
        </div>
      )}
      <TSCPopupManager />
    </div>
  );
});
