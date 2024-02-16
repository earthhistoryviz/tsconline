import { IconButton, SvgIcon, Typography, styled } from "@mui/material";

export const TypographyText = styled(Typography)(({ theme }) => ({
  color: theme.palette.primary.main,
}));
export const ColoredIconButton = styled(IconButton)(({ theme }) => ({
  color: theme.palette.primary.main,
}));

export const ColoredDiv = styled("div")(({ theme }) => ({
  backgroundColor: theme.palette.navbar.dark,
}));
export const GradientDiv = styled("div")(({ theme }) => ({
  backgroundColor: theme.palette.gradient.main,
}));
export const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(0, 1),
  backgroundColor: theme.palette.navbar.dark,
  ...theme.mixins.toolbar,
  justifyContent: "space-between",
}));
export const BorderedIcon = ({
  component,
  className,
  strokeWidth,
}: {
  component: React.ElementType<any>;
  className?: string;
  strokeWidth?: number;
}) => {
  return (
    <SvgIcon
      className={className}
      component={component}
      style={{
        fontSize: 40,
        fill: "currentColor",
        stroke: "black",
        strokeWidth: strokeWidth || "0.5",
      }}
    />
  );
};
