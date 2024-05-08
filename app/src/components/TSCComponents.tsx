import { Divider, IconButton, SvgIcon, Typography, styled } from "@mui/material";
import { SubMenu, MenuItem } from "@szhsin/react-menu";
import Color from "color";
import SimpleBar from "simplebar-react";
import "simplebar-react/dist/simplebar.min.css";

export const TypographyText = styled(Typography)(({ theme }) => ({
  color: theme.palette.primary.main
}));
export const ColoredIconButton = styled(IconButton)(({ theme }) => ({
  color: theme.palette.primary.main
}));

export const ColoredDiv = styled("div")(({ theme }) => ({
  backgroundColor: theme.palette.navbar.main
}));

export const CustomHeader = styled(Typography)(({ theme }) => ({
  "&::before": {
    backgroundColor: theme.palette.selection.main,
    content: '""',
    left: "0",
    width: "2px",
    position: "absolute",
    height: "20px",
    borderRadius: "2px"
  },
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "left",
  fontSize: "1.1rem",
  paddingLeft: "21px",
  paddingBottom: "30px"
}));

export const CustomDivider = styled(Divider)(() => ({
  height: "0.05px",
  width: "100%",
  backgroundColor: "rgba(197, 197, 197, 0.281)"
}));
export const TSCInputAdornment = styled("div")(
  ({ theme }) => `
  margin-left: auto;
  margin-right: 5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-family: inherit;
  font-weight: 400;
  line-height: 1.5;
  grid-row: 1/3;
  grid-column: 2;
  color: ${theme.palette.primary.main};
`
);
export const GradientDiv = styled("div")(({ theme }) => ({
  backgroundColor: theme.gradients.main
}));
export const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(0, 1),
  backgroundColor: theme.palette.navbar.main
}));
export const StyledScrollbar = styled(SimpleBar)(({ theme, color }) => {
  const backgroundColor = color || theme.palette.scrollbar.main;
  return {
    height: "100%",
    width: "100%",
    "& .simplebar-scrollbar:before": {
      backgroundColor: backgroundColor
    },
    "& .simplebar-scrollbar.simplebar-visible.simplebar-hover:before": {
      backgroundColor: `${Color(backgroundColor).lighten(0.15)}`
    },
    "& .simplebar-track": {
      backgroundColor: Color(backgroundColor).darken(0.8).alpha(0.1).string()
      // this is if we ever decide to make scrollbars "clickable"
      // cursor: "pointer",
    }
  };
});
export const BorderedIcon = ({
  component,
  className,
  strokeWidth
}: {
  component: React.ElementType<object>;
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
        strokeWidth: strokeWidth || "0.5"
      }}
    />
  );
};
export const TSCSubMenu = styled(SubMenu)(({ theme }) => ({
  "&.szh-menu__submenu > .szh-menu__item--hover": {
    backgroundColor: theme.palette.menuDropdown.light
  },
  "&.szh-menu__submenu > .szh-menu__item--checked": {
    color: theme.palette.primary.main
  }
}));
export const TSCMenuItem = styled(MenuItem)(({ theme }) => ({
  "&.szh-menu__item--hover": {
    backgroundColor: theme.palette.menuDropdown.light
  },
  "&.szh-menu__item--checked": {
    color: theme.palette.primary.main
  }
}));
