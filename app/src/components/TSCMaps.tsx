import { IconButton, Dialog, DialogContent, Button, List, Box, ListItem, ListItemAvatar, ListItemText, Avatar} from '@mui/material'
import { useTheme } from "@mui/material/styles";
import type { MapInfo } from '@tsconline/shared'
import { devSafeUrl } from '../util'
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import React, { useState, useRef, useEffect } from "react";
import { observer } from "mobx-react-lite";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { TSCButton } from './TSCButton'
import './TSCMaps.css'

type MapRowComponentProps = {
  mapInfo: MapInfo; 
};

export const TSCMapList: React.FC<MapRowComponentProps> = observer(({ mapInfo }) => {
  const theme = useTheme();
  const [selectedMap, setSelectedMap] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleRowClick = (name: string) => {
    console.log('Clicked on map:', name);
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

      <Dialog open={isDialogOpen} onClose={handleCloseDialog} 
        maxWidth={false}
        >
        {selectedMap ? <MapDialog mapData={mapInfo[selectedMap]} /> : null}
      </Dialog>
    </div>
  );
});

/**
 * The map interface that will be recursive so that we can create "multiple" windows.
 */
const MapDialog = ({ mapData }: {mapData: MapInfo[string]; }) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  return (
    <>
      <MapViewer mapData={mapData}/>
      <Dialog open={dialogOpen} onClose={handleCloseDialog}>
        <MapViewer mapData={mapData}/>
      </Dialog>
    </>
  );
}

type MapViewerProps  = {
  mapData: MapInfo[string];
}

const zoomButtonStyle = {
  height: '20px',
  width: '100px',
  margin: '5px'
}


const MapViewer: React.FC<MapViewerProps> = ({ mapData }) => {

  const calculatePosition = (lat: number, lon: number) => {
    const {upperLeftLat, upperLeftLon, lowerRightLat, lowerRightLon} = mapData.bounds

    const latRange = Math.abs(upperLeftLat - lowerRightLat);
    const lonRange = Math.abs(upperLeftLon - lowerRightLon);

    let normalizedLat = (lat - Math.min(upperLeftLat, lowerRightLat)) / latRange;
    let normalizedLon = (lon - Math.min(upperLeftLon, lowerRightLon)) / lonRange;

    let x = normalizedLon * 100;
    let y = normalizedLat * 100;
    y = 100 - y;

    return { x, y };
  };

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
      <TSCButton style={zoomButtonStyle} onClick={() => zoomIn()}>zoom in</TSCButton>
      <TSCButton style={zoomButtonStyle} onClick={() => zoomOut()}>zoom out</TSCButton>
      <TSCButton style={zoomButtonStyle} onClick={() => resetTransform()}>reset</TSCButton>
    </div>
  );

  return (
    <TransformWrapper 
    doubleClick={{
      disabled: false
    }}
    minScale={1} 
    maxScale={2}
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
            const position = calculatePosition(point.lat, point.lon);
            return (
              <Button
                key={name}
                className="map-point"
                style={{
                  left: `calc(${position.x}% - 10px)`,
                  top: `calc(${position.y}% - 10px)`,
                }}
                onClick={() => console.log(`Point ${name} clicked at point x:${position.x}, y:${position.y}`)}
              />
            );
          })}
        </TransformComponent>
        <Controls {...utils}/>
      </>
      )}
    </TransformWrapper>
  );
}