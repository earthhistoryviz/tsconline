import { Box, Button, IconButton, SvgIcon, Tooltip, TooltipProps, styled, useTheme } from "@mui/material";
import { FaciesOptions, LegendItem } from "../types";
import { Bounds, ColumnInfo, FaciesLocations, InfoPoints, MapPoints, Transects, isRectBounds, isVertBounds } from "@tsconline/shared";
import { useContext, useState } from "react";
import { observer } from "mobx-react-lite";
import { actions, context } from "../state";
import { useTransformEffect } from "react-zoom-pan-pinch";
import { calculateRectBoundsPosition, calculateRectButton, calculateVertBoundsPosition } from "../coordinates";
import NotListedLocationIcon from "@mui/icons-material/NotListedLocation";
import LocationOffIcon from "@mui/icons-material/LocationOff";
import LocationOnSharpIcon from "@mui/icons-material/LocationOnSharp";
import { devSafeUrl } from "../util";
import { TypographyText } from "../components";

const ICON_SIZE = 40;
const InfoIcon = NotListedLocationIcon;
const OffIcon = LocationOffIcon;
const OnIcon = LocationOnSharpIcon;

export const ChildMapIcon = () => {
  return (
    <div className="child-map-icon-container">
      <div className="child-map-icon" />
    </div>
  );
};

export const BorderedIcon = ({
  component,
  className,
}: {
  component: React.ElementType<any>;
  className: string;
}) => {
  return (
    <SvgIcon
      className={className}
      component={component}
      style={{
        fontSize: 40,
        fill: "currentColor",
        stroke: "black",
        strokeWidth: "0.5",
      }}
    />
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
    container:
      container && document.fullscreenElement ? container : document.body,
  };
  return <Tooltip
  arrow
  followCursor
  classes={{ popper: className }}
  PopperProps={popperProps}
  {...props} />
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
    const column = state.settingsTabs.columnHashMap.get(name)
    const clicked = column ? column.on : false

    // below is the hook for grabbing the scale from map image scaling
    const [scale, setScale] = useState(1);
    useTransformEffect(({ state }) => {
      // console.log(state); // { previousScale: 1, scale: 1, positionX: 0, positionY: 0 }
      setScale(state.scale);
      return () => {
        // unmount
      };
    });
    const color = isInfo || !column
      ? `${theme.palette.disabled.main}`
      : `${clicked ? theme.palette.on.main : theme.palette.off.main}`;

    // scale only if it isn't an info point and in facies mode
    const iconSize =
      !isInfo && state.mapState.isFacies
        ? ICON_SIZE + state.mapState.currentFaciesOptions.dotSize * 3
        : ICON_SIZE;

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
          }
        >
          <IconButton
            className="map-point"
            disableRipple={isInfo || state.mapState.isFacies}
            style={{
              left: `calc(${x}% - ${iconSize / 2 / scale}px)`,
              // we take a the full icon_size here to anchor to the
              // bottom of the icon
              color: color,
              top: `calc(${y}% - ${
                !isInfo && state.mapState.isFacies
                  ? iconSize / 2 / scale
                  : iconSize / scale
              }px)`,
              width: `${iconSize / scale}px`,
              height: `${iconSize / scale}px`,
            }}
            onClick={() => {
              if (state.mapState.isFacies) return;
              actions.toggleSettingsTabColumn(name)
            }}
          >
            {getIcon(clicked, isInfo, iconSize, scale, name, column)}
          </IconButton>
        </MapPointTooltip>
      </>
    );
  }
);

interface TransectLineProps {
  name: string,
  startPosition: {x: number, y: number},
  endPosition: {x: number, y: number},
  transect: Transects[string],
  onColor: string,
  offColor: string,
  container: HTMLDivElement | null,
}
/**
 * This is the clickable Transect line that connects map points together
 * TODO: Currently not connected to the column settings.
 */
const TransectLine: React.FC<TransectLineProps> = observer(({name, startPosition, endPosition, transect, onColor, offColor, container}) => {
  const [on, setOn] = useState(transect.on)
  function toggleOn() {
    setOn(!on)
  }
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
      }
      >
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
          stroke={on ? onColor : offColor}
          onClick={toggleOn}
        />
        </g>
      </MapPointTooltip>
  );
})

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
    const { midpoint, upperLeft, width, height } = calculateRectButton(
      childBounds,
      mapBounds
    );
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
        }
      >
        <Button
          disableRipple={true}
          className="child-map"
          style={{
            left: `calc(${upperLeft.x}%`,
            top: `calc(${upperLeft.y}%`,
            width: `${width}%`,
            height: `${height}%`,
          }}
          onClick={() => {
            openChildMap(childName);
          }}
        />
      </MapPointTooltip>
    );
  } else {
    console.log("map and/or child bounds are not rectbounds");
    console.log(
      `mapBounds not recognized, mapBounds are ${JSON.stringify(
        mapBounds,
        null,
        2
      )}`
    );
    console.log(
      `childBounds not recognized, childBounds are ${JSON.stringify(
        childBounds,
        null,
        2
      )}`
    );
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
    position = calculateVertBoundsPosition(
      point.lat,
      point.lon,
      frameHeight,
      frameWidth,
      bounds
    );
  } else {
    console.log(
      `Bounds is not in the correct format `,
      JSON.stringify(bounds, null, 2)
    );
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
    const position = getPositionOfPointBasedOnBounds(
      bounds,
      point,
      frameWidth,
      frameHeight
    );
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
    <svg 
    className="transect-lines"
    >
    <defs>
      <filter id="dropshadow" x="-1" y="-1" width="3" height="3">
        <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
        <feOffset dx="1" dy="1" result="offsetblur"/>
        <feComponentTransfer>
          <feFuncA type="linear" slope="0.5"/>
        </feComponentTransfer>
        <feMerge> 
          <feMergeNode in="offsetblur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
      <g filter="url(#dropshadow)">
    {
    Object.entries(transects).map(([name, transect]) => {
      if (!mapPoints[transect.startMapPoint]) throw new Error(`MapPoints value for  ${transect.startMapPoint} doesn't exist for given transect ${transect}`)
      if (!mapPoints[transect.endMapPoint]) throw new Error(`MapPoints value for  ${transect.endMapPoint} doesn't exist for given transect ${transect}`)
      const start = mapPoints[transect.startMapPoint]
      const end = mapPoints[transect.endMapPoint]
      let startPosition = getPositionOfPointBasedOnBounds(
        bounds,
        start,
        frameWidth,
        frameHeight
      )
      if (!startPosition) throw new Error(`MapInfo bounds are neither vertical or rectangular for ${bounds}`)
      let endPosition = getPositionOfPointBasedOnBounds(
        bounds,
        end,
        frameWidth,
        frameHeight
      )
      if (!endPosition) throw new Error(`MapInfo bounds are neither vertical or rectangular for ${bounds}`)
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
      )
    })
    }
    </g>
    </svg>
  )
}

/**
 * Return the icon based on the parameters
 * @param clicked if button is clicked
 * @param isInfo if an info point
 * @param iconSize icon size
 * @param scale scale of icon
 * @param name name of map point
 * @returns
 */
function getIcon(
  clicked: boolean,
  isInfo: boolean,
  iconSize: number,
  scale: number,
  name: string,
  column: ColumnInfo | undefined
) {
  const { state, actions } = useContext(context);
  if (isInfo || !column) {
    return <InfoIcon className="icon" />;
  }
  if (state.mapState.isFacies) {
    const event = state.mapState.facies.locations[name]
      ? state.mapState.facies.locations[name]
      : state.mapState.facies.locations[state.mapState.facies.aliases[name]];
    return getFaciesIcon(
      iconSize,
      scale,
      event,
      state.mapState.currentFaciesOptions,
      actions.setSelectedMapAgeRange
    );
  }
  if (clicked) {
    return <BorderedIcon className="icon" component={OnIcon} />;
  }
  // if none of the above, return an off icon
  return <BorderedIcon className="icon" component={OffIcon} />;
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
  event: FaciesLocations[string] | null,
  currentFaciesOptions: FaciesOptions,
  setSelectedMapAgeRange: (min: number, max: number) => void
) {
  // this accounts for facies map points that are recorded as the parent, but they use the children as an 'alias'.
  // Therefore meaning the child has the facies information but the map point is not called by the child name but is called the parent name
  // parent -> child -> facies
  // displayed as parent -> facies
  let rockType = "top";
  // facies event exists for this map point
  if (
    event &&
    event.faciesTimeBlockArray &&
    event.faciesTimeBlockArray.length > 0
  ) {
    setSelectedMapAgeRange(event.minAge, event.maxAge);
    let i = 0;
    let timeBlock = event.faciesTimeBlockArray[i];
    let baseAge = timeBlock.age;
    // find the icon relating to the age we're in
    while (baseAge < currentFaciesOptions.faciesAge) {
      i += 1;
      if (i >= event.faciesTimeBlockArray.length) {
        // if we hit the end of possible ranges, then an icon
        // doesn't exist. so we pass top
        rockType = "top";
        break;
      }
      timeBlock = event.faciesTimeBlockArray[i];
      baseAge = timeBlock.age;
      rockType = timeBlock.rockType;
    }
  }
  return (
    <svg
      width={`${iconSize / scale}px`}
      height={`${iconSize / scale}px`}
      viewBox="0 0 24 24"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="black"
        strokeWidth="1"
        fill="transparent"
      />
      <image
        href={
          rockType.toLowerCase().trim() === "top"
            ? ""
            : devSafeUrl(`/public/patterns/${rockType.trim()}.PNG`)
        }
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

const DisplayLegendItem = ({ legendItem }: { legendItem: LegendItem }) => {
  const { color, label, icon: Icon } = legendItem;
  return (
    <Box className="legend-item-container">
      <Icon width={20} height={20} style={{ color: color }} mr={1} />
      <TypographyText className="legend-label">{label}</TypographyText>
    </Box>
  );
};

/**
 * This is the legend that describes the icons present on the 
 * map viewer. Currently uses a legend item array inherently
 * @returns a component with a header and body of icons
 */
export const Legend = () => {
  const theme = useTheme();
  const legendItems: LegendItem[] = [
    { color: theme.palette.on.main, label: "On", icon: OnIcon },
    { color: theme.palette.off.main, label: "Off", icon: OffIcon },
    { color: theme.palette.disabled.main, label: "Info point", icon: InfoIcon },
    { color: "transparent", label: "Child Map", icon: ChildMapIcon },
  ];
  return (
    <Box
      className="legend-container"
      style={{
        backgroundColor: theme.palette.navbar.dark,
      }}
    >
      {legendItems.map((item, index) => (
        <DisplayLegendItem key={index} legendItem={item} />
      ))}
    </Box>
  );
};