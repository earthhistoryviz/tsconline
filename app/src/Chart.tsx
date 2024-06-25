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
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const step = 0.1;
  const minScale = 0.1;
  const maxScale = 8;

  const setChartAlignmentValues = () => {
    const container = transformContainerRef.current;
    const content = svgContainerRef.current;
    if (!container || !content) return;

    const containerRect = container.instance.wrapperComponent?.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();
    if (!containerRect || !contentRect) return;

    const ogY = (contentRect.bottom - contentRect.top) / container.instance.transformState.scale;
    const ogX = (contentRect.right - contentRect.left) / container.instance.transformState.scale;
    const zoomFitY = (containerRect.bottom - containerRect.top) / ogY;
    const zoomFitX = (containerRect.right - containerRect.left) / ogX;

    if (zoomFitX < zoomFitY) {
      actions.setChartTabZoomFitScale(zoomFitX);
      actions.setChartTabZoomFitMidCoord(
        (containerRect.bottom - containerRect.top) / 2 - (ogY * state.chartTab.zoomFitScale) / 2
      );
      state.chartTab.zoomFitMidCoordIsX = false;
    } else {
      actions.setChartTabZoomFitScale(zoomFitY);
      actions.setChartTabZoomFitMidCoord(
        (containerRect.right - containerRect.left) / 2 - (ogX * state.chartTab.zoomFitScale) / 2
      );
      state.chartTab.zoomFitMidCoordIsX = true;
    }

    actions.setChartTabResetMidX((containerRect.right - containerRect.left) / 2 - ogX / 2);
  };

  useEffect(() => {
    const container = transformContainerRef.current;
    if (!container) return;

    setChartAlignmentValues();

    if (state.chartTab.zoomFitMidCoordIsX) {
      container.setTransform(state.chartTab.zoomFitMidCoord, 0, state.chartTab.zoomFitScale, 0);
    } else {
      container.setTransform(0, state.chartTab.zoomFitMidCoord, state.chartTab.zoomFitScale, 0);
    }
    actions.setChartTabScale(state.chartTab.zoomFitScale);

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
          <OptionsBar
            transformRef={transformContainerRef}
            svgRef={svgContainerRef}
            step={step}
            minScale={minScale}
            maxScale={maxScale}
          />
          <div id="chart-transform-wrapper">
            <TransformWrapper
              ref={transformContainerRef}
              wheel={{ wheelDisabled: !state.chartTab.enableScrollZoom }}
              panning={{ wheelPanning: !state.chartTab.enableScrollZoom }}
              limitToBounds={true}
              minScale={minScale}
              maxScale={maxScale}>
              <TransformComponent wrapperStyle={{ height: "84vh", width: "80vw", border: "solid" }}>
                <TSCSvgComponent svgContainerRef={svgContainerRef} chartContent={state.chartContent} />
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
