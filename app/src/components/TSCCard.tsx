import { useState } from "react";
import { styled } from "@mui/material/styles";
import { Grid, Box, Avatar, CardMedia, IconButton, Typography, List, ListItem, ListItemText, Skeleton } from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import { TSCButton } from "./TSCButton";
import ReactCardFlip from "react-card-flip";
import "./TSCCard.css";
import { ChartConfig } from "@tsconline/shared";
import { devSafeUrl } from "../util";
import { BorderedIcon, StyledScrollbar, Lottie, CustomHeader } from ".";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import checkIcon from "../assets/icons/check-icon.json";
import FolderIcon from "@mui/icons-material/Folder";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import { useTranslation } from "react-i18next";

const CardBackground = styled("div")(({ theme }) => ({
  background: theme.palette.cardBackground
    ? `linear-gradient(to top, ${theme.palette.cardBackground.main}, ${theme.palette.cardBackground.light})`
    : theme.palette.secondaryBackground.main
}));
const Date = styled("div")(({ theme }) => ({
  fontFamily: theme.typography.fontFamily,
  backgroundColor: theme.palette.text.disabled
}));
const ContrastTypography = styled(Typography)(({ theme }) => ({
  color: theme.palette.cardBackground ? "#FFF" : theme.palette.text.primary
}));

export const TSCCard = ({ preset, generateChart, isLoading }: { preset: ChartConfig; generateChart?: () => void; isLoading: boolean }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [added, setAdded] = useState(false);
  const { t } = useTranslation();

  function handleFlip() {
    if (!isLoading) {
      setIsFlipped(!isFlipped);
    }
  }

  function add() {
    setAdded(!added);
  }

  return (
    <ReactCardFlip isFlipped={isFlipped} flipDirection="horizontal">
      {/* This is the front card */}
      <Box className="front-card">
      {isLoading ? (
          <Box>
          </Box>
        ) : (
          <CardMedia className="card-media-cover" image={devSafeUrl(preset.background)} onClick={handleFlip} />
        )}
        <div className="card-content front-card-content">
          <CardBackground className="card-background clip-path" />
          <Box position="relative" zIndex={1}>
            <Grid container alignItems="center" spacing={2} onClick={handleFlip}>
              <Grid item>
                {isLoading ? (
                  <Skeleton variant="circular" width={40} height={40} />
                ) : (
                  <Avatar className="avatar-logo avatar-box-shadow" src={devSafeUrl(preset.icon)} />
                )}
              </Grid>
              <Grid item xs>
                {isLoading ? (
                  <Skeleton width="60%" />
                ) : (
                  <ContrastTypography className="card-title">{preset.title}</ContrastTypography>
                )}
              </Grid>
            </Grid>
            <Grid container mt={2} alignItems="center" justifyContent="center" spacing={2} wrap="nowrap">
              <Grid item>
                <IconButton onClick={handleFlip} size="large" color="icon">
                  <InfoIcon />
                </IconButton>
              </Grid>
              <Grid item>
                {isLoading ? (
                  <Skeleton width={80} height={35} />
                ) : (
                  <TSCButton
                    buttonType="gradient"
                    style={{
                      width: "auto",
                      height: "auto",
                      fontSize: "0.85rem"
                    }}
                    onClick={generateChart}>
                    {t("button.generate")}
                  </TSCButton>
                )}
              </Grid>
              <Grid item xs onClick={handleFlip}>
                <Box display="flex" justifyContent="flex-end">
                  {isLoading ? <Skeleton width={50} /> : <Date className="date">{preset.date}</Date>}
                </Box>
              </Grid>
            </Grid>
          </Box>
        </div>
      </Box>

      {/* This is the back card */}
      <BackCard handleFlip={handleFlip} add={add} added={added} preset={preset} />
    </ReactCardFlip>
  );
};

const BackCard = ({
  preset,
  handleFlip,
  add,
  added
}: {
  preset: ChartConfig;
  handleFlip: () => void;
  add: () => void;
  added: boolean;
}) => {
  return (
    <Box className="back-card">
      <CardBackground className="card-background" />
      <div className="back-background card-content">
        <StyledScrollbar className="info-container" autoHide={false}>
          <CardMedia className="info-media" component="img" image={devSafeUrl(preset.background)} />
          <ContrastTypography className="info-title">{preset.title}</ContrastTypography>
          <div className="info-text-container">
            <CustomHeader sx={{ color: "cardBackground.contrastText" }}>Included Datapacks</CustomHeader>
            <List className="list">
              {preset.datapacks.map((datapack, index) => (
                <ListItem className="list-item" key={index}>
                  <FolderIcon color="icon" />
                  <ListItemText
                    className="list-item-text"
                    primary={<ContrastTypography>{datapack.name}</ContrastTypography>}
                  />
                </ListItem>
              ))}
            </List>
            <CustomHeader sx={{ color: "cardBackground.contrastText" }}>Additional Info</CustomHeader>
            <ContrastTypography className="info-description" variant="body1">
              {preset.description}
            </ContrastTypography>
          </div>
        </StyledScrollbar>
      </div>
      <div className="overlay-buttons">
        <IconButton className="icon-button" onClick={handleFlip} size="large">
          <BorderedIcon className="add-icon" component={ArrowBackIcon} />
        </IconButton>
      </div>
      <div className="add-buttons">
        {added ? (
          <IconButton className="add-button" onClick={add} size="large">
            <Lottie key={"check"} playOnClick autoplay animationData={checkIcon} width={45} height={45} speed={1.7} />
          </IconButton>
        ) : (
          <IconButton className="add-button" onClick={add} size="large">
            <BorderedIcon className="add-icon" strokeWidth={0.1} component={AddOutlinedIcon} />
          </IconButton>
        )}
      </div>
    </Box>
  );
};
