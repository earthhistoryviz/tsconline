import { Drawer, Divider, IconButton, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import type { MapHierarchy, MapInfo } from "@tsconline/shared";
import { devSafeUrl } from "../../util";
import React, { useEffect, useState, useRef, useContext } from "react";
import { context } from "../../state";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { DrawerHeader, BorderedIcon } from "../../components";
import CloseIcon from "@mui/icons-material/Close";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import YoutubeSearchedForIcon from "@mui/icons-material/YoutubeSearchedFor";
import { observer } from "mobx-react-lite";
import "./MapViewer.css";
import { createChildMapButton, loadMapPoints, loadTransects } from "./MapButtons";
import { HeaderBar } from "./MapControls";
import { FaciesHeaderHeight, LegendHeaderHeight, NormHeaderHeight } from "./MapPointConstants";
import { compareVhAndPx } from "../../util/util";
import { Legend } from "./Legend";

type MapProps = {
  name: string;
  isFacies: boolean;
};

// This component is the map itself with the image and buttons within.
export const MapViewer: React.FC<MapProps> = observer(({ name, isFacies }) => {
  const { state, actions } = useContext(context);
  const theme = useTheme();
  // we need this so it refreshes the components that require image loading
  const [imageLoaded, setImageLoaded] = useState(false);
  // used to get the proper bounds of the element
  const imageRef = useRef<HTMLImageElement | null>(null);
  // used for attaching tooltip and fullscreening
  const mapViewerRef = useRef<HTMLDivElement | null>(null);

  // useEffect needed to know when fullscreen changes i.e escape, button, pressing child maps
  useEffect(() => {
    // Add event listener when the component mounts
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    // Remove event listener when the component unmounts
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const handleFullscreenChange = () => {
    if (document.fullscreenElement) {
      actions.setIsFullscreen(true);
    } else {
      actions.setIsFullscreen(false);
    }
  };
  const openChildMap = (childMap: string) => {
    // call the new child as a regular map, with no facies
    setImageLoaded(false);
    actions.openNextMap(name, isFacies, childMap, false);
  };

  const mapInfo: MapInfo = state.mapState.mapInfo;
  const mapData: MapInfo[string] = mapInfo[name];
  const mapHierarchy: MapHierarchy = state.mapState.mapHierarchy;

  const headerHeight = isFacies ? FaciesHeaderHeight : NormHeaderHeight;
  let viewButtonStyle = {
    top: `calc(${headerHeight} + 1vh)`
  };
  // if header is more than 250px due to long monitor veritcally we adjust the view controls accordingly
  if (compareVhAndPx(headerHeight, 250) === 1) {
    viewButtonStyle = {
      top: `calc(250px + 20px)`
    };
  }
  let mapHeight = "90vh";
  if (isFacies) mapHeight = `calc(100vh - ${FaciesHeaderHeight} - 2vh)`;
  else if (state.isFullscreen) mapHeight = `calc(100vh - ${NormHeaderHeight})`;
  const mapStyle = {
    height: mapHeight
  };

  return (
    <div ref={mapViewerRef}>
      <HeaderBar isFacies={isFacies} name={name} />
      <div className="map-viewer">
        <TransformWrapper
          doubleClick={{
            disabled: true
          }}
          minScale={1}
          maxScale={3}
          limitToBounds={true}>
          {(utils) => (
            <>
              <TransformComponent>
                <>
                  <img
                    id="map"
                    ref={imageRef}
                    style={mapStyle}
                    src={devSafeUrl(mapData.img)}
                    alt="Map"
                    className="map"
                    onLoad={() => {
                      setImageLoaded(true);
                    }}
                  />

                  {/* Load all the map points */}
                  {imageLoaded &&
                    imageRef &&
                    imageRef.current &&
                    mapData.mapPoints &&
                    loadMapPoints(
                      mapData.mapPoints,
                      mapData.bounds,
                      imageRef.current.width,
                      imageRef.current.height,
                      false,
                      mapViewerRef.current
                    )}

                  {/* Load all the info points */}
                  {imageLoaded &&
                    imageRef &&
                    imageRef.current &&
                    mapData.infoPoints &&
                    loadMapPoints(
                      mapData.infoPoints,
                      mapData.bounds,
                      imageRef.current.width,
                      imageRef.current.height,
                      true,
                      mapViewerRef.current
                    )}
                  {imageLoaded &&
                    imageRef &&
                    imageRef.current &&
                    mapData.mapPoints &&
                    mapData.transects &&
                    loadTransects(
                      mapData.transects,
                      mapData.mapPoints,
                      mapData.bounds,
                      imageRef.current.width,
                      imageRef.current.height,
                      theme.palette.on.main,
                      theme.palette.off.main,
                      mapViewerRef.current
                    )}

                  {/* Load all the child maps*/}
                  {Object.keys(mapHierarchy).includes(name) &&
                    mapHierarchy[name].map((child) => {
                      // if the parent exists, use the bounds of the parent on mapData
                      // this is because the child's parent field is the bounds of this map on that parent map
                      const bounds = !mapData.parent ? mapData.bounds : mapData.parent!.bounds;

                      // mapInfo[child].parent!.bounds is called this way because
                      // the child's parent field stores the bounds of the child map within the parents bounds this way
                      // in other words the child.parent.bounds is actually the bounds of the child within the parent
                      // since we are currently in the parent, we need to know the children's bounds this way
                      return createChildMapButton(
                        child,
                        bounds,
                        mapViewerRef.current,
                        mapInfo[child].parent!.bounds,
                        openChildMap
                      );
                    })}
                </>
              </TransformComponent>
              {mapViewerRef && mapViewerRef.current && (
                <Controls
                  mapViewer={mapViewerRef.current as HTMLDivElement}
                  {...utils}
                  viewButtonStyle={viewButtonStyle}
                />
              )}
            </>
          )}
        </TransformWrapper>
        <Drawer className="drawer" variant="persistent" anchor="left" open={state.mapState.isLegendOpen}>
          <DrawerHeader style={{ height: LegendHeaderHeight }}>
            <IconButton
              onClick={() => {
                actions.setIsLegendOpen(false);
              }}>
              <CloseIcon fontSize="medium" />
            </IconButton>
            <Typography className="legend-title" variant="h6" gutterBottom>
              LEGEND
            </Typography>
          </DrawerHeader>
          <Divider />
          <Legend />
        </Drawer>
      </div>
    </div>
  );
});
const Controls = ({
  mapViewer,
  zoomIn,
  zoomOut,
  resetTransform,
  viewButtonStyle
}: {
  mapViewer: HTMLDivElement;
  zoomIn: () => void;
  zoomOut: () => void;
  resetTransform: () => void;
  viewButtonStyle: { top: string };
}) => (
  <>
    <div className="view-buttons" style={viewButtonStyle}>
      <IconButton
        className="icon-view-button"
        onClick={() => {
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            mapViewer.requestFullscreen();
          }
        }}
        size="large">
        <BorderedIcon component={FullscreenIcon} className="icon-button" />
      </IconButton>
      <IconButton className="icon-view-button" onClick={() => zoomIn()} size="large">
        <BorderedIcon component={ZoomInIcon} className="icon-button" />
      </IconButton>
      <IconButton className="icon-view-button" onClick={() => zoomOut()} size="large">
        <BorderedIcon component={ZoomOutIcon} className="icon-button" />
      </IconButton>
      <IconButton className="icon-view-button" onClick={() => resetTransform()} size="large">
        <BorderedIcon component={YoutubeSearchedForIcon} className="icon-button" />
      </IconButton>
    </div>
  </>
);
