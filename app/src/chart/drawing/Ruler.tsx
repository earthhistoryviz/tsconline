import React from "react";
import { Layer, Line, Rect, Text } from "react-konva";
import { TimeSettings } from "../../types";

interface RulerProps {
  height: number;
  width: number;
  x: number;
  y: number;
  timeSettings: TimeSettings[string];
  mirrored?: boolean;
}
// TODO: catch error if width smaller than the width
const Ruler: React.FC<RulerProps> = ({ width, height, x, y, timeSettings, mirrored = false }) => {
  const [rulerWidth, setRulerWidth] = React.useState(width);
  const MAJOR_TICK_LENGTH = 14;
  const MINOR_TICK_LENGTH = 5;
  const INTERM_TICK_LENGTH = 7;
  const SUBDIVISION_FACTOR = [0.5, 0.4, 0.5];
  const LABEL_PADDING = 10;
  const OUTER_LABEL_PADDING = 10;

  const UNITS_PER_TICK = 6; // Example value
  let minorInterval = 0.2;
  let majorInterval = 1;
  let intermediateInterval = 0.5;
  let labelInterval = 10;
  const scale = timeSettings.unitsPerMY * 30;

  const MYperTick = UNITS_PER_TICK / scale;

  // Calculate minorInterval and majorInterval
  if (MYperTick < 0.4) {
    minorInterval = 1;
    let mulIndex = 0;
    while (minorInterval > MYperTick && minorInterval * SUBDIVISION_FACTOR[mulIndex] >= MYperTick) {
      minorInterval *= SUBDIVISION_FACTOR[mulIndex];
      mulIndex = (mulIndex + 1) % SUBDIVISION_FACTOR.length;
    }
    if (minorInterval === 1) {
      minorInterval = -1;
    }
    labelInterval = majorInterval * 5;
  } else {
    minorInterval = -1;
    let mulIndex = 0;
    while (majorInterval < MYperTick) {
      majorInterval /= SUBDIVISION_FACTOR[mulIndex];
      mulIndex = (mulIndex + 1) % SUBDIVISION_FACTOR.length;
    }
    minorInterval = majorInterval;
    majorInterval *= 5;
    labelInterval = majorInterval;
  }
  // Draw ticks
  const scaleStep = minorInterval < 0 ? majorInterval : minorInterval;
  let tickMY = timeSettings.topStageAge + scaleStep;
  const ticks = [];
  // this function is used to check if a number is a multiple of another number given a tolerance
  const isMultiple = (num: number, interval: number, tolerance = Number.EPSILON) => {
    const remainder = num % interval;
    // we do modular again since the fixed rounding can be imprecise the second time
    return parseFloat(remainder.toFixed(2)) % interval < tolerance;
  };
  while (tickMY <= timeSettings.baseStageAge) {
    tickMY = parseFloat(tickMY.toFixed(10));
    const isMajor = isMultiple(tickMY, majorInterval);
    const isIntermediate = tickMY % labelInterval === 0;
    const isMinor = isMultiple(tickMY, minorInterval);
    const tickX = mirrored ? x + rulerWidth : x;
    const tickY = (tickMY - timeSettings.topStageAge) * scale + y;

    if (isMajor) {
      ticks.push({ x: tickX, y: tickY, type: "major", value: tickMY });
    } else if (isMinor) {
      ticks.push({ x: tickX, y: tickY, type: "minor", value: tickMY });
    } else {
    }

    tickMY += scaleStep;
  }

  return (
    <Layer clipX={x} clipY={y} clipWidth={rulerWidth} clipHeight={height}>
      <Rect x={x} y={y} width={rulerWidth} height={height} stroke="black" />
      {ticks.map((tick, index) => {
        const points = mirrored
          ? [tick.x, tick.y, tick.x - (tick.type === "major" ? MAJOR_TICK_LENGTH : MINOR_TICK_LENGTH), tick.y]
          : [tick.x, tick.y, tick.x + (tick.type === "major" ? MAJOR_TICK_LENGTH : MINOR_TICK_LENGTH), tick.y];
        // this is the x position of the label, if mirrored it will be on the left side of the tick, otherwise on the right
        const maxTickLength = MAJOR_TICK_LENGTH + LABEL_PADDING;
        return (
          <React.Fragment key={index}>
            <Line points={points} stroke={tick.type === "major" ? "black" : "gray"} strokeWidth={1} />
            {tick.type == "major" && tick.value !== timeSettings.baseStageAge && (
              <Text
                x={mirrored ? tick.x - maxTickLength : tick.x + maxTickLength}
                y={tick.y - 5}
                text={`${tick.value}`}
                fontSize={12}
                fill="black"
                align={mirrored ? "right" : "left"}
                ref={(node) => {
                  if (node) {
                    if (mirrored) {
                      node.offsetX(node.width());
                    }
                    if (maxTickLength + node.width() + OUTER_LABEL_PADDING >= rulerWidth) {
                      setRulerWidth(maxTickLength + node.width() + OUTER_LABEL_PADDING);
                    }
                  }
                }}
              />
            )}
            <Rect />
          </React.Fragment>
        );
      })}
    </Layer>
  );
};

export default Ruler;
