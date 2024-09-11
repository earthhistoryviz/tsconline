import React from 'react';
import { Layer, Line, Text } from 'react-konva';
import { TimeSettings } from '../../types';

interface RulerProps {
  height: number;
  width: number;
  x: number;
  y: number;
  timeSettings: TimeSettings[string];
  mirrored?: boolean;
}

const Ruler: React.FC<RulerProps> = ({
  width,
  x,
  y,
  timeSettings,
  mirrored = false
}) => {
  const MAJOR_TICK_LENGTH = 14;
  const MINOR_TICK_LENGTH = 5;
  const INTERM_TICK_LENGTH = 7;
  const SUBDIVISIONS = [2, 5, 10]
  const SUBDIVISION_FACTOR = [0.5, 0.4, 0.5];

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
  
  while (tickMY <= timeSettings.baseStageAge) {
    const isMajor = tickMY % majorInterval === 0;
    const isIntermediate = tickMY % labelInterval === 0;
    const isMinor = tickMY % minorInterval === 0 && minorInterval > 0;

    const tickX = mirrored ? x + width - MAJOR_TICK_LENGTH : x + MAJOR_TICK_LENGTH;
    const tickY = (tickMY - timeSettings.topStageAge) * scale + y;

    if (isMajor) {
      ticks.push({ x: tickX, y: tickY, type: 'major', value: tickMY });
    } else if (isMinor) {
      ticks.push({ x: tickX, y: tickY, type: 'minor', value: tickMY });
    }

    tickMY += scaleStep;
  }

  return (
    <Layer>
      {ticks.map((tick, index) => (
        <React.Fragment key={index}>
          <Line
            points={[tick.x, tick.y, tick.x + (tick.type === 'major' ? MAJOR_TICK_LENGTH : MINOR_TICK_LENGTH), tick.y]}
            stroke={tick.type === 'major' ? 'black' : 'gray'}
            strokeWidth={1}
          />
          {tick.type == "major" && <Text
            x={tick.x + 5}
            y={tick.y - 10}
            text={`${tick.value}`}
            fontSize={12}
            fill="black"
          />}
        </React.Fragment>
      ))}
    </Layer>
  );
};

export default Ruler;
