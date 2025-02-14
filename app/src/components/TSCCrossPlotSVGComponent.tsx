import { roundToDecimalPlace } from "@tsconline/shared";
import React, { forwardRef, useContext, useEffect } from "react";
import { context } from "../state";
import { observer } from "mobx-react-lite";
import { ChartContext } from "../Chart";
type TimeLineElements = {
  timeLineX: Element;
  timeLineY: Element;
  timeLabelX: Element;
  timeLabelY: Element;
  limitingBox: Element;
  timeLinesGroup: Element;
  timeLabelsGroup: Element;
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
const getCursor = (svg: SVGSVGElement, evt: MouseEvent) => {
  const point = new DOMPoint();
  point.x = evt.clientX;
  point.y = evt.clientY;
  if (svg.getScreenCTM()) {
    //converts coordinates
    return point.matrixTransform(svg.getScreenCTM()!.inverse());
  }
  return point;
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
const isOutOfBounds = (point: DOMPoint, minX: number, maxX: number, minY: number, maxY: number) => {
  return point.x < minX || point.x > maxX || point.y < minY || point.y > maxY;
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

export const TSCCrossPlotSVGComponent: React.FC = observer(
  forwardRef<HTMLDivElement>(function TSCCrossPlotSVGComponent(_, ref) {
    const { state, actions } = useContext(context);
    const { chartTabState, otherChartOptions } = useContext(ChartContext);
    const { chartTimelineEnabled, chartContent } = chartTabState;
    const [timeLineElements, setTimeLineElements] = React.useState<TimeLineElements | null>(null);
    useEffect(() => {
      if (typeof ref === "function" || !ref) return;
      const container = ref.current;
      if (!container || !chartContent) return;
      const svg = container.querySelector("svg");
      if (!svg) return;
      setupTimelineAndLabel(svg);
      hideOrShowTimeline(chartTimelineEnabled);
    }, [ref, chartContent, chartTimelineEnabled, typeof ref !== "function" && ref ? ref.current : null]);
    useEffect(() => {
      if (typeof ref === "function" || !ref) return;
      const container = ref.current;
      if (!container || !chartContent) return;
      const svg = container.querySelector("svg");
      if (!svg) return;
      // either timeline or popups
      if (chartTimelineEnabled) {
        // crossplot or non crossplot
        const eventListenerWrapper = (evt: MouseEvent) => handleTimeLine(evt, svg);
        const lockX = () => actions.setCrossPlotLockX(!state.crossPlot.lockX);
        const lockY = () => actions.setCrossPlotLockY(!state.crossPlot.lockY);
        const keydownListener = (evt: KeyboardEvent) => {
          if (!chartTimelineEnabled) return;
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
    }, [ref, chartContent, chartTimelineEnabled, timeLineElements]);
    useEffect(() => {
      if (typeof ref === "function" || !ref) return;
      const container = ref.current;
      if (!container || !chartContent) return;
      const svg = container.querySelector("svg");
      if (!svg) return;
      if (state.crossPlot.markerMode) {
        const handleDoubleClick = (evt: MouseEvent) => {
          const point = getCursor(svg, evt);
          if (
            !timeLineElements ||
            isOutOfBounds(
              point,
              getMinX(timeLineElements.timeLineX),
              getMaxX(timeLineElements.timeLineX),
              getMinY(timeLineElements.timeLineY),
              getMaxY(timeLineElements.timeLineY)
            )
          ) {
            return;
          }
          const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          circle.setAttribute("cx", point.x.toString());
          circle.setAttribute("cy", point.y.toString());
          circle.setAttribute("r", "5");
          circle.setAttribute("fill", "red");
          circle.setAttribute("stroke", "black");
          circle.setAttribute("stroke-width", "1");
          svg.appendChild(circle);
        };
        svg.addEventListener("dblclick", handleDoubleClick);
        return () => {
          svg.removeEventListener("dblclick", handleDoubleClick);
        };
      }
    }, [ref, chartContent, timeLineElements, state.crossPlot.markerMode]);

    const getLabelWidthX = () => {
      if (!timeLineElements) return 0;
      const { timeLabelX } = timeLineElements;
      return timeLabelX.getBoundingClientRect().width;
    };
    const getLabelHeightX = () => {
      if (!timeLineElements) return 0;
      const { timeLabelX } = timeLineElements;
      return timeLabelX.getBoundingClientRect().height;
    };
    const getLabelWidthY = () => {
      if (!timeLineElements) return 0;
      const { timeLabelY } = timeLineElements;
      return timeLabelY.getBoundingClientRect().width;
    };
    const hideOrShowTimeline = (show: boolean) => {
      if (!timeLineElements) {
        return;
      }
      const { timeLinesGroup, timeLabelsGroup, limitingBox } = timeLineElements!;
      timeLinesGroup.setAttributeNS(null, "style", show ? "stroke: red; stroke-opacity: 0.5;" : "stroke-opacity: 0;");
      timeLabelsGroup.setAttributeNS(null, "style", show ? "fill: red; fill-opacity: 0.7;" : "fill-opacity: 0;");
      limitingBox.setAttributeNS(null, "style", show ? "stroke: red; stroke-opacity: 1;" : "stroke-opacity: 0;");
    };
    const setupTimelineAndLabel = (svg: SVGSVGElement) => {
      setTimeLineElements({
        timeLineX: svg.getElementById("timelineX"),
        timeLineY: svg.getElementById("timelineY"),
        timeLabelX: svg.getElementById("TimeLineLabelX"),
        timeLabelY: svg.getElementById("TimeLineLabelY"),
        limitingBox: svg.getElementById("CrossplotLimitingBox"),
        timeLinesGroup: svg.getElementById("CrossPlotTimeLines"),
        timeLabelsGroup: svg.getElementById("CrossPlotTimeLabels")
      });
      if (!timeLineElements) {
        return;
      }
      const { timeLineX, timeLineY, timeLabelX, timeLabelY, limitingBox } = timeLineElements;
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
     * handle the timeline movement with the cursor on the crossplot svg
     * @param evt
     * @param svg
     * @returns
     */
    const handleTimeLine = (evt: MouseEvent, svg: SVGSVGElement) => {
      if (!timeLineElements) {
        return;
      }
      const { timeLineX, timeLineY, timeLabelX, timeLabelY } = timeLineElements;
      const maxX = getMaxX(timeLineX);
      const minX = getMinX(timeLineX);
      const topAgeX = getTopAge(timeLineX);
      const scaleX = getScale(timeLineX);

      const maxY = getMaxY(timeLineY);
      const minY = getMinY(timeLineY);
      const topAgeY = getTopAge(timeLineY);
      const scaleY = getScale(timeLineY);

      const textsize = getTextSize(svg);
      const point = getCursor(svg, evt);
      const currX = keepInBounds(point.x, minX, maxX);
      const currY = keepInBounds(point.y, minY, maxY);
      //move timeline vertically if not locked
      if (!state.crossPlot.lockY) {
        timeLineY.setAttribute("y1", String(currY));
        timeLineY.setAttribute("y2", String(currY));
      }
      if (!state.crossPlot.lockX) {
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
    return <div ref={ref} id="svg-display" dangerouslySetInnerHTML={{ __html: chartContent }} />;
  })
);
