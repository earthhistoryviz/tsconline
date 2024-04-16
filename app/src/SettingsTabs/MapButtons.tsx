import { Button, IconButton, Theme, Tooltip, TooltipProps, styled, useTheme } from "@mui/material";
import { FaciesOptions } from "../types";
import { Bounds, ColumnInfo, InfoPoints, MapPoints, Transects, isRectBounds, isVertBounds } from "@tsconline/shared";
import { useContext, useState } from "react";
import { observer } from "mobx-react-lite";
import { actions, context } from "../state";
import { useTransformEffect } from "react-zoom-pan-pinch";
import { calculateRectBoundsPosition, calculateRectButton, calculateVertBoundsPosition } from "../util/coordinates";
import NotListedLocationIcon from "@mui/icons-material/NotListedLocation";
import LocationOffIcon from "@mui/icons-material/LocationOff";
import LocationOnSharpIcon from "@mui/icons-material/LocationOnSharp";
import { devSafeUrl } from "../util";
import { BorderedIcon } from "../components";
import { checkIfDataIsInRange } from "../util/util";

const IconSize = 40;
export const InfoIcon = NotListedLocationIcon;
export const DisabledIcon = LocationOffIcon;
export const AvailableIcon = LocationOnSharpIcon;

export const ChildMapIcon = () => {
  return (
    <div className="child-map-icon-container">
      <div className="child-map-icon" />
    </div>
  );
};

type TooltipComponentProps = {
  container: HTMLDivElement | null;
  className?: string;
} & TooltipProps;
// TODO: might want to change if it ever updates, weird workaround here, can see this at
// changing it with normal styles cannot override since this uses a portal to create outside the DOM
// https://mui.com/material-ui/guides/interoperability/#global-css
const MapPointTooltip = styled(({ className, container, ...props }: TooltipComponentProps) => {
  // IMPORTANT: this is needed when fullscreened because the tooltips are appended to the document.body
  // normally. When in fullscreen the document.body is in the background and therefore you can't see
  // the tooltip. To "hack" around this, we append to the fullscreened element which we pass as container
  const popperProps = {
    container: container && document.fullscreenElement ? container : document.body
  };
  return <Tooltip arrow followCursor classes={{ popper: className }} PopperProps={popperProps} {...props} />;
})`
  .MuiTooltip-tooltip {
    background-color: ${(props) => props.theme.palette.tooltip.main};
    padding-left: 20px;
  }
`;
type MapPointButtonProps = {
  mapPoint: MapPoints[string] | InfoPoints[string];
  x: number;
  y: number;
  name: string;
  isInfo?: boolean;
  container: HTMLDivElement | null;
};

// mapPointButton that pulls up the map points on the image
// mapPoint: the information of the map point
// x: % from the left
// y: % from the top
// name: name of the map point
// isInfo: will default to false. is this point an info button?
const MapPointButton: React.FC<MapPointButtonProps> = observer(
  ({ mapPoint, x, y, name, isInfo = false, container }) => {
    const theme = useTheme();
    const { state } = useContext(context);
    const column = state.settingsTabs.columnHashMap.get(name);
    if (!column) {
      console.log(`Column ${name} not found in columnHashMap`);
    }
    const clicked = column ? column.on : false;
    // is an info point if given or doesn't exist in hash map
    isInfo = isInfo || !column;
    const disabled = column
      ? !checkIfDataIsInRange(
          column.minAge,
          column.maxAge,
          state.settings.timeSettings[column.units].topStageAge,
          state.settings.timeSettings[column.units].baseStageAge
        )
      : false;
    const scaleButton = !isInfo && state.mapState.isFacies;

    // below is the hook for grabbing the scale from map image scaling
    const [scale, setScale] = useState(1);
    useTransformEffect(({ state }) => {
      // console.log(state); // { previousScale: 1, scale: 1, positionX: 0, positionY: 0 }
      setScale(state.scale);
      return () => {
        // unmount
      };
    });
    const color = getColor(theme, disabled, isInfo, clicked);
    // scale only if it isn't an info point and in facies mode
    const iconSize = scaleButton ? IconSize + state.mapState.currentFaciesOptions.dotSize * 3 : IconSize;
    let adjustY = iconSize / scale;
    if (scaleButton) {
      adjustY = iconSize / 2 / scale;
    }

    return (
      <>
        <MapPointTooltip
          container={container}
          title={
            <>
              <h3 className="header">{`${name}`}</h3>
              <ul>
                <li>Latitude: {mapPoint.lat}</li>
                <li>Longitude: {mapPoint.lon}</li>
                {/* <li>Default: {mapPoint.default || '--'}</li>
            <li>Minimum Age: {mapPoint.minage || '--'}</li>
            <li>Maximum Age: {mapPoint.maxage || '--'}</li> */}
                <li>Note: {mapPoint.note || "--"}</li>
              </ul>
            </>
          }>
          <IconButton
            className="map-point"
            disableRipple={isInfo || state.mapState.isFacies}
            style={{
              left: `calc(${x}% - ${iconSize / 2 / scale}px)`,
              // we take a the full icon_size here to anchor to the
              // bottom of the icon
              color: color,
              top: `calc(${y}% - ${adjustY}px)`,
              width: `${iconSize / scale}px`,
              height: `${iconSize / scale}px`
            }}
            onClick={() => {
              if (state.mapState.isFacies || disabled || isInfo) return;
              actions.toggleSettingsTabColumn(name);
            }}
            size="large">
            {getIcon(disabled, isInfo, iconSize, scale, column)}
          </IconButton>
        </MapPointTooltip>
      </>
    );
  }
);

interface TransectLineProps {
  name: string;
  startPosition: { x: number; y: number };
  endPosition: { x: number; y: number };
  transect: Transects[string];
  onColor: string;
  offColor: string;
  container: HTMLDivElement | null;
}
/**
 * This is the clickable Transect line that connects map points together
 */
const TransectLine: React.FC<TransectLineProps> = observer(
  ({ name, startPosition, endPosition, transect, onColor, offColor, container }) => {
    const { state } = useContext(context);
    const column = state.settingsTabs.columnHashMap.get(name);
    if (!column) {
      console.log(`Column ${name} not found in columnHashMap`);
    }
    const clicked = column ? column.on : false;
    return (
      <MapPointTooltip
        container={container}
        title={
          <>
            <h3 className="header">{`${name}`}</h3>
            <ul>
              <li>Note: {transect.note || "--"}</li>
            </ul>
          </>
        }>
        <g>
          <line
            x1={`${startPosition.x}%`}
            y1={`${startPosition.y}%`}
            x2={`${endPosition.x}%`}
            y2={`${endPosition.y}%`}
            strokeWidth={10}
            strokeLinecap="round"
            stroke={`black`}
          />
          <line
            x1={`${startPosition.x}%`}
            y1={`${startPosition.y}%`}
            x2={`${endPosition.x}%`}
            y2={`${endPosition.y}%`}
            strokeWidth={9}
            strokeLinecap="round"
            stroke={clicked ? onColor : offColor}
            onClick={() => {
              if (state.mapState.isFacies) return;
              actions.toggleSettingsTabColumn(name);
            }}
          />
        </g>
      </MapPointTooltip>
    );
  }
);

/**
 * This will create the rectangular map button for any children
 * @param childName name of the child map
 * @param mapBounds bounds of the parent map
 * @param container the container for the tooltip to attach to
 * @param childBounds bounds of the child within the parent map
 * @param openChildMap opens the child map by changing the state
 * @returns
 */
export function createChildMapButton(
  childName: string,
  mapBounds: Bounds,
  container: HTMLDivElement | null,
  childBounds: Bounds,
  openChildMap: (childMap: string) => void
) {
  if (isRectBounds(childBounds) && isRectBounds(mapBounds)) {
    const { midpoint, upperLeft, width, height } = calculateRectButton(childBounds, mapBounds);
    return (
      <MapPointTooltip
        container={container}
        key={childName}
        title={
          <>
            <h3 className="header">{`${childName}`}</h3>
            <ul>
              <li>Latitude: {midpoint.y}</li>
              <li>Longitude: {midpoint.x}</li>
              {/* <li>Default: {mapPoint.default || '--'}</li>
              <li>Minimum Age: {mapPoint.minage || '--'}</li>
              <li>Maximum Age: {mapPoint.maxage || '--'}</li> */}
              {/* <li>Note: {mapPoint.note || '--'}</li> */}
            </ul>
          </>
        }>
        <Button
          disableRipple={true}
          className="child-map"
          style={{
            left: `calc(${upperLeft.x}%`,
            top: `calc(${upperLeft.y}%`,
            width: `${width}%`,
            height: `${height}%`
          }}
          onClick={() => {
            openChildMap(childName);
          }}
        />
      </MapPointTooltip>
    );
  } else {
    console.log("map and/or child bounds are not rectbounds");
    console.log(`mapBounds not recognized, mapBounds are ${JSON.stringify(mapBounds, null, 2)}`);
    console.log(`childBounds not recognized, childBounds are ${JSON.stringify(childBounds, null, 2)}`);
    return;
  }
}

/**
 * Gets position {x, y} of a map point based on the width and height
 * @param bounds Parent map bounds
 * @param point point within bounds
 * @param frameWidth frame width
 * @param frameHeight frame height
 * @returns x and y as a percentage of the frame from the top and left
 */
function getPositionOfPointBasedOnBounds(
  bounds: Bounds,
  point: MapPoints[string] | InfoPoints[string],
  frameWidth: number,
  frameHeight: number
) {
  let position = { x: 0, y: 0 };
  if (isRectBounds(bounds)) {
    position = calculateRectBoundsPosition(point.lat, point.lon, bounds);
  } else if (isVertBounds(bounds)) {
    position = calculateVertBoundsPosition(point.lat, point.lon, frameHeight, frameWidth, bounds);
  } else {
    console.log(`Bounds is not in the correct format `, JSON.stringify(bounds, null, 2));
    return null;
  }
  return position;
}

/**
 * Loads map points based on frame and parent bounds
 * @param points points to be iterated over
 * @param bounds Parent Bounds that points is within
 * @param frameWidth frame width
 * @param frameHeight frame height
 * @param isInfo is this an info point?
 * @param container this is the container that the fullscreen tooltip will attach to
 * @returns all MapPointButton Components
 */
export function loadMapPoints(
  points: MapPoints | InfoPoints,
  bounds: Bounds,
  frameWidth: number,
  frameHeight: number,
  isInfo: boolean,
  container: HTMLDivElement | null
) {
  if (!points) return;
  return Object.entries(points).map(([name, point]) => {
    if (!point) return;
    const position = getPositionOfPointBasedOnBounds(bounds, point, frameWidth, frameHeight);
    if (position == null) return;
    return (
      <MapPointButton
        key={name}
        mapPoint={point}
        x={position.x}
        y={position.y}
        name={name}
        isInfo={isInfo}
        container={container}
      />
    );
  });
}

/**
 * Loads any transect lines that connect map points from the param transects
 * Not currently connected to the column settings, so completely frontend based
 * @param transects the transects to be displayed
 * @param mapPoints the map points that the transects will connect
 * @param bounds the bounds of the overarching map
 * @param frameWidth the frameWidth of the current map in px
 * @param frameHeight the frameHeight of the current map in px
 * @param onColor the color when transects are clicked on
 * @param offColor the color when trransects are clicked off
 * @param container the container to attach to when fullscreened
 * @returns
 */
export function loadTransects(
  transects: Transects,
  mapPoints: MapPoints,
  bounds: Bounds,
  frameWidth: number,
  frameHeight: number,
  onColor: string,
  offColor: string,
  container: HTMLDivElement | null
) {
  return (
    <svg className="transect-lines">
      <defs>
        <filter id="dropshadow" x="-1" y="-1" width="3" height="3">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
          <feOffset dx="1" dy="1" result="offsetblur" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.5" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode in="offsetblur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#dropshadow)">
        {Object.entries(transects).map(([name, transect]) => {
          if (!mapPoints[transect.startMapPoint])
            throw new Error(
              `MapPoints value for  ${transect.startMapPoint} doesn't exist for given transect ${transect}`
            );
          if (!mapPoints[transect.endMapPoint])
            throw new Error(
              `MapPoints value for  ${transect.endMapPoint} doesn't exist for given transect ${transect}`
            );
          const start = mapPoints[transect.startMapPoint];
          const end = mapPoints[transect.endMapPoint];
          const startPosition = getPositionOfPointBasedOnBounds(bounds, start, frameWidth, frameHeight);
          if (!startPosition) throw new Error(`MapInfo bounds are neither vertical or rectangular for ${bounds}`);
          const endPosition = getPositionOfPointBasedOnBounds(bounds, end, frameWidth, frameHeight);
          if (!endPosition) throw new Error(`MapInfo bounds are neither vertical or rectangular for ${bounds}`);
          return (
            <TransectLine
              key={name}
              name={name}
              startPosition={startPosition}
              endPosition={endPosition}
              transect={transect}
              onColor={onColor}
              offColor={offColor}
              container={container}
            />
          );
        })}
      </g>
    </svg>
  );
}

/**
 * Return the icon based on the parameters
 * @param disabled if button is disabled i.e out of range of user
 * @param clicked if button is clicked
 * @param isInfo if an info point
 * @param iconSize icon size
 * @param scale scale of icon
 * @param name name of map point
 * @returns
 */
function getIcon(disabled: boolean, isInfo: boolean, iconSize: number, scale: number, column?: ColumnInfo) {
  const { state, actions } = useContext(context);
  if (isInfo) {
    return <BorderedIcon strokeWidth={0.2} className="icon" component={InfoIcon} />;
  } else if (state.mapState.isFacies) {
    return getFaciesIcon(
      iconSize,
      scale,
      state.mapState.currentFaciesOptions,
      actions.setSelectedMapAgeRange,
      actions.pushPresentRockType,
      column!
    );
  } else if (disabled) {
    return <BorderedIcon className="icon" component={DisabledIcon} />;
  }
  return <BorderedIcon className="icon" component={AvailableIcon} />;
}

/**
 * This returns a circle containing the image we service from the server depending on the age
 * the user selects
 * @param iconSize the icon size of the circle
 * @param scale the scale of the circle, scaled from dotSize
 * @returns
 */
function getFaciesIcon(
  iconSize: number,
  scale: number,
  currentFaciesOptions: FaciesOptions,
  setSelectedMapAgeRange: (min: number, max: number) => void,
  pushPresentRockType: (rockType: string) => void,
  column: ColumnInfo
) {
  const rockType = getRockTypeForAge(
    column,
    currentFaciesOptions.faciesAge,
    setSelectedMapAgeRange,
    pushPresentRockType
  );
  return (
    <svg width={`${iconSize / scale}px`} height={`${iconSize / scale}px`} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" stroke="black" strokeWidth="1" fill="transparent" />
      <image
        href={rockType.toLowerCase().trim() === "top" ? "" : devSafeUrl(`/public/patterns/${rockType.trim()}.PNG`)}
        x="-10"
        y="-10"
        height="44px"
        width="44px"
        clipPath="url(#clipCircle)"
      />
      <clipPath id="clipCircle">
        <circle cx="12" cy="12" r="10" />
      </clipPath>
    </svg>
  );
}

/**
 * We must parse over the array to find the suitable rocktype given the user defined age
 * @param column
 * @param currentAge
 * @param setSelectedMapAgeRange
 * @returns
 */
function getRockTypeForAge(
  column: ColumnInfo,
  currentAge: number,
  setSelectedMapAgeRange: (min: number, max: number) => void,
  pushPresentRockType: (rockType: string) => void
) {
  if (!column.subFaciesInfo || column.subFaciesInfo.length === 0) {
    return "TOP"; // Return "TOP" if there's no subFaciesInfo or it's empty
  }
  setSelectedMapAgeRange(column.minAge, column.maxAge);

  // Find the nearest time block that does not exceed the current age
  const suitableBlock = column.subFaciesInfo.find((timeBlock) => timeBlock.age >= currentAge);

  if (!suitableBlock) {
    return "TOP";
  } else {
    pushPresentRockType(suitableBlock.rockType);
    return suitableBlock.rockType;
  }
}
/**
 * Get color based on situation. Defaults to info point
 * @param theme
 * @param disabled
 * @param isInfo
 * @param clicked
 * @param column
 * @returns
 */
function getColor(theme: Theme, disabled: boolean, isInfo: boolean, clicked: boolean): string {
  let color = theme.palette.info.main;
  if (disabled) {
    color = theme.palette.disabled.main;
  } else if (!isInfo) {
    if (clicked) {
      color = theme.palette.on.main;
    } else {
      color = theme.palette.off.main;
    }
  }
  return color;
}
