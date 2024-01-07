import { Button, List, Box, ListItem, ListItemAvatar, ListItemText, Avatar} from '@mui/material'
import { useTheme } from "@mui/material/styles";
import type { Maps } from '@tsconline/shared'
import { devSafeUrl } from './util'
import React, { useState } from "react";
import { observer } from "mobx-react-lite";

type MapRowComponentProps = {
  maps: Maps; 
};

export const MapRowComponent: React.FC<MapRowComponentProps> = observer(({ maps }) => {
  const theme = useTheme();
  const [selectedMap, setSelectedMap] = useState<string | null>(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  const handleRowClick = (name: string) => {
    console.log('Clicked on map:', name);
    setSelectedMap(name);
    setIsPopupOpen(true);
  };
  const handleClosePopup = () => {
    setIsPopupOpen(false)
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

      <Popup isOpen={isPopupOpen} onClose={handleClosePopup} style ={{}}>
        {selectedMap ? <MapViewer mapData={maps[selectedMap]} /> : null}
      </Popup> 
    </div>
  );
});

type MapViewerProps  = {
  mapData: Maps[string];
}
export const MapViewer: React.FC<MapViewerProps> = ({ mapData }) => {
  const theme = useTheme()
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

  return (
    <div style={{position: 'relative', overflowY: "auto", overflowX: "auto", width: '100%', height: '100%' }} >
      <img src={devSafeUrl(mapData.img)} alt="Map" 
       style ={{
        maxWidth: '100%',
        maxHeight: '100%',
        width: '100%',
        height: '100%',
      }}
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
    </div>
  );
}
interface PopupProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
  initialPosition?: { x: number; y: number };
}
const Popup: React.FC<PopupProps> = ({ isOpen, onClose, children, style, initialPosition ={x: 50, y: 50} }) => {
  const theme = useTheme()
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  if (!isOpen) return null;

  const startDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const onDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - offset.x,
      y: e.clientY - offset.y,
    });
  };

  const endDrag = () => {
    setIsDragging(false);
  };

  const popupStyle: React.CSSProperties = {
    position: 'fixed',
    left: `${position.x}px`,
    top: `${position.y}px`,
    width: '50vh',
    height: '50vh',
    cursor: 'move',
    backgroundColor: theme.palette.selection.main,
    padding: '5px',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
    zIndex: 1000, 
    ...style,
  };

  return (
    <div 
      style={popupStyle}
      onMouseDown={startDrag}
      onMouseMove={onDrag}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
      // onClick={onClick}
      >
      <div onMouseDown={startDrag} style={{cursor: 'move', backgroundColor: theme.palette.selection.main, padding: '5px' }}>
        <span>Popup</span>
        <Button onClick={onClose} style={{ float: 'right', color: theme.palette.dark.main }}>X</Button>
      </div>
      <div style={{resize: 'both', overflow: 'auto'}}>
      {children}
      </div>
    </div>
  );
};