import { IconButton, Typography, styled } from "@mui/material";

export const TypographyText = styled(Typography)(({ theme }) => ({
  color: theme.palette.primary.main,
}));
export const ColoredIconButton = styled(IconButton)(({ theme }) => ({
  color: theme.palette.primary.main,
}));

export const ColoredDiv = styled("div")(({ theme }) => ({
  backgroundColor: theme.palette.navbar.dark,
}));
export const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(0, 1),
  backgroundColor: theme.palette.navbar.dark,
  ...theme.mixins.toolbar,
  justifyContent: "space-between",
}));