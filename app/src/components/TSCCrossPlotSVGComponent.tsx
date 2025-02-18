import { roundToDecimalPlace } from "@tsconline/shared";
import React, { forwardRef, useContext, useEffect } from "react";
import { context } from "../state";
import { observer } from "mobx-react-lite";
import { ChartContext } from "../Chart";
import { useTheme } from "@mui/material";
import { Marker } from "../types";
type TimeLineElements = {
  timeLineX: Element;
  timeLineY: Element;
  timeLabelX: Element;
  timeLabelY: Element;
  limitingBox: Element;
  timeLinesGroup: Element;
  timeLabelsGroup: Element;
};

export const MARKER_WIDTH = 6;
export const MARKER_HEIGHT = 6;
export const MARKER_PADDING = 2;
const lineStroke = "2";
const tooltipId = "crossplot-tooltip";
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

export const ageToCoord = (age: number, min: number, max: number, topAge: number, scale: number) => {
  return Math.min(min + (age > topAge ? Math.round((age - topAge) * scale) : 0), max);
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
const coordToAge = (coord: number, scale: number, topAge: number, min: number) => {
  return roundToDecimalPlace(topAge + (coord - min) / scale, 3);
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
  const currAgeX = coordToAge(currX, scale, topAge, minX);
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
  const currAgeY = coordToAge(currY, scale, topAge, minY);
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
    const theme = useTheme();
    const { chartTabState } = useContext(ChartContext);
    const { chartTimelineEnabled, chartContent } = chartTabState;
    const [timeLineElements, setTimeLineElements] = React.useState<TimeLineElements | null>(null);
    // declare here so that comment is updated when marker changes
    const showTooltip = (event: MouseEvent, markerId: string) => {
      if (!state.crossPlot.showTooltips) return;
      let tooltip = document.getElementById(tooltipId);
      if (!tooltip) {
        tooltip = document.createElement("div");
        tooltip.id = tooltipId;
        tooltip.style.position = "absolute";
        tooltip.style.background = "rgba(0,0,0,0.5)";
        tooltip.style.color = "white";
        tooltip.style.padding = "5px 10px";
        tooltip.style.borderRadius = "5px";
        tooltip.style.pointerEvents = "none";
        tooltip.style.whiteSpace = "nowrap";
        document.body.appendChild(tooltip);
      }
      const marker = state.crossPlot.markers.find((m) => m.id === markerId);
      if (!marker) return;
      tooltip.innerHTML = `
        <strong>Age:</strong> ${marker.age} <br>
        <strong>Depth:</strong> ${marker.depth} <br>
        <strong>Comment:</strong> ${marker.comment || "No Comment"}
      `;
      tooltip.style.top = `${event.clientY + 10}px`;
      tooltip.style.left = `${event.clientX + 10}px`;
      tooltip.style.display = "block";
    };

    // setup timeline and label on first load
    useEffect(() => {
      if (typeof ref === "function" || !ref) return;
      const container = ref.current;
      if (!container || !chartContent) return;
      const svg = container.querySelector("svg");
      if (!svg) return;
      setupTimelineAndLabel(svg);
      hideOrShowTimeline(chartTimelineEnabled);
    }, [ref, chartContent, chartTimelineEnabled, typeof ref !== "function" && ref ? ref.current : null]);

    // update timeline and label when chart content changes or locking axes or mouse moves on svg
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

    // add double click listener to add marker and tooltip listeners
    useEffect(() => {
      if (!state.crossPlot.markerMode) return;
      if (typeof ref === "function" || !ref) return;
      const container = ref.current;
      if (!container || !chartContent || !state.crossPlot.crossPlotBounds) return;
      const svg = container.querySelector("svg");
      if (!svg) return;
      let cleanup = () => {};
      // create a circle on double click
      const handleDoubleClick = (evt: MouseEvent) => {
        const point = getCursor(svg, evt);
        // check if point is within bounds, otherwise don't make the point
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
        const { timeLineX, timeLineY } = timeLineElements;
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("opacity", "0");
        line.setAttribute("stroke", "black");
        line.setAttribute("stroke-width", "1.5");
        svg.appendChild(line);
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        const markerId = `marker-${Date.now()}`;
        rect.setAttribute("id", markerId);
        rect.setAttribute("x", (point.x - MARKER_WIDTH / 2).toString());
        rect.setAttribute("y", (point.y - MARKER_HEIGHT / 2).toString());
        rect.setAttribute("width", MARKER_WIDTH.toString());
        rect.setAttribute("height", MARKER_HEIGHT.toString());
        rect.setAttribute("rx", (MARKER_WIDTH / 2).toString());
        rect.setAttribute("ry", (MARKER_HEIGHT / 2).toString());
        rect.setAttribute("fill", theme.palette.button.main);
        rect.setAttribute("stroke", "black");
        rect.setAttribute("stroke-width", "1");
        svg.appendChild(rect);
        const marker = {
          id: markerId,
          element: rect,
          age: coordToAge(point.x, getScale(timeLineX), getTopAge(timeLineX), getMinX(timeLineX)),
          depth: coordToAge(point.y, getScale(timeLineY), getTopAge(timeLineY), getMinY(timeLineY)),
          x: point.x,
          y: point.y,
          color: theme.palette.button.main,
          type: "Circle" as Marker["type"],
          line,
          comment: ""
        };
        actions.addCrossPlotMarker(marker);
        const tooltip = document.getElementById(tooltipId);
        // check and add tooltip, add event listeners to the circle
        if (state.crossPlot.showTooltips) {
          const hideTooltip = () => {
            const tooltip = document.getElementById(tooltipId);
            if (tooltip) tooltip.style.display = "none";
          };
          const removeRect = (e: MouseEvent) => {
            e.preventDefault();
            hideTooltip();
            svg.removeChild(rect);
            actions.removeCrossPlotMarkers(marker.id);
            svg.removeChild(line);
          };
          rect.addEventListener("mousemove", (event) => showTooltip(event, marker.id));
          rect.addEventListener("mouseleave", hideTooltip);
          rect.addEventListener("contextmenu", removeRect);
          rect.addEventListener("click", removeRect);
          cleanup = () => {
            rect.removeEventListener("mousemove", (event) => showTooltip(event, marker.id));
            rect.removeEventListener("mouseleave", hideTooltip);
            rect.removeEventListener("contextmenu", removeRect);
            rect.removeEventListener("click", removeRect);
          };
        }
        // preserve the cleanup function
        const prev = cleanup;
        cleanup = () => {
          prev();
        };
      };
      svg.addEventListener("dblclick", handleDoubleClick);
      return () => {
        svg.removeEventListener("dblclick", handleDoubleClick);
        cleanup();
      };
    }, [ref, chartContent, timeLineElements, state.crossPlot.markerMode]);

    // set up the scale of the labels when svg changes
    useEffect(() => {
      if (typeof ref === "function" || !ref) return;
      const container = ref.current;
      if (!container || !chartContent || !timeLineElements) return;
      const { timeLabelX, timeLabelY } = timeLineElements;
      const svg = ref.current?.querySelector("svg");
      if (!svg) return;
      const svgScale = getSvgScale(svg);
      const textsize = getTextSize(svg);
      timeLabelX.setAttributeNS(
        null,
        "font-size",
        String(textsize * svgScale < 20 ? 20 : Math.round(textsize * svgScale))
      );
      timeLabelY.setAttributeNS(
        null,
        "font-size",
        String(textsize * svgScale < 20 ? 20 : Math.round(textsize * svgScale))
      );
    }, [chartTabState.chartZoomSettings.scale]);

    // remove the tooltip when the component unmounts (we keep markers)
    useEffect(() => {
      return () => {
        const tooltip = document.getElementById(tooltipId);
        if (tooltip) document.body.removeChild(tooltip);
      }
    })

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

      actions.setCrossPlotBounds({
        minX,
        minY,
        maxX,
        maxY,
        topLimitX,
        topLimitY,
        baseLimitX,
        baseLimitY,
        scaleX,
        scaleY,
        topAgeX,
        topAgeY
      });

      const svgScale = getSvgScale(svg);

      const topX = ageToCoord(topLimitX, minX, maxX, topAgeX, scaleX);
      const topY = ageToCoord(topLimitY, minY, maxY, topAgeY, scaleY);
      const limitWidth = ageToCoord(baseLimitX, minX, maxX, topAgeX, scaleX) - topX;
      const limitHeight = ageToCoord(baseLimitY, minY, maxY, topAgeY, scaleY) - topY;
      const textsize = getTextSize(svg);

      limitingBox.setAttributeNS(null, "x", String(topX));
      limitingBox.setAttributeNS(null, "y", String(topY));
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
      if (!timeLineElements || !state.crossPlot.crossPlotBounds) {
        return;
      }
      const { timeLineX, timeLineY, timeLabelX, timeLabelY } = timeLineElements;
      const { maxX, minX, maxY, minY, scaleX, scaleY, topAgeX, topAgeY } = state.crossPlot.crossPlotBounds;
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
