import { observer } from "mobx-react-lite";
import { useContext } from "react";
import { context } from "../../state";
import {
  BorderedIcon,
  CustomDivider,
  Lottie,
  TSCInputAdornment,
  TSCTextField,
  TypographyText
} from "../../components";
import { Box, Button, IconButton, Slider, TextFieldProps } from "@mui/material";
import mapPointsAnimationData from "../../assets/icons/map-points.json";
import CategoryIcon from "@mui/icons-material/Category";
import MapSharpIcon from "@mui/icons-material/MapSharp";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloseIcon from "@mui/icons-material/Close";
import "./MapControls.css";
import { NumericFormat } from "react-number-format";
import { FaciesHeaderHeight, NormHeaderHeight } from "./MapPointConstants";

const AgeTextField = ({ ...props }: TextFieldProps) => (
  <TSCTextField
    {...props}
    height={"40px"}
    className="age-text-field"
    inputProps={{ className: "age-text-form-input" }}
    InputProps={{
      endAdornment: <TSCInputAdornment>MA</TSCInputAdornment>
    }}
  />
);
const DotSizeTextField = ({ ...props }: TextFieldProps) => (
  <TSCTextField
    height={"40px"}
    {...props}
    className="dot-input-form"
    inputProps={{ className: "dot-text-form-input" }}
  />
);

export const FaciesControls = observer(() => {
  const { state, actions } = useContext(context);
  const dotSizeRange = { min: 1, max: 20 };
  return (
    <Box className="facies-buttons" bgcolor="backgroundColor.main">
      <div className="dot-controls">
        <TypographyText className="dot-controls-title"> Dot Size </TypographyText>
        <div className="slider-container">
          <NumericFormat
            value={state.mapState.currentFaciesOptions.dotSize}
            customInput={DotSizeTextField}
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
        <TypographyText> Age </TypographyText>
        <div className="slider-container">
          <NumericFormat
            value={state.mapState.currentFaciesOptions.faciesAge}
            customInput={AgeTextField}
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
    <Box className="header-bar" style={headerStyle} bgcolor="backgroundColor.main">
      <div className="header-title-container">
        <IconButton className="move-maps-button" onClick={actions.goBackInMapHistory} size="large">
          <BorderedIcon component={ArrowBackIcon} className="icon-button" />
        </IconButton>
        <div className="header-title">
          <Lottie className="header-icon" animationData={mapPointsAnimationData} width={25} height={25} loop autoplay />
          <TypographyText className="map-viewer-header" variant="h1">
            Map Viewer
          </TypographyText>
        </div>
        <IconButton className="move-maps-button" onClick={() => actions.closeMapViewer()} size="large">
          <BorderedIcon component={CloseIcon} className="icon-button" />
        </IconButton>
      </div>
      <div className="buttons">
        <Button
          startIcon={<MapSharpIcon />}
          className="legend-button"
          onClick={() => actions.setIsLegendOpen(!state.mapState.isLegendOpen)}>
          legend
        </Button>
        {!isFacies && (
          <Button
            startIcon={<CategoryIcon />}
            className="legend-button"
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
