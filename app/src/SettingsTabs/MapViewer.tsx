import { Drawer, Divider, IconButton } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import type { MapHierarchy, MapInfo } from "@tsconline/shared";
import { devSafeUrl } from "../util";
import React, { useEffect, useState, useRef, useContext } from "react";
import { context } from "../state";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { TSCButton, DrawerHeader, ColoredIconButton, TypographyText, ColoredDiv, BorderedIcon } from "../components";
import CloseIcon from "@mui/icons-material/Close";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import YoutubeSearchedForIcon from "@mui/icons-material/YoutubeSearchedFor";
import { observer } from "mobx-react-lite";
import "./MapViewer.css";
import { Legend, createChildMapButton, loadMapPoints, loadTransects } from "./MapButtons";
import { FaciesControls, HeaderBar } from "./MapControls";
import { faciesHeaderHeight, normHeaderHeight } from "./MapPointConstants";

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
  // this is needed to change image styles on fullscreen change
  const [isFullscreen, setIsFullscreen] = useState(false);
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
      setIsFullscreen(true);
    } else {
      setIsFullscreen(false);
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

  const viewButtonStyle = {
    top: `calc(${isFacies ? faciesHeaderHeight : normHeaderHeight} + 1vh)`,
  };
  const Controls = ({
    mapViewer,
    zoomIn,
    zoomOut,
    resetTransform
  }: {
    mapViewer: HTMLDivElement;
    zoomIn: () => void;
    zoomOut: () => void;
    resetTransform: () => void;
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
          }}>
          <BorderedIcon component={FullscreenIcon} className="icon-button" />
        </IconButton>
        <IconButton className="icon-view-button" onClick={() => zoomIn()}>
          <BorderedIcon component={ZoomInIcon} className="icon-button" />
        </IconButton>
        <IconButton className="icon-view-button" onClick={() => zoomOut()}>
          <BorderedIcon component={ZoomOutIcon} className="icon-button" />
        </IconButton>
        <IconButton className="icon-view-button" onClick={() => resetTransform()}>
          <BorderedIcon component={YoutubeSearchedForIcon} className="icon-button" />
        </IconButton>
      </div>
    </>
  );

  let mapHeight = "90vh";
  if (isFacies) mapHeight = `calc(100vh - ${faciesHeaderHeight} - 2vh)`;
  else if (isFullscreen) mapHeight = `calc(100vh - ${normHeaderHeight})`;
  const mapStyle = {
    height: mapHeight,
  };

  return (
    <div ref={mapViewerRef}>
      <HeaderBar isFacies={isFacies} name={name} />
      <div className="map-viewer">
        <TransformWrapper
          doubleClick={{
            disabled: true,
          }}
          minScale={1}
          maxScale={3}
          limitToBounds={true}
        >
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
              <Controls mapViewer={mapViewerRef.current as HTMLDivElement} {...utils} />
            )}
          </>
        )}
      </TransformWrapper>
      <Drawer className="drawer" variant="persistent" anchor="left" open={state.mapState.isLegendOpen}>
        <DrawerHeader>
          <ColoredIconButton
            onClick={() => {
              actions.setIsLegendOpen(false);
            }}>
            <CloseIcon fontSize="small" />
          </ColoredIconButton>
          <TypographyText className="legend-title" variant="h6" gutterBottom>
            Color Legend
          </TypographyText>
        </DrawerHeader>
        <Divider />
        <Legend />
      </Drawer>
      <Drawer
        className="facies-button-container drawer"
        variant="persistent"
        anchor="bottom"
        open={state.mapState.isFacies && faciesOptions}>
        <DrawerHeader>
          <TypographyText className="facies-options-title" variant="h6" gutterBottom>
            Facies Options
          </TypographyText>
          <ColoredIconButton
            onClick={() => {
              setFaciesOptions(false);
            }}>
            <ArrowDropDownIcon fontSize="large" />
          </ColoredIconButton>
        </DrawerHeader>
        <FaciesControls />
      </Drawer>
    </div>
  );
});

const FaciesControls = observer(() => {
  const { state, actions } = useContext(context);
  const dotSizeRange = { min: 1, max: 20 };
  return (
    <ColoredDiv className="facies-buttons">
      <div className="dot-controls">
        <TypographyText className="dot-controls-title"> Dot Size </TypographyText>
        <div className="slider-container">
          <Slider
            id="dot-size-slider"
            className="slider"
            value={state.mapState.currentFaciesOptions.dotSize}
            max={dotSizeRange.max}
            min={dotSizeRange.min}
            onChange={(_event: Event, val: number | number[]) => {
              actions.setDotSize(val as number);
            }}
            aria-label="Default"
            valueLabelDisplay="auto"
          />
        </div>
      </div>
      <div className="age-controls">
        <TypographyText> Age </TypographyText>
        <div className="slider-container">
          <Slider
            id="number-input"
            className="slider"
            name="Facies-Age-Slider"
            max={state.mapState.selectedMapAgeRange.maxAge}
            min={state.mapState.selectedMapAgeRange.minAge}
            value={state.mapState.currentFaciesOptions.faciesAge}
            onChange={(event: Event, val: number | number[]) => {
              actions.setFaciesAge(val as number);
            }}
            aria-label="Default"
            valueLabelDisplay="auto"
          />
        </div>
      </div>
    </ColoredDiv>
  );
});
