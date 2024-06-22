import { observer } from "mobx-react-lite";
import { useContext, useEffect, useRef } from "react";
import { context } from "./state";
import "./Chart.css";
import { GradientDiv, TSCPopupManager, TSCSvgComponent } from "./components";
import LoadingChart from "./LoadingChart";
import { TransformWrapper, TransformComponent, ReactZoomPanPinchContentRef } from "react-zoom-pan-pinch";
import { OptionsBar } from "./ChartOptionsBar";

export const Chart = observer(() => {
  const { state, actions } = useContext(context);
  const theme = useTheme();
  const transformContainerRef = useRef<ReactZoomPanPinchContentRef>(null);
  const step = 0.1;
  const minScale = 0.1;
  const maxScale = 8;

  const setChartAlignmentValues = () => {
    const container = transformContainerRef.current;
    if (!container) return;
    const content = document.getElementById("svg-display")?.getBoundingClientRect();
    const wrapper = document.getElementById("chart-transform-wrapper")?.getBoundingClientRect();
    if (!content || !wrapper) return;

    const wrapperMid = (wrapper.right - wrapper.left) / 2;
    const chartOffset = (content.right - content.left) / 2;
    actions.setChartTabMidX(wrapperMid - chartOffset);
    const zoomFitScaleVertical = (wrapper.bottom - wrapper.top) / (content.bottom - content.top);
    const zoomFitScaleHorizontal = (wrapper.right - wrapper.left) / (content.right - content.left);

    if (zoomFitScaleHorizontal < zoomFitScaleVertical) actions.setChartTabZoomFitScale(zoomFitScaleHorizontal);
    else actions.setChartTabZoomFitScale(zoomFitScaleVertical);
  };

  useEffect(() => {
    const container = transformContainerRef.current;
    if (!container) return;

    setChartAlignmentValues();

    container.setTransform(state.chartTab.midX, 0, state.chartTab.scale, 0);

    const windowResizeListenerWrapper = () => {
      setChartAlignmentValues();
    };
    const eventListenerWrapper = (evt: KeyboardEvent) => {
      if ((evt.metaKey || evt.ctrlKey) && evt.code === "Equal") {
        evt.preventDefault();
        if (state.chartTab.scale < maxScale) {
          container.zoomIn(step, 0);
          actions.setChartTabScale(state.chartTab.scale + step);
        }
      }
      if ((evt.metaKey || evt.ctrlKey) && evt.code === "Minus") {
        evt.preventDefault();
        if (state.chartTab.scale > minScale) {
          container.zoomOut(step, 0);
          actions.setChartTabScale(state.chartTab.scale - step);
        }
      }
    };
    document.addEventListener("keydown", eventListenerWrapper);
    window.addEventListener("resize", windowResizeListenerWrapper);
    return () => {
      document.removeEventListener("keydown", eventListenerWrapper);
      window.removeEventListener("resize", windowResizeListenerWrapper);
    };
  }, [state.chartContent]);

  return (
    <div
      style={{
        height: "94vh",
        width: "100%",
        display: "flex",
        justifyContent: "center",
        alignContent: "center"
      }}>
      {state.chartLoading ? (
        <LoadingChart />
      ) : state.madeChart ? (
        <div id="wrapper" className="chart-and-options-bar">
          <OptionsBar container={transformContainerRef.current} step={step} minScale={minScale} maxScale={maxScale} />
          <div id="chart-transform-wrapper">
            <TransformWrapper
              ref={transformContainerRef}
              wheel={{ wheelDisabled: !state.chartTab.enableScrollZoom }}
              panning={{ wheelPanning: !state.chartTab.enableScrollZoom }}
              limitToBounds={false}
              minScale={minScale}
              maxScale={maxScale}>
              <TransformComponent wrapperStyle={{ height: "84vh", width: "80vw", border: "solid" }}>
                <TSCSvgComponent chartContent={state.chartContent} />
              </TransformComponent>
            </TransformWrapper>
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
