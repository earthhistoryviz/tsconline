import { IconButton, Dialog, DialogContent, Button, List, Box, ListItem, ListItemAvatar, ListItemText, Avatar} from '@mui/material'
import { useTheme } from "@mui/material/styles"
import type { MapHierarchy, Bounds, MapPoints, MapInfo, RectBounds} from '@tsconline/shared'
import { devSafeUrl } from '../util'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import React, { useState, useRef, useEffect, useContext } from "react"
import { context } from '../state';
import { observer } from "mobx-react-lite"
import { TransformWrapper, TransformComponent, useTransformEffect } from "react-zoom-pan-pinch"
import { TSCButton } from './TSCButton'
import { Tooltip } from 'react-tooltip'
import { isRectBounds, isVertBounds } from '@tsconline/shared'
import { calculateRectPosition, calculateRectButton } from '../coordinates'
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
      <Dialog open={isDialogOpen} onClose={handleCloseDialog} maxWidth={false}
      style={{
        overflow: "visible",
      }}>
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
    return (
      <>
      <Button
      data-tooltip-id={name}
      style={{
        border: "0.5px solid yellow",
        position: 'absolute',
        left: `calc(${upperLeft.x}% - ${width / 2}px`,
        top: `calc(${upperLeft.y}% - ${height / 2}px`,
        width: width,
        height: height
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
    throw new Error(`bounds not recognized, objects are (${mapBounds}) and (${childBounds})`)
  }

}



type MapProps  = {
  name: string;
  openChild: (childName: string) => void;
}

const MapViewer: React.FC<MapProps> = ({ name, openChild }) => {
  const {state, actions} = useContext(context)
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
          <img
          src={devSafeUrl(mapData.img)}
          alt="Map" 
          className="map"
          />
          {Object.entries(mapData.mapPoints).map(([name, point]) => {
            if(isRectBounds(mapData.bounds)) {
              const position = calculateRectPosition(point.lat, point.lon, mapData.bounds);
              return (
                <MapPointButton 
                key={name} 
                mapPoint={point}
                x={position.x} 
                y={position.y} 
                name={name}/>
              );
            }
            return null
          })}
          {Object.keys(mapHierarchy).includes(name) ? 
          createChildMapButton(
            mapHierarchy[name], 
            mapData.bounds, 
            mapInfo[mapHierarchy[name]].bounds, 
            openChild)
          : null}
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
  name: string
}

const MapPointButton: React.FC<MapPointButtonProps> = ({mapPoint, x, y, name}) => {
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
          left: `calc(${x}% - 10px)`,
          top: `calc(${y}% - 10px)`,
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