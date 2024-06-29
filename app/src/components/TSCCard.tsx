import { useState } from "react";
import { styled } from "@mui/material/styles";
import { Grid, Box, Avatar, CardMedia, IconButton, Typography, List, ListItem, ListItemText } from "@mui/material";
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

const CardBackground = styled("div")(({ theme }) => ({
  backgroundColor: theme.palette.secondaryBackground.main
}));
const Date = styled("div")(({ theme }) => ({
  fontFamily: theme.typography.fontFamily,
  backgroundColor: theme.palette.text.disabled
}));

export const TSCCard = ({
  color,
  preset,
  generateChart
}: {
  color?: string;
  preset: ChartConfig;
  generateChart?: () => void;
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [added, setAdded] = useState(false);
  function handleFlip() {
    setIsFlipped(!isFlipped);
  }
  function add() {
    setAdded(!added);
  }
  return (
    <ReactCardFlip isFlipped={isFlipped} flipDirection="horizontal">
      {/* This is the front card */}
      <Box className="front-card" >
        <CardMedia className="card-media-cover" image={devSafeUrl(preset.background)} onClick={handleFlip} />
        <div className="card-content front-card-content">
          <CardBackground className="card-background clip-path" />
          <Box position="relative" zIndex={1}>
            <Grid container alignItems="center" spacing={2} onClick={handleFlip}>
              <Grid item>
                <Avatar className="avatar-logo avatar-box-shadow" src={devSafeUrl(preset.icon)} />
              </Grid>
              <Grid item xs>
                <Typography className="card-title">{preset.title}</Typography>
              </Grid>
            </Grid>
            <Grid container mt={2} alignItems="center" justifyContent="center" spacing={2} wrap="nowrap">
              <Grid item>
                <IconButton onClick={handleFlip} size="large" color="icon">
                  <InfoIcon />
                </IconButton>
              </Grid>
              <Grid item>
                <TSCButton
                  buttonType="gradient"
                  style={{
                    width: "auto",
                    height: "auto",
                    fontSize: "0.85rem"
                  }}
                  onClick={generateChart}>
                  Generate
                </TSCButton>
              </Grid>
              <Grid item xs onClick={handleFlip}>
                <Box display="flex" justifyContent="flex-end">
                  <Date className="date">{preset.date}</Date>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </div>
      </Box>
      {/* This is the back card */}
      <BackCard handleFlip={handleFlip} add={add} added={added} preset={preset} color={color} />
    </ReactCardFlip>
  );
};

const BackCard = ({
  preset,
  color,
  handleFlip,
  add,
  added
}: {
  preset: ChartConfig;
  handleFlip: () => void;
  add: () => void;
  added: boolean;
  color?: string;
}) => {
  return (
    <Box className="back-card">
      <CardBackground className="card-background" color={color} />
      <div className="back-background card-content">
        <StyledScrollbar className="info-container" autoHide={false}>
          <CardMedia className="info-media" component="img" image={devSafeUrl(preset.background)} />
          <Typography className="info-title">{preset.title}</Typography>
          <div className="info-text-container">
            <CustomHeader>Included Datapacks</CustomHeader>
            <List className="list">
              {preset.datapacks.map((datapack, index) => (
                <ListItem className="list-item" key={index}>
                  <FolderIcon color="icon" />
                  <ListItemText className="list-item-text" primary={<Typography>{datapack.name}</Typography>} />
                </ListItem>
              ))}
            </List>
            <CustomHeader>Additional Info</CustomHeader>
            <Typography className="info-description" variant="body1">
              {preset.description}
            </Typography>
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
