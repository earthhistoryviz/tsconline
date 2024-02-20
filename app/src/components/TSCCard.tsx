import React, { useState } from "react";
import Color from "color";
import { styled, useTheme } from "@mui/material/styles";
import {
  Grid,
  Box,
  Avatar,
  CardMedia,
  IconButton,
  Typography,
  Tooltip,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import { TSCButton } from "./TSCButton";
import ReactCardFlip from "react-card-flip";
import "./TSCCard.css";
import { ChartConfig } from "@tsconline/shared";
import { devSafeUrl } from "../util";
import { BorderedIcon, StyledScrollbar, Lottie } from ".";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import checkIcon from "../assets/icons/check-icon.json";
import FolderIcon from "@mui/icons-material/Folder";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";

const Title = styled("h2")(({ theme }) => ({
  fontFamily: theme.typography.fontFamily,
  color: theme.palette.background.default,
}));

const CardBackground = styled("div")(({ theme, color }) => ({
  background: `linear-gradient(to top, ${
    color || theme.palette.selection.main
  }, ${Color(color || theme.palette.selection.main)
    .rotate(24)
    .lighten(0.12)})`,
}));
const HiddenBack = styled("div")(({ theme }) => ({
  backgroundColor: theme.palette.navbar.main,
}));

const CardContent = styled("div")(({ color }) => ({
  boxShadow: `
    -10px 10px 15px -5px ${Color(color).fade(0.5)}, 
      10px 10px 15px -5px ${Color(color).fade(0.5)}, 
      0 10px 15px -5px ${Color(color).fade(0.5)}
    `,
}));
const Header = styled(Typography)(({ theme }) => ({
  "&::before": {
    backgroundColor: theme.palette.selection.main,
  },
}));

const Date = styled("div")(({ theme }) => ({
  fontFamily: theme.typography.fontFamily,
  backgroundColor: theme.palette.text.disabled,
}));

export const TSCCard = ({
  color,
  preset,
  generateChart,
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
      <Box className="front-card">
        <HiddenBack className="hidden-back" />
        <CardMedia
          className="card-media-cover"
          image={devSafeUrl(preset.background)}
          onClick={handleFlip}
        />
        <CardContent className="card-content front-card-content" color={color}>
          <CardBackground className="card-background clip-path" color={color} />
          <Box position="relative" zIndex={1}>
            <Grid
              container
              alignItems="center"
              spacing={2}
              onClick={handleFlip}
            >
              <Grid item>
                <Avatar
                  className="avatar-logo avatar-box-shadow"
                  src={devSafeUrl(preset.icon)}
                />
              </Grid>
              <Grid item xs>
                <Title className="card-title">{preset.title}</Title>
              </Grid>
            </Grid>
            <Grid
              container
              mt={2}
              alignItems="center"
              justifyContent="center"
              spacing={2}
              wrap="nowrap"
            >
              <Grid item>
                <IconButton onClick={handleFlip}>
                  <InfoIcon />
                </IconButton>
              </Grid>
              <Grid item>
                <TSCButton
                  style={{
                    width: "auto",
                    height: "auto",
                    fontSize: "0.85rem",
                  }}
                  onClick={generateChart}
                >
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
        </CardContent>
      </Box>
      {/* This is the back card */}
      <BackCard
        handleFlip={handleFlip}
        add={add}
        added={added}
        preset={preset}
        color={color}
      />
    </ReactCardFlip>
  );
};

const BackCard = ({
  preset,
  color,
  handleFlip,
  add,
  added,
}: {
  preset: ChartConfig;
  handleFlip: () => void;
  add: () => void;
  added: boolean;
  color?: string;
}) => {
  return (
    <Box className="back-card">
      <HiddenBack className="hidden-back" />
      <CardBackground className="card-background" color={color} />
      <CardContent className="back-background card-content" color={color}>
        <StyledScrollbar className="info-container">
          <CardMedia
            className="info-media"
            component="img"
            image={devSafeUrl(preset.background)}
          />
          <Title className="info-title">{preset.title}</Title>
          <div className="info-text-container">
            <Header className="header" color="primary">
              Included Datapacks
            </Header>
            <List className="list">
              {preset.datapacks.map((datapack, index) => (
                <ListItem className="list-item" key={index}>
                  <FolderIcon color="primary" />
                  <ListItemText
                    className="list-item-text"
                    primary={
                      <Typography color="primary">{datapack.name}</Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
            <Header className="header" color="primary">
              Additional Info
            </Header>
            <Typography
              className="info-description"
              variant="body1"
              color="primary"
            >
              {preset.description}
            </Typography>
          </div>
        </StyledScrollbar>
      </CardContent>
      <div className="overlay-buttons">
        <IconButton className="icon-button" onClick={handleFlip}>
          <BorderedIcon className="add-icon" component={ArrowBackIcon} />
        </IconButton>
      </div>
      <div className="add-buttons">
        {added ? (
          <IconButton className="add-button" onClick={add}>
            <Lottie
              key={"check"}
              playOnClick
              autoplay
              animationData={checkIcon}
              width={45}
              height={45}
              speed={1.7}
            />
          </IconButton>
        ) : (
          <IconButton className="add-button" onClick={add}>
            <BorderedIcon
              className="add-icon"
              strokeWidth={0.1}
              component={AddOutlinedIcon}
            />
          </IconButton>
        )}
      </div>
    </Box>
  );
};
