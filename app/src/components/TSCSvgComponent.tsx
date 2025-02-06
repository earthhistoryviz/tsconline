import React, { useEffect, useContext, forwardRef } from "react";
import { context } from "../state/index";
import { observer } from "mobx-react-lite";
import { ChartContext } from "../Chart";

interface SVGWindow extends Window {
  curHoverElemID?: string;
  curHoverTextID?: string;
}

type TimeLineElements = {
  timeline: Element;
  timelineUp: Element;
  timelineDown: Element;
  timeLabel: Element;
  timeLabelUp: Element;
  timeLabelDown: Element;
};

export const TSCSvgComponent: React.FC = observer(
  forwardRef<HTMLDivElement>((props, ref) => {
    const { state, actions } = useContext(context);
    const { chartTabState } = useContext(ChartContext);
    const { chartTimelineEnabled, chartContent } = chartTabState;
    const [timeLineElements, setTimeLineElements] = React.useState<TimeLineElements | null>(null);

    /**
     *  handle the mouse events on the svg elements for popups
     * @param evt
     * @param container
     * @returns
     */
    const handleSvgEvent = (evt: MouseEvent, container: HTMLElement) => {
      const target = evt.target as HTMLElement;
      const svgEventWindow = window as SVGWindow;
      let currentElement: HTMLElement | null = target;
      while (currentElement && currentElement !== container) {
        if (currentElement.id && currentElement.id.startsWith("spawner")) {
          const elemID = currentElement.id;
          const textID = `id${elemID.replace("spawner", "")}`;

          switch (evt.type) {
            case "mouseover": {
              const e = document.getElementById(elemID);
              if (!e) return;
              e.setAttribute("opacity", "1");
              svgEventWindow.curHoverElemID = elemID;
              svgEventWindow.curHoverTextID = textID;
              break;
            }
            case "mouseout": {
              const elem = svgEventWindow.curHoverElemID
                ? document.getElementById(svgEventWindow.curHoverElemID)
                : null;
              if (elem) elem.setAttribute("opacity", "0");
              break;
            }
            case "click": {
              const textElement = document.getElementById(textID);
              const text = textElement ? textElement.getAttribute("popuptext") : "";
              let url: string = "http://localhost:5173";
              if (import.meta.env.VITE_APP_URL) {
                url = import.meta.env.VITE_APP_URL;
              }
              if (typeof svgEventWindow.top === "undefined") {
                alert(textID);
              } else if (svgEventWindow.top !== null) {
                svgEventWindow.top.postMessage({ action: "showPopup", text }, url);
              }
              break;
            }
          }
          break;
        }
        currentElement = currentElement.parentElement;
      }
    };

    /**
     * setup the non crossPlot elements and positioning of the timeline and label on the non crossplot svg
     * @param svg
     * @returns
     */
    const setupTimelineAndLabel = (svg: SVGSVGElement) => {
      setTimeLineElements({
        timeline: svg.getElementById("timeline"),
        timelineUp: svg.getElementById("timeline_up"),
        timelineDown: svg.getElementById("timeline_down"),
        timeLabel: svg.getElementById("TimeLineLabel"),
        timeLabelUp: svg.getElementById("TimeLineLabelUp"),
        timeLabelDown: svg.getElementById("TimeLineLabelDown")
      });
      if (svg.getElementById("timeline")) return;
      //sanitizing the svg removes timeline id, so add it back
      const timeline = document.createElementNS("http://www.w3.org/2000/svg", "line");
      timeline.setAttribute("id", "timeline");
      //timeline_up and timeline_down are still in the svg after sanitization
      const timelineUp = svg.getElementById("timeline_up");
      if (!timelineUp) return;
      for (const attr of timelineUp.attributes) {
        if (attr.name === "id") continue;
        timeline.setAttribute(attr.name, attr.value);
      }
      svg.appendChild(timeline);
      setTimeLineElements({
        timeline,
        timelineUp,
        timelineDown: svg.getElementById("timeline_down"),
        timeLabel: svg.getElementById("TimeLineLabel"),
        timeLabelUp: svg.getElementById("TimeLineLabelUp"),
        timeLabelDown: svg.getElementById("TimeLineLabelDown")
      });
      const timeLabelUp = svg.getElementById("TimeLineLabelUp");
      const timeLabelDown = svg.getElementById("TimeLineLabelDown");
      if (!timeLabelUp.firstChild || !timeLabelDown.firstChild) return;
      timeLabelUp.firstChild.nodeValue = "-1";
      timeLabelDown.firstChild.nodeValue = "+1";
    };

    /**
     * handle the cursor and timeline movement on the non crossplot svg
     * @param evt
     * @param svg
     * @returns
     */
    const handleTimeline = (evt: MouseEvent, svg: SVGSVGElement) => {
      if (!timeLineElements) {
        return;
      }
      const { timeline, timelineUp, timelineDown, timeLabel, timeLabelUp, timeLabelDown } = timeLineElements;
      //cursor location
      let point = new DOMPoint();
      point.x = evt.clientX;
      point.y = evt.clientY;
      if (svg.getScreenCTM()) {
        //converts coordinates
        point = point.matrixTransform(svg.getScreenCTM()!.inverse());
      }
      const minY = Number(timeline.getAttribute("miny"));
      const maxY = Number(timeline.getAttribute("maxy"));

      const indicatorLineWidth = 10;
      //move timeline horizontally
      timelineUp.setAttribute("x1", String(point.x - indicatorLineWidth / 2));
      timelineUp.setAttribute("x2", String(point.x + indicatorLineWidth / 2));

      timelineDown.setAttribute("x1", String(point.x - indicatorLineWidth / 2));
      timelineDown.setAttribute("x2", String(point.x + indicatorLineWidth / 2));

      timeLabel.setAttribute("x", String(point.x + 12));
      timeLabelUp.setAttribute("x", String(point.x - 25));
      timeLabelDown.setAttribute("x", String(point.x - 21));

      //move timeline vertically if not locked
      if (!state.chartTab.chartTimelineLocked) {
        //for not going out of bounds
        let currY = minY;
        if (point.y > currY) currY = point.y;
        if (currY > maxY) currY = maxY;
        const scale = Number(timeline.getAttribute("vertscale"));

        timeline.setAttribute("y1", String(currY));
        timeline.setAttribute("y2", String(currY));
        timelineUp.setAttribute("y1", String(currY - scale));
        timelineUp.setAttribute("y2", String(currY - scale));
        timelineDown.setAttribute("y1", String(currY + scale));
        timelineDown.setAttribute("y2", String(currY + scale));
        timeLabel.setAttribute("y", String(currY - 5));
        timeLabelUp.setAttribute("y", String(currY - scale + 2.5));
        timeLabelDown.setAttribute("y", String(currY + scale + 2.5));

        //get age of mouse location
        const topAge = Number(timeline.getAttribute("topage"));
        const currAge = topAge + (currY - minY) / scale;
        if (timeLabel.firstChild) timeLabel.firstChild.nodeValue = String(Math.round(currAge * 1000) / 1000);
      }
    };

    /**
     * hide or show the timeline on the non crossplot svg
     */
    const hideOrShowTimeline = (show: boolean) => {
      if (!timeLineElements) {
        return;
      }
      const { timeline, timelineUp, timelineDown, timeLabel, timeLabelUp, timeLabelDown } = timeLineElements;
      timeline.setAttribute(
        "style",
        show ? "stroke: red; stroke-width: 0.5; stroke-opacity: 1;" : "stroke-opacity: 0;"
      );
      timelineUp.setAttribute(
        "style",
        show ? "stroke: red; stroke-width: 0.5; stroke-opacity: 1;" : "stroke-opacity: 0;"
      );
      timelineDown.setAttribute(
        "style",
        show ? "stroke: red; stroke-width: 0.5; stroke-opacity: 1;" : "stroke-opacity: 0;"
      );
      timeLabel.setAttribute("style", show ? "font-size: 10; fill: red; fill-opacity: 0.7;" : "fill-opacity: 0;");
      timeLabelUp.setAttribute("style", show ? "font-size: 10; fill: red; fill-opacity: 0.7;" : "fill-opacity: 0;");
      timeLabelDown.setAttribute("style", show ? "font-size: 10; fill: red; fill-opacity: 0.7;" : "fill-opacity: 0;");
    };

    // setup the timeline and label on the svg
    useEffect(() => {
      if (typeof ref === "function" || !ref) return;
      const container = ref.current;
      if (!container) return;
      const svg = container.querySelector("svg");
      if (!svg) return;
      setupTimelineAndLabel(svg);
      hideOrShowTimeline(chartTimelineEnabled);
    }, [ref, chartContent, chartTimelineEnabled]);

    useEffect(() => {
      if (typeof ref === "function" || !ref) return;
      const container = ref.current;
      if (!container) return;
      const svg = container.querySelector("svg");
      if (!svg) return;
      // either timeline or popups
      if (chartTimelineEnabled) {
        // crossplot or non crossplot
        const eventListenerWrapper = (evt: MouseEvent) => handleTimeline(evt, svg);
        const lockTimeline = () => actions.setChartTimelineLocked(!state.chartTab.chartTimelineLocked);
        container.addEventListener("mousemove", eventListenerWrapper);
        container.addEventListener("click", lockTimeline);
        return () => {
          container.removeEventListener("mousemove", eventListenerWrapper);
          container.removeEventListener("click", lockTimeline);
        };
      } else if (state.prevSettings.mouseOverPopupsEnabled) {
        const eventListenerWrapper = (evt: MouseEvent) => handleSvgEvent(evt, container);
        container.addEventListener("mouseover", eventListenerWrapper);
        container.addEventListener("mouseout", eventListenerWrapper);
        container.addEventListener("click", eventListenerWrapper);
        return () => {
          container.removeEventListener("mouseover", eventListenerWrapper);
          container.removeEventListener("mouseout", eventListenerWrapper);
          container.removeEventListener("click", eventListenerWrapper);
        };
      }
    }, [
      ref,
      chartContent,
      chartTimelineEnabled,
      state.chartTab.chartTimelineLocked,
      state.prevSettings.mouseOverPopupsEnabled,
      timeLineElements
    ]);

    return <div ref={ref} id="svg-display" dangerouslySetInnerHTML={{ __html: chartContent }} />;
  })
);
