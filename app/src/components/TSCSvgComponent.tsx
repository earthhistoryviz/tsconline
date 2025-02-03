import React, { useEffect, useContext } from "react";
import { context } from "../state/index";
import { observer } from "mobx-react-lite";
import { roundToDecimalPlace } from "@tsconline/shared";

interface SVGWindow extends Window {
  curHoverElemID?: string;
  curHoverTextID?: string;
}

type TSCSvgComponentProps = {
  chartContent: string;
  svgContainerRef: React.RefObject<HTMLDivElement>;
};

type CrossPlotTimeLineElements = {
  timeLineX: Element;
  timeLineY: Element;
  timeLabelX: Element;
  timeLabelY: Element;
  limitingBox: Element;
  timeLinesGroup: Element;
  timeLabelsGroup: Element;
};

type NonCrossPlotTimeLineElements = {
  timeline: Element;
  timelineUp: Element;
  timelineDown: Element;
  timeLabel: Element;
  timeLabelUp: Element;
  timeLabelDown: Element;
};

const lineStroke = "2";

// just a helper function to convert pixels to svg coordinates in case anyone needs
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const convertPixelsToSvgCoords = (svg: SVGSVGElement, x: number, y: number) => {
  const viewBox = svg.viewBox.baseVal;
  const { width, height } = svg.getBoundingClientRect();
  const { width: viewBoxWidth, height: viewBoxHeight } = viewBox;
  return {
    x: (x / width) * viewBoxWidth,
    y: (y / height) * viewBoxHeight
  };
};

const convertPixelWidthToSvgLength = (svg: SVGSVGElement, length: number) => {
  const viewBox = svg.viewBox.baseVal;
  const { width } = svg.getBoundingClientRect();
  const { width: viewBoxWidth } = viewBox;
  return (length / width) * viewBoxWidth;
};
const convertPixelHeightToSvgLength = (svg: SVGSVGElement, length: number) => {
  const viewBox = svg.viewBox.baseVal;
  const { height } = svg.getBoundingClientRect();
  const { height: viewBoxHeight } = viewBox;
  return (length / height) * viewBoxHeight;
};

const getX1 = (element: Element) => {
  return Number(element.getAttribute("x1"));
};
const getY1 = (element: Element) => {
  return Number(element.getAttribute("y1"));
};
const getMaxX = (element: Element) => {
  return Number(element.getAttribute("maxX")) || Number(element.getAttribute("maxx"));
};
const getMinX = (element: Element) => {
  return Number(element.getAttribute("minX")) || Number(element.getAttribute("minx"));
};
const getMaxY = (element: Element) => {
  return Number(element.getAttribute("maxY")) || Number(element.getAttribute("maxy"));
};
const getMinY = (element: Element) => {
  return Number(element.getAttribute("minY")) || Number(element.getAttribute("miny"));
};
const getTopLimit = (element: Element) => {
  return Number(element.getAttribute("topLimit")) || Number(element.getAttribute("toplimit"));
};
const getBaseLimit = (element: Element) => {
  return Number(element.getAttribute("baseLimit")) || Number(element.getAttribute("baselimit"));
};
const getScale = (element: Element) => {
  return Number(element.getAttribute("vertScale")) || Number(element.getAttribute("vertscale"));
};
const getTopAge = (element: Element) => {
  return Number(element.getAttribute("topage"));
};
const keepInBounds = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value));
};
const getSvgScale = (svg: SVGSVGElement) => {
  return 1 / svg.getScreenCTM()!.a;
};
const getDocScale = (svg: SVGSVGElement) => {
  return 1 / Number(svg.getAttribute("doc-scale") || 1);
};

const getTextSize = (svg: SVGSVGElement) => {
  const textSize = 20;
  return Math.round(textSize * getDocScale(svg) < textSize ? textSize : Math.round(textSize * getDocScale(svg)));
};

const keepLabelInXBounds = (x: number, maxX: number, labelWidth: number, gap: number = 0) => {
  return x + labelWidth + gap > maxX ? Math.min(x - labelWidth - gap, maxX - labelWidth - gap) : x + gap;
};
const keepLabelInYBounds = (y: number, minY: number, labelHeight: number, gap: number = 0) => {
  return y - labelHeight - gap < minY ? Math.max(y + labelHeight + gap, minY + labelHeight + gap) : y - gap;
};
const showCurrAgeX = (
  elem: Element,
  x: number,
  y: number,
  textsize: number,
  scale: number,
  topAge: number,
  minX: number,
  maxX: number,
  labelWidth: number,
  labelHeight: number
) => {
  const currX = keepInBounds(x, minX, maxX);
  const currAgeX = roundToDecimalPlace(topAge + (currX - minX) / scale, 3).toFixed(3);
  const xPos = keepLabelInXBounds(x, maxX, labelWidth, textsize * 0.1);
  const yPos = keepLabelInYBounds(y, 0, labelHeight, labelHeight);
  elem.setAttributeNS(null, "x", String(xPos));
  elem.setAttributeNS(null, "y", String(yPos));
  if (elem.firstChild) elem.firstChild!.nodeValue = String(currAgeX);
  return currAgeX;
};

const showCurrAgeY = (
  elem: Element,
  x: number,
  y: number,
  textsize: number,
  scale: number,
  topAge: number,
  minY: number,
  maxY: number,
  maxX: number,
  labelWidth: number
) => {
  const currY = keepInBounds(y, minY, maxY);
  const currAgeY = roundToDecimalPlace(topAge + (currY - minY) / scale, 3).toFixed(3);
  const xPos = keepLabelInXBounds(x, maxX, labelWidth, 0.5 * labelWidth);
  const yPos = currY - textsize * 0.1;
  elem.setAttributeNS(null, "x", String(xPos));
  elem.setAttributeNS(null, "y", String(yPos));
  if (elem.firstChild) elem.firstChild!.nodeValue = String(currAgeY);
  return currAgeY;
};

export const TSCSvgComponent: React.FC<TSCSvgComponentProps> = observer(({ svgContainerRef, chartContent }) => {
  const { state, actions } = useContext(context);
  const [crossPlotTimeLineElements, setCrossPlotTimeLineElements] = React.useState<CrossPlotTimeLineElements | null>(
    null
  );
  const [nonCrossPlotTimeLineElements, setNonCrossPlotTimeLineElements] =
    React.useState<NonCrossPlotTimeLineElements | null>(null);

  const getLabelWidthX = () => {
    if (!crossPlotTimeLineElements) return 0;
    const { timeLabelX } = crossPlotTimeLineElements;
    return timeLabelX.getBoundingClientRect().width;
  };
  const getLabelHeightX = () => {
    if (!crossPlotTimeLineElements) return 0;
    const { timeLabelX } = crossPlotTimeLineElements;
    return timeLabelX.getBoundingClientRect().height;
  };
  const getLabelWidthY = () => {
    if (!crossPlotTimeLineElements) return 0;
    const { timeLabelY } = crossPlotTimeLineElements;
    return timeLabelY.getBoundingClientRect().width;
  };
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
            const elem = svgEventWindow.curHoverElemID ? document.getElementById(svgEventWindow.curHoverElemID) : null;
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
  const setupTimelineAndLabelNonCrossPlot = (svg: SVGSVGElement) => {
    setNonCrossPlotTimeLineElements({
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
    setNonCrossPlotTimeLineElements({
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
   * setup the base elements and positioning of the timeline and label on the crossplot svg
   * @param svg
   * @returns
   */
  const setupTimelineAndLabelCrossPlot = (svg: SVGSVGElement) => {
    setCrossPlotTimeLineElements({
      timeLineX: svg.getElementById("timelineX"),
      timeLineY: svg.getElementById("timelineY"),
      timeLabelX: svg.getElementById("TimeLineLabelX"),
      timeLabelY: svg.getElementById("TimeLineLabelY"),
      limitingBox: svg.getElementById("CrossplotLimitingBox"),
      timeLinesGroup: svg.getElementById("CrossPlotTimeLines"),
      timeLabelsGroup: svg.getElementById("CrossPlotTimeLabels")
    });
    if (!crossPlotTimeLineElements) {
      return;
    }
    const { timeLineX, timeLineY, timeLabelX, timeLabelY, limitingBox } = crossPlotTimeLineElements;
    const minX = getMinX(timeLineX);
    const maxX = getMaxX(timeLineX);
    const topLimitX = getTopLimit(timeLineX);
    const baseLimitX = getBaseLimit(timeLineX);
    const scaleX = getScale(timeLineX);
    const topAgeX = getTopAge(timeLineX);

    const maxY = getMaxY(timeLineY);
    const minY = getMinY(timeLineY);
    const topLimitY = getTopLimit(timeLineY);
    const baseLimitY = getBaseLimit(timeLineY);
    const scaleY = getScale(timeLineY);
    const topAgeY = getTopAge(timeLineY);

    const svgScale = getSvgScale(svg);

    const ageToX = (age: number) => {
      return Math.min(minX + (age > topAgeX ? Math.round((age - topAgeX) * scaleX) : 0), maxX);
    };
    const depthToY = (depth: number) => {
      return Math.min(minY + (depth > topAgeY ? Math.round((depth - topAgeY) * scaleY) : 0), maxY);
    };
    const limitWidth = ageToX(baseLimitX) - ageToX(topLimitX);
    const limitHeight = depthToY(baseLimitY) - depthToY(topLimitY);
    const textsize = getTextSize(svg);

    limitingBox.setAttributeNS(null, "x", String(ageToX(topLimitX)));
    limitingBox.setAttributeNS(null, "y", String(depthToY(topLimitY)));
    limitingBox.setAttributeNS(null, "width", String(limitWidth));
    limitingBox.setAttributeNS(null, "height", String(limitHeight));
    limitingBox.setAttributeNS(null, "stroke-width", lineStroke);

    timeLineX.setAttributeNS(null, "stroke-width", lineStroke);
    timeLineY.setAttributeNS(null, "stroke-width", lineStroke);

    timeLabelX.setAttributeNS(
      null,
      "font-size",
      String(textsize * svgScale < 20 ? 20 : Math.round(textsize * svgScale))
    );
    timeLabelX.setAttributeNS(null, "dominant-baseline", "text-after-edge");
    timeLabelY.setAttributeNS(
      null,
      "font-size",
      String(textsize * svgScale < 20 ? 20 : Math.round(textsize * svgScale))
    );
  };

  /**
   * handle the cursor and timeline movement on the non crossplot svg
   * @param evt
   * @param svg
   * @returns
   */
  const handleTimelineNonCrossPlot = (evt: MouseEvent, svg: SVGSVGElement) => {
    if (!nonCrossPlotTimeLineElements) {
      return;
    }
    const { timeline, timelineUp, timelineDown, timeLabel, timeLabelUp, timeLabelDown } = nonCrossPlotTimeLineElements;
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
   * handle the timeline movement with the cursor on the crossplot svg
   * @param evt
   * @param svg
   * @returns
   */
  const handleTimeLineCrossPlot = (evt: MouseEvent, svg: SVGSVGElement) => {
    if (!crossPlotTimeLineElements) {
      return;
    }
    const { timeLineX, timeLineY, timeLabelX, timeLabelY } = crossPlotTimeLineElements;
    const maxX = getMaxX(timeLineX);
    const minX = getMinX(timeLineX);
    const topAgeX = getTopAge(timeLineX);
    const scaleX = getScale(timeLineX);

    const maxY = getMaxY(timeLineY);
    const minY = getMinY(timeLineY);
    const topAgeY = getTopAge(timeLineY);
    const scaleY = getScale(timeLineY);

    const textsize = getTextSize(svg);
    //cursor location
    let point = new DOMPoint();
    point.x = evt.clientX;
    point.y = evt.clientY;
    if (svg.getScreenCTM()) {
      //converts coordinates
      point = point.matrixTransform(svg.getScreenCTM()!.inverse());
    }
    const currX = keepInBounds(point.x, minX, maxX);
    const currY = keepInBounds(point.y, minY, maxY);
    //move timeline vertically if not locked
    if (!state.chartTab.crossPlot.lockY) {
      timeLineY.setAttribute("y1", String(currY));
      timeLineY.setAttribute("y2", String(currY));
    }
    if (!state.chartTab.crossPlot.lockX) {
      timeLineX.setAttribute("x1", String(currX));
      timeLineX.setAttribute("x2", String(currX));
    }
    showCurrAgeX(
      timeLabelX,
      getX1(timeLineX),
      point.y,
      textsize,
      scaleX,
      topAgeX,
      minX,
      maxX,
      convertPixelWidthToSvgLength(svg, getLabelWidthX()),
      convertPixelHeightToSvgLength(svg, getLabelHeightX())
    );
    showCurrAgeY(
      timeLabelY,
      point.x,
      getY1(timeLineY),
      textsize,
      scaleY,
      topAgeY,
      minY,
      maxY,
      maxX,
      convertPixelWidthToSvgLength(svg, getLabelWidthY())
    );
  };

  const hideOrShowTimelineCrossPlot = (show: boolean) => {
    if (!crossPlotTimeLineElements) {
      return;
    }
    const { timeLinesGroup, timeLabelsGroup, limitingBox } = crossPlotTimeLineElements!;
    timeLinesGroup.setAttributeNS(null, "style", show ? "stroke: red; stroke-opacity: 0.5;" : "stroke-opacity: 0;");
    timeLabelsGroup.setAttributeNS(null, "style", show ? "fill: red; fill-opacity: 0.7;" : "fill-opacity: 0;");
    limitingBox.setAttributeNS(null, "style", show ? "stroke: red; stroke-opacity: 1;" : "stroke-opacity: 0;");
  };

  /**
   * hide or show the timeline on the non crossplot svg
   */
  const hideOrShowTimelineNonCrossPlot = (show: boolean) => {
    if (!nonCrossPlotTimeLineElements) {
      return;
    }
    const { timeline, timelineUp, timelineDown, timeLabel, timeLabelUp, timeLabelDown } = nonCrossPlotTimeLineElements;
    timeline.setAttribute("style", show ? "stroke: red; stroke-width: 0.5; stroke-opacity: 1;" : "stroke-opacity: 0;");
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
    const container = svgContainerRef.current;
    if (!container) return;
    const svg = container.querySelector("svg");
    if (!svg) return;
    if (state.chartTab.crossPlot.isCrossPlot) {
      setupTimelineAndLabelCrossPlot(svg);
      hideOrShowTimelineCrossPlot(state.chartTab.chartTimelineEnabled);
    } else {
      setupTimelineAndLabelNonCrossPlot(svg);
      hideOrShowTimelineNonCrossPlot(state.chartTab.chartTimelineEnabled);
    }
  }, [
    state.chartTab.crossPlot.isCrossPlot,
    svgContainerRef.current,
    chartContent,
    state.chartTab.chartTimelineEnabled
  ]);

  useEffect(() => {
    const container = svgContainerRef.current;
    if (!container) return;
    const svg = container.querySelector("svg");
    if (!svg) return;
    // either timeline or popups
    if (state.chartTab.chartTimelineEnabled) {
      // crossplot or non crossplot
      if (!state.chartTab.crossPlot.isCrossPlot) {
        const eventListenerWrapper = (evt: MouseEvent) => handleTimelineNonCrossPlot(evt, svg);
        const lockTimeline = () => actions.setChartTimelineLocked(!state.chartTab.chartTimelineLocked);
        container.addEventListener("mousemove", eventListenerWrapper);
        container.addEventListener("click", lockTimeline);
        return () => {
          container.removeEventListener("mousemove", eventListenerWrapper);
          container.removeEventListener("click", lockTimeline);
        };
      } else {
        const eventListenerWrapper = (evt: MouseEvent) => handleTimeLineCrossPlot(evt, svg);
        const lockX = () => actions.setCrossPlotLockX(!state.chartTab.crossPlot.lockX);
        const lockY = () => actions.setCrossPlotLockY(!state.chartTab.crossPlot.lockY);
        const keydownListener = (evt: KeyboardEvent) => {
          if (!state.chartTab.chartTimelineEnabled) return;
          if (evt.key === "x") {
            lockX();
          } else if (evt.key === "y") {
            lockY();
          }
        };
        container.addEventListener("mousemove", eventListenerWrapper);
        window.addEventListener("keydown", keydownListener);
        return () => {
          container.removeEventListener("mousemove", eventListenerWrapper);
          window.removeEventListener("keydown", keydownListener);
        };
      }
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
    svgContainerRef.current,
    chartContent,
    state.chartTab.chartTimelineEnabled,
    state.chartTab.chartTimelineLocked,
    state.prevSettings.mouseOverPopupsEnabled,
    state.chartTab.crossPlot.isCrossPlot,
    crossPlotTimeLineElements,
    nonCrossPlotTimeLineElements
  ]);

  return <div ref={svgContainerRef} id="svg-display" dangerouslySetInnerHTML={{ __html: chartContent }} />;
});
