import React, { useState } from "react";
import Color from "color";
import { styled } from "@mui/material/styles";
import {
  Grid,
  Box,
  Avatar,
  CardMedia,
  IconButton,
  Typography,
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import { TSCButton } from "./TSCButton";
import ReactCardFlip from "react-card-flip";
import "./TSCCard.css";

const text = `
Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Aliquam ultrices sagittis orci a scelerisque purus semper eget. Massa id neque aliquam vestibulum morbi. Odio ut enim blandit volutpat maecenas volutpat blandit. Aliquam faucibus purus in massa tempor. Id diam vel quam elementum pulvinar etiam. Ornare massa eget egestas purus viverra accumsan in nisl nisi. Lectus nulla at volutpat diam. Ultrices mi tempus imperdiet nulla malesuada pellentesque elit eget. Lobortis scelerisque fermentum dui faucibus in ornare.

Rhoncus mattis rhoncus urna neque viverra justo nec. Tempor id eu nisl nunc mi ipsum faucibus vitae aliquet. Feugiat nibh sed pulvinar proin gravida. Et tortor at risus viverra adipiscing at in tellus. Tortor pretium viverra suspendisse potenti nullam ac tortor. Aenean pharetra magna ac placerat vestibulum lectus mauris ultrices. Eget est lorem ipsum dolor sit amet consectetur adipiscing elit. Ac odio tempor orci dapibus ultrices in. Phasellus faucibus scelerisque eleifend donec. Praesent tristique magna sit amet purus gravida quis blandit turpis. Blandit cursus risus at ultrices mi.

Nunc congue nisi vitae suscipit tellus mauris a diam. Velit dignissim sodales ut eu sem integer vitae justo. Molestie a iaculis at erat. Gravida cum sociis natoque penatibus et magnis dis parturient. Donec enim diam vulputate ut pharetra sit. Ornare lectus sit amet est. Risus in hendrerit gravida rutrum quisque non tellus orci. Mauris pharetra et ultrices neque ornare aenean euismod elementum nisi. At lectus urna duis convallis convallis. Sed turpis tincidunt id aliquet risus feugiat in ante. In fermentum et sollicitudin ac orci phasellus egestas. Curabitur vitae nunc sed velit dignissim sodales ut eu sem. Pretium viverra suspendisse potenti nullam ac.

Ultrices vitae auctor eu augue ut lectus arcu bibendum at. Posuere ac ut consequat semper viverra nam libero. Ipsum consequat nisl vel pretium lectus quam id leo. Amet mattis vulputate enim nulla aliquet porttitor. Suscipit adipiscing bibendum est ultricies integer quis auctor elit. Neque aliquam vestibulum morbi blandit cursus risus at ultrices. Nunc aliquet bibendum enim facilisis gravida neque convallis a. Non nisi est sit amet facilisis magna etiam tempor. Proin fermentum leo vel orci porta non pulvinar. Quisque sagittis purus sit amet volutpat consequat mauris nunc congue. Elementum integer enim neque volutpat ac tincidunt. Condimentum mattis pellentesque id nibh tortor. Viverra orci sagittis eu volutpat odio facilisis mauris sit.

Volutpat sed cras ornare arcu dui vivamus. Neque convallis a cras semper auctor neque vitae tempus quam. Sed velit dignissim sodales ut. Diam phasellus vestibulum lorem sed risus ultricies tristique nulla. Scelerisque fermentum dui faucibus in ornare quam. Tortor consequat id porta nibh venenatis cras sed felis eget. Bibendum at varius vel pharetra vel turpis nunc eget. Libero volutpat sed cras ornare arcu dui. Aliquet porttitor lacus luctus accumsan tortor posuere. Ligula ullamcorper malesuada proin libero nunc. Neque vitae tempus quam pellentesque nec nam aliquam sem. Duis at tellus at urna condimentum. Lectus urna duis convallis convallis tellus id interdum. Vulputate enim nulla aliquet porttitor lacus luctus accumsan. Commodo nulla facilisi nullam vehicula ipsum a. Ut sem viverra aliquet eget sit amet tellus cras adipiscing.`;
const Title = styled("h2")(({ theme }) => ({
  fontFamily: theme.typography.fontFamily,
  color: theme.palette.background.default,
}));

const CardBackground = styled("div")(({ theme }) => ({
  "&:before": {
    backgroundColor: theme.palette.navbar.main,
  },
}));

const CardContent = styled("div")(({ theme, color }) => ({
  boxShadow: `
    -10px 10px 15px -5px ${Color(color).fade(0.5)}, 
      10px 10px 15px -5px ${Color(color).fade(0.5)}, 
      0 10px 15px -5px ${Color(color).fade(0.5)}
    `,
  "&:before": {
    background: `linear-gradient(to top, ${
      color || theme.palette.selection.main
    }, ${Color(color || theme.palette.selection.main)
      .rotate(24)
      .lighten(0.12)})`,
  },
}));

const Date = styled("div")(({ theme }) => ({
  fontFamily: theme.typography.fontFamily,
  backgroundColor: theme.palette.text.disabled,
}));

export const TSCCard = ({
  color,
  icon,
  background,
  title,
  date,
  onInfoClick,
  generateChart,
}: {
  color?: string;
  icon: string;
  background: string;
  title: React.ReactNode;
  date: string;
  onInfoClick?: () => void;
  generateChart?: () => void;
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  function handleFlip() {
    setIsFlipped(!isFlipped);
  }
  return (
    <ReactCardFlip isFlipped={isFlipped} flipDirection="horizontal">
      {/* This is the front card */}
      <CardBackground className="front-card">
        <CardMedia
          className="card-media-cover"
          image={background}
          onClick={handleFlip}
        />
        <CardContent className="card-content front-card-content" color={color}>
          <Box position="relative" zIndex={1}>
            <Grid
              container
              alignItems="center"
              spacing={2}
              onClick={onInfoClick}
            >
              <Grid item>
                <Avatar className="avatar-logo avatar-box-shadow" src={icon} />
              </Grid>
              <Grid item xs>
                <Title className="card-title">{title}</Title>
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
                <IconButton onClick={onInfoClick}>
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
              <Grid item xs onClick={onInfoClick}>
                <Box display="flex" justifyContent="flex-end">
                  <Date className="date">{date}</Date>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </CardContent>
      </CardBackground>
      {/* This is the back card */}
      <CardBackground className="back-card">
        <CardContent
          className="back-background card-content"
          color={color}
          onClick={handleFlip}
        >
          <Box className="info-container">
            <CardMedia
              className="info-media"
              image={background}
              onClick={handleFlip}
            />
            <Title className="info-title">{title}</Title>
            <Typography
              className="info-description"
              variant="body1"
              color="primary"
            >
              {text}
            </Typography>
            {/* <Grid
              className="info-grid"
              container
              spacing={2}
              justifyContent="center"
              alignItems="center"
            >
              <Grid item></Grid>
              <Grid item> */}
            {/* </Grid>
            </Grid> */}
          </Box>
        </CardContent>
      </CardBackground>
    </ReactCardFlip>
  );
};
