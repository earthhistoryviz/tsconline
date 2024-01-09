import { IconButton, Dialog, DialogContent, Button, List, Box, ListItem, ListItemAvatar, ListItemText, Avatar} from '@mui/material'
import { useTheme } from "@mui/material/styles";
import type { MapInfo } from '@tsconline/shared'
import { devSafeUrl } from '../util'
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import React, { useState } from "react";
import { observer } from "mobx-react-lite";

const height = '80vh'
const width = '80vw'

type MapRowComponentProps = {
  maps: MapInfo; 
};

export const TSCMapList: React.FC<MapRowComponentProps> = observer(({ maps }) => {
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
          {Object.entries(maps).map(([name, map]) => {
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
        {selectedMap ? <MapDialog mapData={maps[selectedMap]} /> : null}
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
  const [imageAspect, setImageAspect] = useState(1);
  const handleZoomIn = () => {
    setZoomLevel(zoomLevel * 1.1)
  };
  const handleZoomOut = () => {
    setZoomLevel(Math.max(zoomLevel / 1.1, 1)) 
  };
  const calculatePosition = (lat: number, lon: number) => {
    const {upperLeftLat, upperLeftLon, lowerRightLat, lowerRightLon} = mapData.bounds

    const latRange = Math.abs(upperLeftLat - lowerRightLat);
    const lonRange = Math.abs(upperLeftLon - lowerRightLon);

    let normalizedLat = lat - Math.min(upperLeftLat, lowerRightLat);
    let normalizedLon = lon - Math.min(upperLeftLon, lowerRightLon);

    let x = (normalizedLon / lonRange) * 100;
    let y = (normalizedLat / latRange) * 100;

    // invert y-axis if y is 0 at the top
    y = 100 - y;

    // console.log(`x: ${x}, y: ${y}`);
    return { x, y };
  };
  

  const imageStyle = {
    transform: `scale(${zoomLevel})`,
    transformOrigin: 'center center',
    maxHeight: '100%', 
    maxWidth: '100%',
    objectFit: 'cover',
  };

  return (
    <Box sx={{ 
      display: 'flex',
      // maxHeight: '100vh',
      // width: '100vh'
    }}>
      <Box sx={{
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        // overflow: 'hidden', // Hide any overflow
      }}>
      <img src={devSafeUrl(mapData.img)} alt="Map" 
       style ={imageStyle}
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
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
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