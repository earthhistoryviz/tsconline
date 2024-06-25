import { observer } from "mobx-react-lite";
import { useContext } from "react";
import { context } from "../../state";
import { BorderedIcon, CustomDivider, Lottie, TSCInputAdornment } from "../../components";
import { Box, Button, IconButton, Slider, TextField, Typography } from "@mui/material";
import mapPointsAnimationData from "../../assets/icons/map-points.json";
import CategoryIcon from "@mui/icons-material/Category";
import MapSharpIcon from "@mui/icons-material/MapSharp";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloseIcon from "@mui/icons-material/Close";
import "./MapControls.css";
import { NumericFormat } from "react-number-format";
import { FaciesHeaderHeight, NormHeaderHeight } from "./MapPointConstants";

export const FaciesControls = observer(() => {
  const { state, actions } = useContext(context);
  const dotSizeRange = { min: 1, max: 20 };
  return (
    <Box className="facies-buttons" bgcolor="secondaryBackground.main">
      <div className="dot-controls">
        <Typography className="dot-controls-title"> Dot Size </Typography>
        <div className="slider-container">
          <NumericFormat
            value={state.mapState.currentFaciesOptions.dotSize}
            customInput={TextField}
            className="dot-input-form"
            inputProps={{ className: "dot-text-form-input" }}
            onValueChange={(values) => {
              const floatValue = values.floatValue;
              if (!floatValue) {
                return;
              }
              if (floatValue > dotSizeRange.max) actions.setDotSize(20);
              else if (floatValue < dotSizeRange.min) actions.setDotSize(1);
              else actions.setDotSize(floatValue);
            }}
          />
          <Slider
            id="dot-size-slider"
            className="slider"
            sx={{
              "& .MuiSlider-track": {
                bgcolor: "icon.main"
              },
              "& .MuiSlider-thumb": {
                bgcolor: "icon.main"
              },
              "& .MuiSlider-rail": {
                bgcolor: "icon.light"
              }
            }}
            value={state.mapState.currentFaciesOptions.dotSize}
            max={20}
            min={1}
            onChange={(_event: Event, val: number | number[]) => {
              actions.setDotSize(val as number);
            }}
            aria-label="Default"
            valueLabelDisplay="auto"
          />
        </div>
      </div>
      <div className="age-controls">
        <Typography> Age </Typography>
        <div className="slider-container">
          <NumericFormat
            value={state.mapState.currentFaciesOptions.faciesAge}
            customInput={TextField}
            className="age-text-field"
            inputProps={{ className: "age-text-form-input" }}
            InputProps={{
              endAdornment: <TSCInputAdornment>MA</TSCInputAdornment>
            }}
            onValueChange={(values) => {
              if (!values.floatValue) {
                return;
              }
              actions.setFaciesAge(values.floatValue);
            }}
          />
          <Slider
            id="number-input"
            className="slider"
            sx={{
              "& .MuiSlider-track": {
                bgcolor: "icon.main"
              },
              "& .MuiSlider-thumb": {
                bgcolor: "icon.main"
              },
              "& .MuiSlider-rail": {
                bgcolor: "icon.light"
              }
            }}
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
    </Box>
  );
});
type HeaderBarProps = {
  name: string;
  isFacies: boolean;
};
export const HeaderBar: React.FC<HeaderBarProps> = ({ name, isFacies }) => {
  const { state, actions } = useContext(context);
  const headerStyle = {
    height: `${isFacies ? FaciesHeaderHeight : NormHeaderHeight}`
  };
  return (
    <Box className="header-bar" style={headerStyle} bgcolor="secondaryBackground.main">
      <div className="header-title-container">
        <IconButton className="move-maps-button" onClick={actions.goBackInMapHistory} size="large">
          <BorderedIcon component={ArrowBackIcon} className="icon-button" color="icon" />
        </IconButton>
        <div className="header-title">
          <Lottie className="header-icon" animationData={mapPointsAnimationData} width={25} height={25} loop autoplay />
          <Typography className="map-viewer-header" variant="h1" component="h1">
            Map Viewer
          </Typography>
        </div>
        <IconButton className="move-maps-button" onClick={() => actions.closeMapViewer()} size="large">
          <BorderedIcon component={CloseIcon} className="icon-button" color="icon" />
        </IconButton>
      </div>
      <div className="buttons">
        <Button
          startIcon={<MapSharpIcon color="icon" />}
          className="legend-button"
          sx={{ color: "secondaryBackground.contrastText" }}
          onClick={() => actions.setIsLegendOpen(!state.mapState.isLegendOpen)}>
          legend
        </Button>
        {!isFacies && (
          <Button
            startIcon={<CategoryIcon color="icon" />}
            className="legend-button"
            sx={{ color: "secondaryBackground.contrastText" }}
            onClick={() => {
              actions.openNextMap(name, isFacies, name, true);
            }}>
            Facies
          </Button>
        )}
      </div>
      {isFacies && (
        <>
          <CustomDivider />
          <FaciesControls />
        </>
      )}
    </Box>
  );
};
