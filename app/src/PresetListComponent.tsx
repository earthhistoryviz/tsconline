import React from "react";
import cx from "clsx";
import Color from "color"; // v3.2.1
import { styled, useTheme } from "@mui/material/styles";
import { Grid, Box, Avatar, ButtonBase, CardMedia } from "@mui/material";
const defaultColor = "#747f84";

const StyledRoot = styled("div")(
  ({ theme, color }) => ({
    position: "relative",
    borderRadius: "1rem",
    minWidth: 320,
    paddingTop: 160,
    "&:before": {
      transition: "0.2s",
      position: "absolute",
      width: "100%",
      height: "100%",
      content: '""',
      display: "block",
      borderRadius: "1rem",
      zIndex: 0,
      bottom: 0,
      backgroundColor: Color(color || theme.palette.selection.main).darken(0.3).desaturate(0.2).string()
    },
    "&:hover": {
      "&:before": {
        bottom: -6,
      },
      "& .MuiAvatar-root": {
        transform: "scale(1.1)",
        boxShadow: "0 6px 20px 0 rgba(0,0,0,0.38)",
      },
    },
  })
);

const CardMediaCover = styled(CardMedia)(() => ({
  borderRadius: "1rem",
  position: "absolute",
  width: "100%",
  height: "100%",
  top: 0,
  left: 0,
  zIndex: 0,
  backgroundColor: "rgba(0, 0, 0, 0.08)",
  backgroundPosition: "center",
}));

const StyledH2 = styled("h2")(({ theme }) => ({
  fontFamily: theme.typography.fontFamily,
  fontWeight: 700,
  fontSize: "1.25rem",
  color: theme.palette.background.default,
  margin: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  maxWidth: "150px",
  // might need to uncomment this in the future
  // whiteSpace: "nowrap"
}));

const StyledContent = styled("div")(
  ({ theme, color }) => ({
    position: "relative",
    zIndex: 1,
    padding: "1rem",
    borderRadius: "1rem",
    boxShadow: `0 6px 16px 0 ${Color(color).fade(0.5)}`,
    "&:before": {
      content: '""',
      display: "block",
      position: "absolute",
      left: 0,
      top: 1,
      zIndex: 0,
      width: "100%",
      height: "100%",
      clipPath:
        "polygon(0% 100%, 0% 35%, 0.3% 33%, 1% 31%, 1.5% 30%, 2% 29%, 2.5% 28.4%, 3% 27.9%, 3.3% 27.6%, 5% 27%,95% 0%,100% 0%, 100% 100%)",
      borderRadius: "1rem",
      background: `linear-gradient(to top, ${color || theme.palette.selection.main}, ${Color(color || theme.palette.selection.main)
        .rotate(24)
        .lighten(0.12)})`,
    },
  })
);

const AvatarLogo = styled(Avatar)(() => ({
  transition: "0.3s",
  width: 100,
  height: 100,
  boxShadow: "0 4px 12px 0 rgba(0,0,0,0.24)",
  borderRadius: "1rem",
}));
const ClickableCard = styled(ButtonBase)(() => ({
  display: 'block',
  textAlign: 'inherit',
  width: '100%',
  // '&:hover': {
  // },
}));

const StyledDivTeam = styled("div")(({ theme }) => ({
  fontFamily: theme.typography.fontFamily,
  fontSize: "0.75rem",
  color: "rgba(255 255 255 / 80%)",
}));

const StyledDivDate = styled("div")(({ theme }) => ({
  fontFamily: theme.typography.fontFamily,
  color: "#fff",
  backgroundColor: theme.palette.text.disabled,
  opacity: 0.72,
  fontSize: "0.75rem",
  padding: "0 0.5rem",
  borderRadius: 12,
}));

export const CustomCard = ({
  color,
  img,
  logo,
  title,
  date,
  onClick,
}: {
  color?: string;
  img: string;
  logo: string;
  title: React.ReactNode;
  date: string;
  onClick?: () => void;
}) => {
  return (
    <ClickableCard onClick={onClick}>
    <StyledRoot color = {color}>
    <CardMediaCover image={img} />
    <StyledContent color={color}>
      <Box position="relative" zIndex={1}>
        <Grid container alignItems="center" spacing={2}>
          <Grid item>
            <AvatarLogo src={logo} />
          </Grid>
          <Grid item xs>
            <StyledH2>{title}</StyledH2>
          </Grid>
        </Grid>
        <Grid container mt={4} alignItems="center" spacing={2}>
          <Grid item>
            <StyledDivTeam>tsconline</StyledDivTeam>
          </Grid>
          <Grid item xs>
            <Box display="flex" justifyContent="flex-end">
              <StyledDivDate>{date}</StyledDivDate>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </StyledContent>
  </StyledRoot>
  </ClickableCard>
  );
};
