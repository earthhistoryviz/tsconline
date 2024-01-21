import { TooltipProps, Tooltip, Drawer, Divider, Typography, IconButton, Dialog, Button, Box } from '@mui/material'
import { styled, useTheme } from "@mui/material/styles"
import type { InfoPoints, MapHierarchy, Bounds, MapPoints, MapInfo} from '@tsconline/shared'
import { devSafeUrl } from '../util'
import React, { useEffect, useState, useRef, useContext } from "react"
import { context } from '../state';
import { TransformWrapper, TransformComponent, useTransformEffect } from "react-zoom-pan-pinch"
import { TSCButton } from '../components'
import { isRectBounds, isVertBounds } from '@tsconline/shared'
import { calculateRectBoundsPosition, calculateVertBoundsPosition, calculateRectButton } from '../coordinates'
import CloseIcon from '@mui/icons-material/Close';
import NotListedLocationIcon from '@mui/icons-material/NotListedLocation';
import LocationOnTwoToneIcon from '@mui/icons-material/LocationOnTwoTone';
import LocationOffIcon from '@mui/icons-material/LocationOff';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import YoutubeSearchedForIcon from '@mui/icons-material/YoutubeSearchedFor';
import './MapViewer.css'
import { observer } from 'mobx-react-lite'

const ICON_SIZE = 30
const InfoIcon = NotListedLocationIcon 
const OnIcon = LocationOnTwoToneIcon 
const OffIcon = LocationOffIcon 

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


const LegendTypography = styled(Typography)(({ theme }) => ({
  color: theme.palette.primary.main 
}))

const LegendArrowDropDown = styled(IconButton)(({ theme }) => ({
  color: theme.palette.primary.main 
}))

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 1),
  backgroundColor: theme.palette.navbar.dark ,
  ...theme.mixins.toolbar,
  justifyContent: 'space-between',
}));




 // The map interface that will be recursive so that we can create "multiple" windows.
 // Nested dialogs
 // TODO: possibly a better container than dialog?
export const MapDialog = observer(function MapDialog({ name }: {name: string;}) {
    if (!name) return null
    const { state, actions } = useContext(context)
    const theme = useTheme()
    const [dialogOpen, setDialogOpen] = useState(false);
    const [childName, setChildName] = useState("")

    const handleCloseDialog = () => {
        actions.setIsLegendOpen(false)
        setDialogOpen(false);
    };
    const openChild = (childName: string) => {
        setDialogOpen(true)
        setChildName(childName)
        actions.setIsLegendOpen(false)
    }

    const legendItems: LegendItem[] = [
        { color: theme.palette.on.main, label: 'On', icon: OnIcon},
        { color: theme.palette.off.main, label: 'Off', icon: OffIcon},
        { color: theme.palette.disabled.main, label: 'Info point', icon: InfoIcon},
        { color: 'transparent', label: 'Child Map', icon: ChildMapIcon}
    ]
    return (
        <>
        <MapViewer openChild={openChild} name={name} />
        <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth={false} >
            <MapDialog name={childName}/>
        </Dialog>
        <Drawer
            className="legend-drawer"
            variant="persistent"
            anchor="left"
            open={state.settingsTabs.isLegendOpen}
        >
            <DrawerHeader> 
            <LegendArrowDropDown onClick={() => {actions.setIsLegendOpen(false)}}>
                <CloseIcon fontSize="small"/>
            </LegendArrowDropDown>
            <LegendTypography className="legend-title" variant="h6" gutterBottom>
                Color Legend
            </LegendTypography>
            </DrawerHeader>
            <Divider />
            <Legend items={legendItems}/>
        </Drawer>
        </>
    );
    })
    //overarching map list that has a hidden dialog box that will open on click


    type MapProps  = {
    name: string;
    openChild: (childName: string) => void;
    }

    // This component is the map itself with the image and buttons within.
const MapViewer: React.FC<MapProps> = ({ name, openChild }) => {
    const { state, actions } = useContext(context)
    const [imageLoaded, setImageLoaded] = useState(false)
    const imageRef = useRef<HTMLImageElement | null>(null)
    const [isFullscreen, setIsFullscreen] = useState(false)
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

    const mapInfo: MapInfo = state.settingsTabs.mapInfo
    const mapData: MapInfo[string] = mapInfo[name]
    const mapHierarchy: MapHierarchy = state.settingsTabs.mapHierarchy

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
        <div className="controls">
            <TSCButton className="bottom-button" onClick={() => actions.setIsLegendOpen(!state.settingsTabs.isLegendOpen)}>legend</TSCButton>
        </div>
        <div className="view-buttons">
            <IconButton className="icon-view-button" onClick={() => {
            if (document.fullscreenElement) {
                document.exitFullscreen()
            } else {
                mapViewer.requestFullscreen()
            }
            }}>
            <FullscreenIcon className="fullscreen-icon"/>
            </IconButton>
            <IconButton className="icon-view-button" onClick={() => zoomIn()}>
                <ZoomInIcon className="fullscreen-icon"/>
            </IconButton>
            <IconButton className="icon-view-button" onClick={() => zoomOut()}>
                <ZoomOutIcon className="fullscreen-icon"/>
            </IconButton>
            <IconButton className="icon-view-button" onClick={() => resetTransform()}>
                <YoutubeSearchedForIcon className="fullscreen-icon"/>
            </IconButton>
        </div>
        </>
);

const fullscreenImgStyle = {
    maxWidth: "100vw",
    height: "100vh",
    maxHeight: "100vh"
}
return (
    <TransformWrapper 
    doubleClick={{
    disabled: true 
    }}
    minScale={1} 
    maxScale={3}
    limitToBounds={true}
    >
    {(utils) => (
    <div ref={mapViewerRef} className="map-viewer">
        <TransformComponent >
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
        onLoad={() => setImageLoaded(true)}
        />

        {/* Load all the map points */}
        {imageLoaded && imageRef && imageRef.current && mapData.mapPoints &&
        loadMapPoints(mapData.mapPoints, mapData.bounds, imageRef.current.width, imageRef.current.height, false)}

        {/* Load all the info points */}
        {imageLoaded && imageRef && imageRef.current && mapData.infoPoints && 
        loadMapPoints(mapData.infoPoints, mapData.bounds, imageRef.current.width, imageRef.current.height, true)}

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
            mapInfo[child].parent!.bounds, 
            openChild,
            )
            })}
        </>
        </TransformComponent>
        {mapViewerRef && mapViewerRef.current && <Controls mapViewer={mapViewerRef.current as HTMLDivElement} {...utils}/>}
    </div>
    )}
    </TransformWrapper>
);
}



type MapPointButtonProps = {
  mapPoint: MapPoints[string] | InfoPoints[string],
  x: number,
  y: number,
  name: string,
  isInfo?: boolean
}

// mapPointButton that pulls up the map points on the image
// mapPoint: the information of the map point
// x: % from the left
// y: % from the top
// name: name of the map point
// isInfo: will default to false. is this point an info button?
const MapPointButton: React.FC<MapPointButtonProps> = ({mapPoint, x, y, name, isInfo = false}) => {
  const [clicked, setClicked] = useState(false)
  const theme = useTheme()

  // below is the hook for grabbing the scale from map image scaling
  const [scale, setScale] = useState(1)
  useTransformEffect(({ state, instance }) => {
    // console.log(state); // { previousScale: 1, scale: 1, positionX: 0, positionY: 0 }
    setScale(state.scale)
    return () => {
      // unmount
    };
  })
  const color = isInfo ? `${theme.palette.disabled.main}` : `${clicked ? theme.palette.on.main : theme.palette.off.main}`

  return (
    <>
      <MapPointTooltip title={
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
        disableRipple={isInfo}
        style={{
          left: `calc(${x}% - ${ICON_SIZE / 2 / scale}px)`,
          // we take a the full icon_size here to anchor to the
          // bottom of the icon
          color: color,
          top: `calc(${y}% - ${ICON_SIZE / scale}px)`,
          width: `${ICON_SIZE / scale}px`,
          height: `${ICON_SIZE / scale}px`,
        }}
        onClick={() => {
          setClicked(!clicked)
        }}
      >
        {getIcon(isInfo, clicked)}
      </IconButton>
      </MapPointTooltip>
    </>
  )
}

type LegendItem = {
  color: string;
  label: string;
  icon: React.ElementType<any>;
}
const DisplayLegendItem = ({ legendItem } : {legendItem: LegendItem}) => {
  const theme = useTheme()
  const { color, label, icon: Icon} = legendItem
  return (<Box className="legend-item-container">
    <Icon
    width={20}
    height={20}
    style ={{color: color}}
    mr={1}/>
    <LegendTypography className="legend-label">{label}</LegendTypography>
  </Box>)
}

const Legend = ({items}: {items: LegendItem[]}) => {
  const theme = useTheme()
  return (<Box
  className="legend-container"
    style={{ 
      backgroundColor: theme.palette.navbar.dark,
      // columnCount: items.length,
      }}>
    {items.map((item, index) => (
      <DisplayLegendItem key={index} legendItem={item}/>
    ))}
  </Box>)
}


/**
 * This will create the rectangular map button for any children
 * @param name name of the child map
 * @param mapBounds bounds of the parent map
 * @param childBounds bounds of the child within the parent map
 * @param openChild function to open the dialog box in the recursive call
 * @returns 
 */
function createChildMapButton(
  name: string,
  mapBounds: Bounds,
  childBounds: Bounds,
  openChild: (childName: string) => void,
  ) {
  if (isRectBounds(childBounds) && isRectBounds(mapBounds)) {
    const { midpoint, upperLeft, width, height } = calculateRectButton(childBounds, mapBounds)
    return (
      <MapPointTooltip key={name} title={
        <>
          <h3 className="header">{`${name}`}</h3>
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
        openChild(name)
        if (document.fullscreenElement) {
          document.exitFullscreen()
        }
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
 * @returns all MapPointButton Components
 */
function loadMapPoints(points: MapPoints | InfoPoints, bounds: Bounds, frameWidth: number, frameHeight: number, isInfo: boolean) {
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
      isInfo={isInfo}/>
    );
  }))
}

/**
 * Depending on if the point was clicked, return a different icon
 * @param clicked 
 * @returns 
 */
function getIcon(isInfo: boolean, clicked: boolean){
  if (isInfo) {
    return (<InfoIcon
      className='icon'
      />)
  }
  if (clicked) {
    return (<OnIcon 
      className="icon"
      />)
  }
  return (<OffIcon
    className="icon"
    />)
}