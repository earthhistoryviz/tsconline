import { Dialog, Button, List, Box, ListItem, ListItemAvatar, ListItemText, Avatar} from '@mui/material'
import { useTheme } from "@mui/material/styles"
import type { MapHierarchy, Bounds, MapPoints, MapInfo, RectBounds} from '@tsconline/shared'
import { devSafeUrl } from '../util'
import React, { useState, useRef, useContext } from "react"
import { context } from '../state';
import { observer } from "mobx-react-lite"
import { TransformWrapper, TransformComponent, useTransformEffect } from "react-zoom-pan-pinch"
import { TSCButton } from './TSCButton'
import { Tooltip } from 'react-tooltip'
import { isRectBounds, isVertBounds } from '@tsconline/shared'
import { calculateRectPosition, calculateVertPosition, calculateRectButton } from '../coordinates'
import 'react-tooltip/dist/react-tooltip.css'

import './TSCMaps.css'

type MapRowComponentProps = {
  mapInfo: MapInfo; 
};

export const TSCMapList: React.FC<MapRowComponentProps> = observer(({ mapInfo }) => {
  const theme = useTheme();
  const [selectedMap, setSelectedMap] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleRowClick = (name: string) => {
    setSelectedMap(name);
    setIsDialogOpen(true);
  };
  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setSelectedMap(null)
  }

  return (
    <div style={{minHeight: '100vh'}}>
      <Box>
        <List>
          {Object.entries(mapInfo).map(([name, map]) => {
            return (
              <ListItem key={name} 
                selected={selectedMap === name}
                onClick={() => handleRowClick(name)} sx={{
                      '&:hover': {
                        backgroundColor: theme.palette.primary.main,
                        cursor: 'pointer'
                      },
                      '&.Mui-selected': {
                        backgroundColor: theme.palette.selection.light,
                      },
              }}>
                <ListItemAvatar>
                  <Avatar alt={name} src={devSafeUrl(map.img)} />
                </ListItemAvatar>
                <ListItemText primary={`${name}`} />
              </ListItem>
            )
          })}
        </List>
      </Box>

      <Dialog open={isDialogOpen} onClose={handleCloseDialog} maxWidth={false}>
        {selectedMap ? <MapDialog name={selectedMap} /> : null}
      </Dialog>
    </div>
  );
});

/**
 * The map interface that will be recursive so that we can create "multiple" windows.
 */
const MapDialog = ({ name }: {name: string;}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [childName, setChildName] = useState(name)

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };
  const openChild = (childName: string) => {
    setDialogOpen(true)
    setChildName(childName)
  }

  return (
    <>
      <MapViewer openChild={openChild} name={name} />
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth={false} >
        <MapDialog name={childName}/>
      </Dialog>
    </>
  );
}


function createChildMapButton(name: string, mapBounds: Bounds, childBounds: Bounds, openChild: (childName: string) => void) {
  if (isRectBounds(childBounds) && isRectBounds(mapBounds)) {
    const { midpoint, upperLeft, width, height } = calculateRectButton(childBounds, mapBounds)
    console.log(width)
    console.log(height)
    return (
      <>
      <Button
      data-tooltip-id={name}
      style={{
        border: "0.5px solid yellow",
        position: 'absolute',
        left: `calc(${upperLeft.x}%`,
        top: `calc(${upperLeft.y}%`,
        width: `${width}%`,
        height: `${height}%`
      }} 
      onClick={() => {openChild(name)}}
      />
      <Tooltip
        id={name}
        place="bottom"
        className="tooltip"
      >
        <div>
        <h3 className="header">{`${name}`}</h3>
        <ul>
            <li>Latitude: {midpoint.x}</li>
            <li>Longitude: {midpoint.y}</li>
            {/* <li>Default: {mapPoint.default || '--'}</li>
            <li>Minimum Age: {mapPoint.minage || '--'}</li>
            <li>Maximum Age: {mapPoint.maxage || '--'}</li> */}
            {/* <li>Note: {mapPoint.note || '--'}</li> */}
        </ul>
        </div>
      </Tooltip>
      </>
  )
  } else {
    console.log('map and child bounds are not rectbounds')
    console.log(`mapBounds not recognized, mapBounds are ${JSON.stringify(mapBounds, null, 2)}`)
    console.log(`childBounds not recognized, childBounds are ${JSON.stringify(childBounds, null, 2)}`)
    return
  }

}



type MapProps  = {
  name: string;
  openChild: (childName: string) => void;
}

const MapViewer: React.FC<MapProps> = ({ name, openChild }) => {
  const {state, actions} = useContext(context)
  const [imageLoaded, setImageLoaded] = useState(false)
  const imageRef = useRef<HTMLImageElement | null>(null)

  const mapInfo: MapInfo = state.settingsTabs.mapInfo
  const mapData: MapInfo[string] = mapInfo[name]
  const mapHierarchy: MapHierarchy = state.settingsTabs.mapHierarchy
  const Controls = (
    { 
      zoomIn, 
      zoomOut, 
      resetTransform, 
      ...rest 
    } : {
      zoomIn: any,
      zoomOut: any,
      resetTransform: any,
    }
  ) => (
    <div className="controls">
      <TSCButton className="zoom-button" onClick={() => zoomIn()}>zoom in</TSCButton>
      <TSCButton className="zoom-button" onClick={() => zoomOut()}>zoom out</TSCButton>
      <TSCButton className="zoom-button" onClick={() => resetTransform()}>reset</TSCButton>
    </div>
  );

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
      <>
        <TransformComponent >
          <>
          <img
          id="map"
          ref={imageRef}
          src={devSafeUrl(mapData.img)}
          alt="Map" 
          className="map"
          onLoad={() => setImageLoaded(true)}
          />
          {imageLoaded && Object.entries(mapData.mapPoints).map(([name, point]) => {
            if (!imageRef || !imageRef.current) return
            let position = {x: 0, y: 0}
            if(isRectBounds(mapData.bounds)) {
              position = calculateRectPosition(point.lat, point.lon, mapData.bounds);
            } else if (isVertBounds(mapData.bounds)) {
              position = calculateVertPosition(point.lat, point.lon, imageRef.current.height, imageRef.current.width, mapData.bounds);
            } else {
              console.log(`Bounds is not in the correct format `, JSON.stringify(mapData.bounds, null, 2))
              return null
            }
            return (
              <MapPointButton 
              key={name} 
              mapPoint={point}
              x={position.x} 
              y={position.y} 
              name={name}/>
            );
          })}
          {Object.keys(mapHierarchy).includes(name) && mapHierarchy[name].map((child, index) => {
            console.log(index)
            console.log(child)
            // name is the parentMap
            // mapHierarchy[name] contains all the children of the parent map
            // this will call for each child of name
            return createChildMapButton(
              child, 
              mapData.bounds, 
              mapInfo[mapHierarchy[name][Number(index)]].parent!.bounds, 
              openChild
              )
            })}
          </>
        </TransformComponent>
        <Controls {...utils}/>
      </>
      )}
    </TransformWrapper>
  );
}
type MapPointButtonProps = {
  mapPoint: MapPoints[string],
  x: number,
  y: number,
  name: string,
}

const MapPointButton: React.FC<MapPointButtonProps> = ({mapPoint, x, y, name }) => {
  const [clicked, setClicked] = useState(false)
  const theme = useTheme()

  // below is the hook for grabbing the scale from map image scaling
  // commented out because the positioning of the tooltip is seperate from
  // the map stack hierarchy

  // const [position, setPosition] = useState({scale: 1, x: 0, y: 0})
  // useTransformEffect(({ state, instance }) => {
  //   console.log(state); // { previousScale: 1, scale: 1, positionX: 0, positionY: 0 }
  //   setPosition({scale: state.scale, x: state.positionX, y: state.positionY})
  //   return () => {
  //     // unmount
  //   };
  // })

  return (
    <>
      <Button
        className="map-point"
        style={{
          position: 'absolute',
          backgroundColor: `${clicked ? theme.palette.selection.dark : 'red'}`,
          left: `calc(${x}% - 5px)`,
          top: `calc(${y}% - 5px)`,
        }}
        data-tooltip-id={name}
        onClick={() => {
          setClicked(!clicked)
        }}
      />
      <Tooltip
        id={name}
        place="bottom"
        globalCloseEvents={{
          scroll: true,
          resize: true,
          clickOutsideAnchor: true
        }}
        className="tooltip"
      >
        <div>
        <h3 className="header">{`${name}`}</h3>
        <ul>
            <li>Latitude: {mapPoint.lat}</li>
            <li>Longitude: {mapPoint.lon}</li>
            {/* <li>Default: {mapPoint.default || '--'}</li>
            <li>Minimum Age: {mapPoint.minage || '--'}</li>
            <li>Maximum Age: {mapPoint.maxage || '--'}</li> */}
            <li>Note: {mapPoint.note || '--'}</li>
        </ul>
        </div>
      </Tooltip>
    </>
  )
}