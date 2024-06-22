import { useContext } from "react";
import { context } from "../../state";
import { useTheme } from "@mui/material/styles";
import { Typography, Dialog, List, Box, ListItemButton, ListItemAvatar, ListItemText, Avatar } from "@mui/material";
import type { MapInfo } from "@tsconline/shared";
import { styled } from "@mui/material/styles";
import { devSafeUrl } from "../../util";
import { observer } from "mobx-react-lite";
import React from "react";
import { MapViewer } from "./MapViewer";
import "./MapPoints.css";

const MapListItemButton = styled(ListItemButton)(({ theme }) => ({
  "&:hover": {
    backgroundColor: theme.palette.backgroundColor.light,
    cursor: "pointer"
  },
  "&.Mui-selected": {
    backgroundColor: theme.palette.backgroundColor.light
  }
}));

export const MapPoints = observer(function MapPoint() {
  const { state } = useContext(context);
  const theme = useTheme();
  return (
    <div>
      {!state.mapState.mapInfo || Object.entries(state.mapState.mapInfo).length === 0 ? (
        <div className="no-map-points-container">
          <Typography
            sx={{
              fontSize: theme.typography.pxToRem(18)
            }}>
            No Map Points available for this datapack
          </Typography>
        </div>
      ) : (
        <MapList mapInfo={state.mapState.mapInfo} />
      )}
    </div>
  );
});

type MapRowComponentProps = {
  mapInfo: MapInfo;
};

const MapList: React.FC<MapRowComponentProps> = observer(({ mapInfo }) => {
  const { state, actions } = useContext(context);

  const handleRowClick = (name: string) => {
    actions.setSelectedMap(name);
    actions.setIsMapViewerOpen(true);
  };

  return (
    <div className="map=list">
      <Box>
        <List>
          {Object.entries(mapInfo).map(([name, map]) => {
            return (
              <MapListItemButton
                disableRipple
                key={name}
                selected={state.mapState.selectedMap === name}
                onClick={() => handleRowClick(name)}>
                <ListItemAvatar>
                  <Avatar alt={name} src={devSafeUrl(map.img)} />
                </ListItemAvatar>
                <ListItemText primary={`${name}`} />
              </MapListItemButton>
            );
          })}
        </List>
      </Box>

      <Dialog
        classes={{ paper: "map-dialog" }}
        open={state.mapState.isMapViewerOpen}
        keepMounted
        onClose={actions.goBackInMapHistory}
        maxWidth={false}>
        {state.mapState.selectedMap ? (
          <MapViewer name={state.mapState.selectedMap} isFacies={state.mapState.isFacies} />
        ) : null}
      </Dialog>
    </div>
  );
});
