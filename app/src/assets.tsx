import React, { useState } from "react";
import Checkbox from "@mui/material/Checkbox";
import { Theme, useTheme, styled } from "@mui/material/styles";
import { makeStyles } from '@mui/styles';
import { Button, Dialog, ListItem, List, ListItemAvatar, Avatar, ListItemText, TabProps, TabsProps, Tab, Box} from '@mui/material';
import MuiAccordionDetails from "@mui/material/AccordionDetails";
import MuiAccordion, { AccordionProps } from "@mui/material/Accordion";
import ArrowForwardIosSharpIcon from "@mui/icons-material/ArrowForwardIosSharp";
import { Link, LinkProps } from 'react-router-dom';
import { observer } from "mobx-react-lite";
import { devSafeUrl } from './util'
import type { Maps } from '@tsconline/shared'
import MuiAccordionSummary, {
  AccordionSummaryProps,
} from "@mui/material/AccordionSummary";
import { Tabs } from "@mui/material";

type CheckboxProps = {
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

interface TSCTabsProps extends TabsProps {
  children?: React.ReactNode;
  value: number | boolean;
  onChange: (event: React.SyntheticEvent, newValue: number) => void;
}

export const TSCCheckbox: React.FC<CheckboxProps> = (props: CheckboxProps) => {
  const theme = useTheme();

  return (
    <Checkbox
        // {...props}
        checked={props.checked}
        onChange={props.onChange}
        size="small"
        sx={{
            color: theme.palette.primary.main,
            '&.Mui-checked': {
                color: theme.palette.selection.main,
            },
        }}
    />
  )
};


// wraps tabs from mui to be able to change certain properties
export const TSCTabs = styled((props: TSCTabsProps) => (
  <Tabs
    {...props}
    TabIndicatorProps={{ children: <span className="MuiTabs-indicatorSpan" /> }}
  />
  ))(({ theme }) => {
    return {
      color: theme.palette.secondary.main,
      '& .MuiTabs-indicator': {
        display: 'flex',
        justifyContent: 'center',
        backgroundColor: 'transparent',
      },
      '& .MuiTabs-indicatorSpan': {
        maxWidth: 80,
        width: '100%',
        backgroundColor: theme.palette.selection.main,
      },
    };
  });

// wraps tab to be able to change certain properties
export const TSCTab = styled((props: TabProps) => (
  <Tab disableRipple {...props} />
  ))(({ theme }) => {
    return {
      textTransform: "none",
      fontWeight: theme.typography.fontWeightRegular,
      fontSize: theme.typography.pxToRem(15),
      marginRight: theme.spacing(1),
      color: theme.palette.dark.main,
      "&:hover": {
        color: theme.palette.selection.light,
        opacity: 1,
      },
      "&.Mui-selected": {
        color: theme.palette.selection.main,
      },
      "&.Mui-focusVisible": {
        backgroundColor: theme.palette.primary.main,
      },
    };
  });

// Define the Accordion component outside the Column component
export const Accordion = styled((props: AccordionProps) => (
  <MuiAccordion disableGutters elevation={0} square {...props} />
))(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  "&:not(:last-child)": {
    borderBottom: 0,
  },
  "&:before": {
    display: "none",
  },
}));

// Define the AccordionSummary and AccordionDetails components outside the Column component
export const AccordionSummary = styled((props: AccordionSummaryProps) => (
  <MuiAccordionSummary
    expandIcon={<ArrowForwardIosSharpIcon sx={{ fontSize: "0.9rem" }} />}
    {...props}
  />
))(({ theme }) => ({
  // backgroundColor: theme.palette.background.default,
  display: "flex",
  "& .MuiAccordionSummary-expandIconWrapper.Mui-expanded": {
    transform: "rotate(90deg)",
    display: "flex",
    order: -1, 
  },
  "& .MuiAccordionSummary-content": {
    order: 2,
    flexGrow: 1, 
    alignItems: "center",
  },
}));

export const AccordionDetails = styled(MuiAccordionDetails)(({ theme }) => ({
  padding: theme.spacing(2),
  borderTop: "1px solid rgba(0, 0, 0, .125)",
}));

export const ColumnContainer = styled(Box)(({ theme }) => ({
  // backgroundColor: theme.palette.background.default, 
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(1),
}));
  // listItem: {
  //   '&:hover': {
  //     backgroundColor: theme.palette.selection.main,
  //     cursor: 'pointer'
  //   },
  // },
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
  }

  return (
    <div>
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
              backgroundColor: theme.palette.selection.main,
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
    zIndex: 1000, // Initial z-index
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
// export default ImageRowComponent;
// export default MapViewer;