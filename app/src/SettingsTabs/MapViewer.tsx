import { Box, Slider, TooltipProps, Tooltip, Drawer, Divider, Typography, IconButton, Dialog, Button, SvgIcon } from '@mui/material'
import { styled, useTheme } from "@mui/material/styles"
import type { InfoPoints, MapHierarchy, Bounds, MapPoints, MapInfo} from '@tsconline/shared'
import { devSafeUrl } from '../util'
import React, { useEffect, useState, useRef, useContext } from "react"
import { context } from '../state';
import { TransformWrapper, TransformComponent, useTransformEffect } from "react-zoom-pan-pinch"
import { TSCInputAdornment, TSCNumberInput, TSCButton } from '../components'
import { isRectBounds, isVertBounds } from '@tsconline/shared'
import { calculateRectBoundsPosition, calculateVertBoundsPosition, calculateRectButton } from '../coordinates'
import CloseIcon from '@mui/icons-material/Close';
import NotListedLocationIcon from '@mui/icons-material/NotListedLocation';
import LocationOffIcon from '@mui/icons-material/LocationOff';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import LocationOnSharpIcon from '@mui/icons-material/LocationOnSharp';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import YoutubeSearchedForIcon from '@mui/icons-material/YoutubeSearchedFor';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { observer } from 'mobx-react-lite'
import './MapViewer.css'

const ICON_SIZE = 40
const InfoIcon = NotListedLocationIcon 
const OffIcon = LocationOffIcon 
const OnIcon = LocationOnSharpIcon 

const BorderedIcon = ({component, className} : {component: React.ElementType<any>, className: string}) => {
  return (
    <SvgIcon
      className={className}
      component={component}
      style={{
        fontSize: 40, 
        fill: 'currentColor', 
        stroke: 'black', 
        strokeWidth: '0.5',
      }}
    />
  );
};

const ChildMapIcon = () => {
  return (
    <div className="child-map-icon-container">
      <div className='child-map-icon'/>
    </div>
  );
};

// TODO: might want to change if it ever updates, weird workaround here, can see this at 
// changing it with normal styles cannot override since this uses a portal to create outside the DOM
// https://mui.com/material-ui/guides/interoperability/#global-css
const MapPointTooltip = styled(({className, ...props}: TooltipProps) => (
  <Tooltip arrow followCursor classes={{popper: className}} {...props}/>
))`
  .MuiTooltip-tooltip {
    background-color: ${(props) => props.theme.palette.tooltip.main};
    padding-left: 20px;
  }
`

const TypographyText = styled(Typography)(({ theme }) => ({
  color: theme.palette.primary.main 
}))

const ColoredIconButton = styled(IconButton)(({ theme }) => ({
  color: theme.palette.primary.main 
}))

const ColoredDiv = styled('div')(( {theme} ) => ({
  backgroundColor: theme.palette.navbar.dark,
}))

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 1),
  backgroundColor: theme.palette.navbar.dark ,
  ...theme.mixins.toolbar,
  justifyContent: 'space-between',
}));


    type MapProps  = {
    name: string;
    isFacies: boolean
    }

    // This component is the map itself with the image and buttons within.
export const MapViewer: React.FC<MapProps> = observer(({ name, isFacies }) => {
    const { state, actions } = useContext(context)
    const theme = useTheme()
    // we need this so it refreshes the components that require image loading
    const [imageLoaded, setImageLoaded] = useState(false)
    // this is needed to change image styles on fullscreen change
    const [isFullscreen, setIsFullscreen] = useState(false)
    // this is used to toggle the facies options
    const [faciesOptions, setFaciesOptions] = useState(true)
    // used to get the proper bounds of the element
    const imageRef = useRef<HTMLImageElement | null>(null)
    // used for attaching tooltip and fullscreening
    const mapViewerRef = useRef<HTMLDivElement | null>(null)


    // useEffect needed to know when fullscreen changes i.e escape, button, pressing child maps
    useEffect(() => {
    // Add event listener when the component mounts
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // Remove event listener when the component unmounts
    return () => {
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
    }, []);


    const handleFullscreenChange = () => {
        if (document.fullscreenElement) {
        setIsFullscreen(true)
        } else {
        setIsFullscreen(false)
        }
    }
    const openChildMap = (childMap: string) => {
      // call the new child as a regular map, with no facies
      setImageLoaded(false)
      actions.openNextMap(name, isFacies, childMap, false)
    }

    const mapInfo: MapInfo = state.mapState.mapInfo
    const mapData: MapInfo[string] = mapInfo[name]
    const mapHierarchy: MapHierarchy = state.mapState.mapHierarchy

    const Controls = (
        { 
        mapViewer,
        zoomIn, 
        zoomOut, 
        resetTransform, 
        } : {
        mapViewer: HTMLDivElement,
        zoomIn: () => void,
        zoomOut: () => void,
        resetTransform: () => void,
        }
    ) => (
        <>
        <div className="exit-buttons">
          <IconButton className="icon-view-button" onClick={actions.goBackInMapHistory}>
            <BorderedIcon component={ArrowBackIcon} className="icon-button"/>
          </IconButton>
        </div>
        <div className="controls">
            {!isFacies && <TSCButton className="bottom-button" onClick={() => { actions.openNextMap(name, isFacies, name, true)}}>Facies</TSCButton>}
            {isFacies && <TSCButton className="bottom-button" onClick={() => { setFaciesOptions(!faciesOptions) }}>Options</TSCButton>}
            <TSCButton className="bottom-button" onClick={() => actions.setIsLegendOpen(!state.mapState.isLegendOpen)}>legend</TSCButton>
        </div>
        <div className="view-buttons">
          <IconButton className="close-icon-view-button" onClick={() => actions.closeMapViewer()}>
            <BorderedIcon component={CloseIcon} className="icon-button"/>
          </IconButton>
          <IconButton className="icon-view-button" onClick={() => {
          if (document.fullscreenElement) {
              document.exitFullscreen()
          } else {
              mapViewer.requestFullscreen()
          }
          }}>
            <BorderedIcon component={FullscreenIcon} className="icon-button"/>
          </IconButton>
          <IconButton className="icon-view-button" onClick={() => zoomIn()}>
            <BorderedIcon component={ZoomInIcon} className="icon-button"/>
          </IconButton>
          <IconButton className="icon-view-button" onClick={() => zoomOut()}>
            <BorderedIcon component={ZoomOutIcon} className="icon-button"/>
          </IconButton>
          <IconButton className="icon-view-button" onClick={() => resetTransform()}>
            <BorderedIcon component={YoutubeSearchedForIcon} className="icon-button"/>
          </IconButton>
        </div>
        </>
);

const fullscreenImgStyle = {
    maxWidth: "100vw",
    height: "100vh",
    maxHeight: "100vh"
}

  const legendItems: LegendItem[] = [
      { color: theme.palette.on.main, label: 'On', icon: OnIcon},
      { color: theme.palette.off.main, label: 'Off', icon: OffIcon},
      { color: theme.palette.disabled.main, label: 'Info point', icon: InfoIcon},
      { color: 'transparent', label: 'Child Map', icon: ChildMapIcon}
  ]
return (
  <div ref={mapViewerRef} className="map-viewer">
    <TransformWrapper 
    doubleClick={{
    disabled: true 
    }}
    minScale={1} 
    maxScale={3}
    limitToBounds={true}
    >
    {(utils) => (
    <>
        <TransformComponent>
        <>
          <img
          id="map"
          ref={imageRef}
          style={
              /* 
              we need to conditionally have styles because 
              when fullscreened:   we fit the height of the image to max viewport height
              when unfullscreened: we use normal css ~90 viewport height
              */
              isFullscreen ? fullscreenImgStyle : undefined
          }
          src={devSafeUrl(mapData.img)}
          alt="Map" 
          className="map"
          onLoad={() => {setImageLoaded(true)}}
          />

          {/* Load all the map points */}
          {imageLoaded && imageRef && imageRef.current && mapData.mapPoints &&
          loadMapPoints(
            mapData.mapPoints,
            mapData.bounds, 
            imageRef.current.width, 
            imageRef.current.height, 
            false, 
            mapViewerRef.current, 
            )}

          {/* Load all the info points */}
          {imageLoaded && imageRef && imageRef.current && mapData.infoPoints && 
          loadMapPoints(
            mapData.infoPoints, 
            mapData.bounds, 
            imageRef.current.width, 
            imageRef.current.height, 
            true, 
            mapViewerRef.current, 
            )}

          {/* Load all the child maps*/}
          {Object.keys(mapHierarchy).includes(name) && mapHierarchy[name].map(child => {
              // if the parent exists, use the bounds of the parent on mapData
              // this is because the child's parent field is the bounds of this map on that parent map
              const bounds = ! mapData.parent ? mapData.bounds : mapData.parent!.bounds

              // name is the parentMap
              // mapHierarchy[name] contains all the children of the parent map
              // this will call for each child of name
              return createChildMapButton(
              child, 
              bounds, 
              mapViewerRef.current,
              mapInfo[child].parent!.bounds, 
              openChildMap
              )
              })}
        </>
        </TransformComponent>
        {mapViewerRef && mapViewerRef.current && <Controls mapViewer={mapViewerRef.current as HTMLDivElement} {...utils}/>}
    </>
    )}
    </TransformWrapper>
    <Drawer
        className="drawer"
        variant="persistent"
        anchor="left"
        open={state.mapState.isLegendOpen}
    >
        <DrawerHeader> 
        <ColoredIconButton onClick={() => {actions.setIsLegendOpen(false)}}>
            <CloseIcon fontSize="small"/>
        </ColoredIconButton>
        <TypographyText className="legend-title" variant="h6" gutterBottom>
            Color Legend
        </TypographyText>
        </DrawerHeader>
        <Divider />
        <Legend items={legendItems}/>
    </Drawer>
    <Drawer 
    className="facies-button-container drawer"
    variant="persistent"
    anchor="bottom"
    open={state.mapState.isFacies && faciesOptions}>
      <DrawerHeader>
       <TypographyText className="facies-options-title" variant="h6" gutterBottom>
         Facies Options
      </TypographyText> 
        <ColoredIconButton onClick={() => {setFaciesOptions(false)}}>
            <ArrowDropDownIcon fontSize="large"/>
        </ColoredIconButton>
      </DrawerHeader>
      <FaciesControls/>
    </Drawer>
  </div>
)})

const FaciesControls = observer(() => {
  const { state, actions } = useContext(context)
  const dotSizeRange = {min: 1, max: 20}
  const overallAgeMax = 9999999
  return (
  <ColoredDiv className="facies-buttons">
    <div className="dot-controls">
      <TypographyText className="dot-controls-title"> Dot Size </TypographyText>
      <div className="slider-container">
          <TSCNumberInput 
          className="dot-input-form"
          placeholder="Dot Size"
          max={dotSizeRange.max}
          min={dotSizeRange.min}
          value={state.mapState.currentFaciesOptions.dotSize}
          onChange={(
            _event: React.FocusEvent<HTMLInputElement, Element> | React.PointerEvent<Element> | React.KeyboardEvent<Element>,
            val: number | undefined) => {
            if (!val || val < 1 || val > 20) {
              return
            }
            actions.setDotSize(val as number)
          }}
          />
        <Slider 
        id="dot-size-slider"
        className="slider" 
        value={state.mapState.currentFaciesOptions.dotSize}
        max={20}
        min={1}
        onChange={(event: Event, val: number | number[]) => {
          actions.setDotSize(val as number)
        }}
        aria-label="Default"
        valueLabelDisplay="auto" />
      </div>
    </div>
    <div className="age-controls">
      <TypographyText> Age </TypographyText>
      <div className="slider-container">
        <TSCNumberInput 
        endAdornment={<TSCInputAdornment>MA</TSCInputAdornment>} 
        className="age-input-form"
        placeholder="Age"
        max={state.mapState.selectedMapAgeRange.maxAge}
        min={state.mapState.selectedMapAgeRange.minAge}
        value={state.mapState.currentFaciesOptions.faciesAge}
        onChange={(
          _event: React.FocusEvent<HTMLInputElement, Element> | React.PointerEvent<Element> | React.KeyboardEvent<Element>,
          val: number | undefined) => {
          if (!val || val < 0 || val > 9999999) {
            return
          }
          actions.setFaciesAge(val as number)
        }}
        />
        <Slider 
        id="number-input"
        className="slider" 
        name="Facies-Age-Slider"
        max={state.mapState.selectedMapAgeRange.maxAge}
        min={state.mapState.selectedMapAgeRange.minAge}
        value={state.mapState.currentFaciesOptions.faciesAge}
        onChange={(event: Event, val: number | number[]) => {
          actions.setFaciesAge(val as number)
        }}
        aria-label="Default"
        valueLabelDisplay="auto" />
      </div>
    </div>
  </ColoredDiv>
  )
})



type MapPointButtonProps = {
  mapPoint: MapPoints[string] | InfoPoints[string],
  x: number,
  y: number,
  name: string,
  isInfo?: boolean,
  container: HTMLDivElement | null,
}

// mapPointButton that pulls up the map points on the image
// mapPoint: the information of the map point
// x: % from the left
// y: % from the top
// name: name of the map point
// isInfo: will default to false. is this point an info button?
const MapPointButton: React.FC<MapPointButtonProps> = observer(({mapPoint, x, y, name, isInfo = false, container}) => {
  const [clicked, setClicked] = useState(Boolean((mapPoint as MapPoints[string]).default) || false)
  const theme = useTheme()
  const { state } = useContext(context)

  // below is the hook for grabbing the scale from map image scaling
  const [scale, setScale] = useState(1)
  useTransformEffect(({ state }) => {
    // console.log(state); // { previousScale: 1, scale: 1, positionX: 0, positionY: 0 }
    setScale(state.scale)
    return () => {
      // unmount
    };
  })
  // IMPORTANT: this is needed when fullscreened because the tooltips are appended to the document.body
  // normally. When in fullscreen the document.body is in the background and therefore you can't see
  // the tooltip. To "hack" around this, we append to the fullscreened element which we pass as container
  const popperProps = {
    container: container && document.fullscreenElement ? container : document.body
  }
  const color = isInfo ? `${theme.palette.disabled.main}` : `${clicked ? theme.palette.on.main : theme.palette.off.main}`

  // scale only if it isn't an info point and in facies mode
  const iconSize = !isInfo && state.mapState.isFacies ? ICON_SIZE + state.mapState.currentFaciesOptions.dotSize * 3 : ICON_SIZE


  return (
    <>
      <MapPointTooltip 
      PopperProps={
        popperProps
      }
      title={
        <>
          <h3 className="header">{`${name}`}</h3>
          <ul>
              <li>Latitude: {mapPoint.lat}</li>
              <li>Longitude: {mapPoint.lon}</li>
              {/* <li>Default: {mapPoint.default || '--'}</li>
              <li>Minimum Age: {mapPoint.minage || '--'}</li>
              <li>Maximum Age: {mapPoint.maxage || '--'}</li> */}
              <li>Note: {mapPoint.note || '--'}</li>
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
          top: `calc(${y}% - ${!isInfo && state.mapState.isFacies ? iconSize / 2 / scale : iconSize / scale}px)`,
          width: `${iconSize / scale}px`,
          height: `${iconSize / scale}px`,
        }}
        onClick={() => {
          if (state.mapState.isFacies) return
          setClicked(!clicked)
        }}
      >
        {getIcon(clicked, isInfo, iconSize, scale, name)}
      </IconButton>
      </MapPointTooltip>
    </>
  )
})

type LegendItem = {
  color: string;
  label: string;
  icon: React.ElementType<any>;
}
const DisplayLegendItem = ({ legendItem } : {legendItem: LegendItem}) => {
  const { color, label, icon: Icon} = legendItem
  return (<Box className="legend-item-container">
    <Icon
    width={20}
    height={20}
    style ={{color: color}}
    mr={1}/>
    <TypographyText className="legend-label">{label}</TypographyText>
  </Box>)
}

const Legend = ({items}: {items: LegendItem[]}) => {
  const theme = useTheme()
  return (<Box
    className="legend-container"
    style={{ 
      backgroundColor: theme.palette.navbar.dark,
      }}>
    {items.map((item, index) => (
      <DisplayLegendItem key={index} legendItem={item}/>
    ))}
  </Box>)
}


/**
 * This will create the rectangular map button for any children
 * @param childName name of the child map
 * @param mapBounds bounds of the parent map
 * @param childBounds bounds of the child within the parent map
 * @param openChildMap opens the child map by changing the state
 * @returns 
 */
function createChildMapButton(
  childName: string,
  mapBounds: Bounds,
  container: HTMLDivElement | null,
  childBounds: Bounds,
  openChildMap: (childMap: string) => void
  ) {
  if (isRectBounds(childBounds) && isRectBounds(mapBounds)) {
    const { midpoint, upperLeft, width, height } = calculateRectButton(childBounds, mapBounds)
    // IMPORTANT: this is needed when fullscreened because the tooltips are appended to the document.body
    // normally. When in fullscreen the document.body is in the background and therefore you can't see
    // the tooltip. To "hack" around this, we append to the fullscreened element which we pass as container
    const popperProps = {
      container: container && document.fullscreenElement ? container : document.body
    }
    return (
      <MapPointTooltip 
      PopperProps={popperProps}
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
        height: `${height}%`,
      }} 
      onClick={() => {
        openChildMap(childName)
      }}
      />
      </MapPointTooltip>
  )
  } else {
    console.log('map and/or child bounds are not rectbounds')
    console.log(`mapBounds not recognized, mapBounds are ${JSON.stringify(mapBounds, null, 2)}`)
    console.log(`childBounds not recognized, childBounds are ${JSON.stringify(childBounds, null, 2)}`)
    return
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
function getPositionOfPointBasedOnBounds(bounds: Bounds, point: MapPoints[string] | InfoPoints[string], frameWidth: number, frameHeight: number) { 
  let position = {x: 0, y: 0}
  if(isRectBounds(bounds)) {
    position = calculateRectBoundsPosition(point.lat, point.lon, bounds);
  } else if (isVertBounds(bounds)) {
    position = calculateVertBoundsPosition(point.lat, point.lon, frameHeight, frameWidth, bounds);
  } else {
    console.log(`Bounds is not in the correct format `, JSON.stringify(bounds, null, 2))
    return null
  }
  return position
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
function loadMapPoints(
  points: MapPoints | InfoPoints,
  bounds: Bounds, 
  frameWidth: number, 
  frameHeight: number, 
  isInfo: boolean, 
  container: HTMLDivElement | null
  ) {
  if (!points) return
  return (Object.entries(points).map(([name, point]) => {
    if (!point) return
    const position = getPositionOfPointBasedOnBounds(bounds, point, frameWidth, frameHeight)
    if (position == null) return
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
  }))
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
function getIcon(clicked: boolean, isInfo: boolean, iconSize: number, scale: number, name: string){
  const { state } = useContext(context)
  if (isInfo) {
    return (
    <InfoIcon
    className="icon"
    />)
  }
  if (state.mapState.isFacies) {
    return getFaciesIcon(iconSize, scale, name)
  }
  if (clicked) {
    return (
    <BorderedIcon 
    className="icon"
    component={OnIcon}
    />)
  }
// if none of the above, return an off icon
return (
<BorderedIcon
    className="icon"
component={OffIcon}
/>)
}

/**
 * This returns a circle containing the image we service from the server depending on the age 
 * the user selects
 * @param iconSize the icon size of the circle
 * @param scale the scale of the circle, scaled from dotSize
 * @param name the name of the map point
 * @returns 
 */
function getFaciesIcon(iconSize: number, scale: number, name: string) {
  const { state, actions } = useContext(context)
  let event = state.mapState.facies.locations[name] ? state.mapState.facies.locations[name] : state.mapState.facies.locations[state.mapState.facies.aliases[name]]
  let rockType = "top"
  // facies event exists for this map point
  if (event && event.faciesTimeBlockArray && event.faciesTimeBlockArray.length > 0) {
    actions.setSelectedMapAgeRange(event.minAge, event.maxAge )
    let i = 0
    let timeBlock = event.faciesTimeBlockArray[i]
    let baseAge = timeBlock.age
    // find the icon relating to the age we're in
    while(baseAge < state.mapState.currentFaciesOptions.faciesAge) {
      i += 1
      if (i >= event.faciesTimeBlockArray.length) {
        // if we hit the end of possible ranges, then an icon
        // doesn't exist. so we pass top
        rockType = 'top'
        break
      }
      timeBlock = event.faciesTimeBlockArray[i]
      baseAge = timeBlock.age
      rockType = timeBlock.rockType
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
        href={rockType.toLowerCase().trim() === "top" ? 
        "" : devSafeUrl(`/public/patterns/${rockType.trim()}.PNG`)
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
    )
}