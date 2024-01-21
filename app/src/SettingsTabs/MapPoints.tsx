import { useContext } from "react"
import { context } from "../state"
import { useTheme } from '@mui/material/styles'
import { Typography, Dialog, List, Box, ListItemButton, ListItemAvatar, ListItemText, Avatar} from '@mui/material'
import type { MapInfo } from '@tsconline/shared'
import { styled } from "@mui/material/styles"
import { devSafeUrl } from '../util'
import { observer } from "mobx-react-lite"
import React, { useState } from "react"
import { MapViewer } from './MapViewer'
import './MapPoints.css'

const MapListItemButton = styled(ListItemButton)(({ theme }) => ({
  '&:hover': {
    backgroundColor: theme.palette.primary.main,
    cursor: 'pointer'
  },
  '&.Mui-selected': {
    backgroundColor: theme.palette.selection.light,
  },
}))

export const MapPoints = observer(function MapPoint() {
    const { state } = useContext(context);
    const theme = useTheme();
    return (
        <div>
            { !state.settingsTabs.mapInfo || Object.entries(state.settingsTabs.mapInfo).length === 0 ?
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', minHeight: '100vh'}}>
                    <Typography sx={{
                    fontSize: theme.typography.pxToRem(18),
                    }}>
                        No Map Points available for this datapack
                    </Typography>
                </div>
                :
                <MapList mapInfo={state.settingsTabs.mapInfo}/>
        }
        </div>
    )
}
)

type MapRowComponentProps = {
  mapInfo: MapInfo; 
};

const MapList: React.FC<MapRowComponentProps> = observer(({ mapInfo }) => {
  const { state, actions } = useContext(context)

  const handleRowClick = (name: string) => {
    actions.setSelectedMap(name);
    actions.setIsMapViewerOpen(true)

  };
  // this dialog is seperate from the one inside map dialogs
  // this must be the case 
  const handleCloseDialog = () => {
    const lastMap = actions.popMapHistory()
    if (lastMap) {
      actions.openLastMap(lastMap)
    } else {
      actions.closeMapViewer()
    }
  }

  return (
    <div className="map=list">
      <Box>
        <List>
          {Object.entries(mapInfo).map(([name, map]) => {
            return (
              <MapListItemButton key={name} 
                selected={state.settingsTabs.selectedMap === name}
                onClick={() => handleRowClick(name)} 
              >
                <ListItemAvatar>
                  <Avatar alt={name} src={devSafeUrl(map.img)} />
                </ListItemAvatar>
                <ListItemText primary={`${name}`} />
              </MapListItemButton>
            )
          })}
        </List>
      </Box>

      <Dialog open={state.settingsTabs.isMapViewerOpen} keepMounted onClose={handleCloseDialog} maxWidth={false}>
        {state.settingsTabs.selectedMap ? <MapViewer name={state.settingsTabs.selectedMap} isFacies={state.settingsTabs.isFacies}/> : null}
      </Dialog>
    </div>
  );
});