import { IconButton, Dialog, DialogContent, Button, List, Box, ListItem, ListItemAvatar, ListItemText, Avatar} from '@mui/material'
import { useTheme } from "@mui/material/styles";
import type { MapInfo } from '@tsconline/shared'
import { devSafeUrl } from '../util'
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import React, { useState, useRef, useEffect } from "react";
import { observer } from "mobx-react-lite";

const SCALE_AMOUNT = 1.1;
const MAX_ZOOM = 2;
const MIN_ZOOM = 1;

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
        // fullWidth={true}
        // maxWidth={false}
        PaperProps={{
          style: {
            height: `auto`,
            // maxHeight: `${height}`,
            width: `auto`, 
            // maxWidth: 'none',
          },
        }}
        >
        {selectedMap ? <MapDialog mapData={mapInfo[selectedMap]} /> : null}
      </Dialog>
    </div>
  );
});

const MapDialog = ({ mapData }: {mapData: MapInfo[string]; }) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  // const handleOpenDialog = (newMapData) => {
  //   setDialogOpen(true);
  // };

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
const MapViewer: React.FC<MapViewerProps> = ({ mapData }) => {
  const theme = useTheme()
  const [zoomLevel, setZoomLevel] = useState(1)
  const [lastCursorPos, setLastCursorPos] = useState({ x: 50, y: 50 })
  const [cursor, setCursor] = useState({ x: 50, y: 50 })
  const imageRef = useRef<HTMLImageElement>(null);
  const handleZoomIn = () => {
    const newZoomLevel = Math.min(zoomLevel * SCALE_AMOUNT, MAX_ZOOM)
    setZoomLevel(newZoomLevel)
  };
  const handleZoomOut = () => {
    const newZoomLevel = Math.max(zoomLevel / SCALE_AMOUNT, MIN_ZOOM)
    setZoomLevel(newZoomLevel) 
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!imageRef.current) return
      event.preventDefault()
      if (event.metaKey && (event.key === '+' || event.key === '=')) { // 'Cmd' + '+' or 'Cmd' + '='
        const newZoomLevel = Math.min(zoomLevel * SCALE_AMOUNT, MAX_ZOOM);
        if (newZoomLevel > MAX_ZOOM) {
            return;
        }
        setZoomLevel(newZoomLevel)
        setLastCursorPos(cursor)
      }
      if (event.metaKey && (event.key === '-' || event.key === '_')) { // 'Cmd' + '+' or 'Cmd' + '='
        const newZoomLevel = Math.max(zoomLevel / SCALE_AMOUNT, MIN_ZOOM);
        // Prevent zooming too much in or out
        if (newZoomLevel < MIN_ZOOM) {
            return;
        }
        setZoomLevel(newZoomLevel)
        setLastCursorPos(cursor)
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!imageRef.current) return
      const bounds = imageRef.current.getBoundingClientRect();

      // Relative position of the cursor to the image
      const cursorX = event.clientX - bounds.left;
      const cursorY = event.clientY - bounds.top;

      // Convert cursor position to a percentage of the image's dimensions
      const cursorPercentX = (cursorX / bounds.width) * 100;
      const cursorPercentY = (cursorY / bounds.height) * 100;
      // console.log(`cursorPercentX: ${cursorPercentX}`)

      setCursor({x: cursorPercentX, y: cursorPercentY})
    };


    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keydown', handleKeyDown);
  
    // Cleanup
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
    }; 
  }, [zoomLevel, cursor, imageRef]);

  const calculatePosition = (lat: number, lon: number) => {
    const {upperLeftLat, upperLeftLon, lowerRightLat, lowerRightLon} = mapData.bounds

    const latRange = Math.abs(upperLeftLat - lowerRightLat);
    const lonRange = Math.abs(upperLeftLon - lowerRightLon);

    let normalizedLat = (lat - Math.min(upperLeftLat, lowerRightLat)) / latRange;
    let normalizedLon = (lon - Math.min(upperLeftLon, lowerRightLon)) / lonRange;

    let x = normalizedLon * 100;
    let y = normalizedLat * 100;
    y = 100 - y;

    // console.log(`x: ${x}, y: ${y}`);
    return { x, y };
  };

  const imageStyle = {
    maxHeight: '100%', maxWidth: '100%'
  }

  return (
    <Box sx={{ 
      display: 'flex',
      maxHeight: '100vh', 
      maxWidth: '100vw'
    }}>
      <Box 
      sx={{
        transform: `scale(${zoomLevel})`,
        transformOrigin: `${lastCursorPos.x}% ${lastCursorPos.y}%`,
        display: 'flex', 
        position: 'relative',
        alignItems: 'center', 
        justifyContent: 'center', 
        // height: 'auto',
        // idth: '100%',
        overflow: 'hidden', 
      }}
      >
      <img
      ref={imageRef}
      src={devSafeUrl(mapData.img)}
      alt="Map" 
      style={imageStyle}
      />
      {Object.entries(mapData.mapPoints).map(([name, point]) => {
        const position = calculatePosition(point.lat, point.lon);
        return (
          <Button
            key={name}
            style={{
              position: 'absolute',
              left: `calc(${position.x}% - 10px)`,
              top: `calc(${position.y}% - 10px)`,
              width: '10px',       
              height: '10px',      
              borderRadius: '50%', 
              padding: 0,          
              backgroundColor: 'red',
            }}
            onClick={() => console.log(`Point ${name} clicked at point x:${position.x}, y:${position.y}`)}
          />
        );
      })}
      </Box>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center' ,
        position: 'absolute', // Position the zoom controls absolutely
        right: '10px', // Position to the right
        top: '10px' //
        }}>
        <IconButton onClick={handleZoomIn} color="primary">
          <AddIcon />
        </IconButton>
        <IconButton onClick={handleZoomOut} color="primary">
          <RemoveIcon />
        </IconButton>
      </Box>
    </Box>
  );
}